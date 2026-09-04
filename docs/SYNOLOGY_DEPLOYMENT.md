# Installation af PHP-proxy på Synology

## 1. Kopiér backend

Kopiér mappen `backend` til NAS'en, eksempelvis:

```text
/volume1/web/taxa-proxy
```

Konfigurér Web Station, så webportalens document root er:

```text
/volume1/web/taxa-proxy/public
```

Det er vigtigt, at hele `backend` ikke er document root.

## 2. PHP-profil

Brug PHP 8.1 eller nyere. Aktivér mindst:

- PDO
- PDO SQLite / SQLite
- JSON
- cURL, eller alternativt URL-fopen

Lad `display_errors` være slået fra i produktion. Fejl skrives til PHP/webserverens log med et request-id.

## 3. Hemmelig konfiguration

På NAS'en:

```bash
cd /volume1/web/taxa-proxy
cp config/local.example.php config/local.php
```

Redigér `config/local.php` og indsæt:

- TMDB Bearer-token eller API key
- `https://git.foo.dk` som tilladt origin
- eventuelt `http://localhost:5173` under udvikling

Commit aldrig `local.php`.

## 4. Rettigheder

Web Station skal kunne:

- læse `public`, `src` og `config/local.php`
- skrive i `var`

Tildel Synologys `http`-gruppe de nødvendige rettigheder via File Station eller Control Panel. SQLite opretter også `-wal` og `-shm` filer i `var`, så mappen — ikke kun databasefilen — skal være skrivbar.

## 5. Test proxyen

Start uden rewrite:

```text
https://api.foo.dk/tmdb/index.php?route=health
```

Forventet svar:

```json
{
  "ok": true,
  "service": "taxa-tmdb-proxy",
  "version": "1.0.0",
  "tmdb_auth": "bearer",
  "cache": "sqlite"
}
```

Test derefter TAXA-data:

```text
https://api.foo.dk/tmdb/index.php?route=reference/taxa&language=da-DK
```

Hvis browseren viser 500, kontrollér PHP-loggen og kør `backend/bin/check.php` via SSH med den PHP-version, som Web Station bruger.

## 6. Tilslut GitHub Pages

På GitHub:

```text
Repository → Settings → Secrets and variables → Actions → Variables
```

Opret repositoryvariablen:

```text
VITE_TMDB_PROXY_URL=https://api.foo.dk/tmdb/index.php
```

Workflowet indlæser denne offentlige URL ved build. Den indeholder ingen hemmeligheder.

Kør derefter Pages-workflowet eller push en commit til `main`.

## 7. Test fallback

I appens forbindelsesindstillinger:

1. vælg `Kun proxy` og kontrollér en søgning
2. gem din egen TMDB-nøgle
3. vælg `Automatisk`
4. stop midlertidigt proxyens webportal
5. kontrollér, at appen viser `Direkte fallback`

## 8. Reverse proxy

Hvis Web Station kører bag Synologys reverse proxy, behold som udgangspunkt:

```php
'trust_proxy_headers' => false
```

Rate limiting vil da muligvis se reverse proxyens IP. Aktivér kun forwarded-IP-understøttelse, når du kender proxyens interne IP og tilføjer den til `trusted_proxy_ips`; ellers kan klienter forfalske `X-Forwarded-For`.
