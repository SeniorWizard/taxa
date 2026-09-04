# TAXA TMDB-proxy (PHP)

Proxyen er et lille read-only PHP-API uden Composer-afhængigheder. Den skjuler TMDB-tokenet, validerer alle parametre, begrænser trafik og gemmer TMDB-svar i SQLite.

## Krav

- PHP 8.1 eller nyere
- `json`
- `PDO` og `pdo_sqlite`
- enten `curl` eller `allow_url_fopen=On`
- HTTPS ved offentlig brug

## Endpoints

```http
GET /health
GET /search?media_type=tv&query=Taxa&language=da-DK&include_adult=false&page=1
GET /credits?media_type=tv&id=51261&language=da-DK
GET /reference/taxa?language=da-DK
```

Proxyen accepterer aldrig en vilkårlig TMDB-path eller URL.

## Konfiguration

Kopiér eksempelkonfigurationen:

```bash
cp config/local.example.php config/local.php
```

Indsæt dit TMDB API Read Access Token i `config/local.php`:

```php
return [
    'tmdb' => [
        'bearer_token' => 'DIT_TOKEN_UDEN_ORDET_BEARER',
        'api_key' => '',
    ],
    'cors' => [
        'allowed_origins' => [
            'https://git.foo.dk',
            'http://localhost:5173',
        ],
    ],
    'storage' => [
        'database_path' => dirname(__DIR__) . '/var/taxa-proxy.sqlite',
    ],
];
```

`config/local.php` er ignoreret af Git og skal ligge uden for webroot. Bearer-token anbefales; v3 API key understøttes også.

De vigtigste værdier kan alternativt sættes som miljøvariabler:

```text
TMDB_BEARER_TOKEN
TMDB_API_KEY
TAXA_PROXY_ALLOWED_ORIGINS
TAXA_PROXY_DATABASE
TAXA_PROXY_TRUST_PROXY_HEADERS
TAXA_PROXY_TRUSTED_PROXY_IPS
```

Lister i miljøvariabler separeres med komma.

## Synology Web Station

Den anbefalede opsætning er:

```text
/volume1/web/taxa-proxy/
  config/
  public/       <- Web Station document root
  src/
  var/          <- skal være skrivbar for http-gruppen
```

1. Opret et PHP-profil i Web Station med PHP 8.1+.
2. Aktivér `pdo_sqlite`/SQLite og gerne `curl` i PHP-profilen.
3. Opret et webportal/virtual host, hvis document root er `backend/public`.
4. Giv Synologys `http`-gruppe læseadgang til proxyfilerne og skriveadgang til `backend/var`.
5. Kopiér `local.example.php` til `local.php` og indsæt token og tilladte origins.
6. Brug HTTPS på det offentlige hostnavn.

### Uden rewrite-regler — anbefalet første test

Test direkte:

```text
https://api.foo.dk/tmdb/index.php?route=health
https://api.foo.dk/tmdb/index.php?route=reference/taxa&language=da-DK
```

Frontendvariablen sættes til:

```text
VITE_TMDB_PROXY_URL=https://api.foo.dk/tmdb/index.php
```

Frontendklienten omsætter derefter automatisk endpointet til `?route=...`.

### Med clean paths

`public/.htaccess` indeholder en Apache rewrite-regel. Hvis Web Station-profilen respekterer den, kan proxyen kaldes som:

```text
https://api.foo.dk/tmdb/health
https://api.foo.dk/tmdb/reference/taxa?language=da-DK
```

Frontendvariablen er i så fald:

```text
VITE_TMDB_PROXY_URL=https://api.foo.dk/tmdb
```

Hvis clean paths giver 404, brug `index.php`-formen. Den kræver ingen rewrite.

## Kontrol

Fra SSH eller en lokal PHP-installation:

```bash
php backend/bin/check.php
php backend/tests/run.php
```

Syntakskontrol:

```bash
find backend -name '*.php' -print0 | xargs -0 -n1 php -l
```

Cacheoprydning kan køres manuelt eller fra en planlagt opgave:

```bash
php backend/bin/prune-cache.php
```

Proxyen laver også lejlighedsvis automatisk oprydning.

## Cache

Standardværdier:

| Data | Frisk cache | Kan bruges stale indtil |
|---|---:|---:|
| Søgning | 30 minutter | 24 timer |
| Credits | 24 timer | 7 dage |
| TAXA-reference | 7 dage | 90 dage |

Ved TMDB 429, 5xx eller netværksfejl returneres en stale cachepost, hvis den findes. Headeren `X-Taxa-Cache` viser blandt andet `HIT`, `MISS`, `REFRESH` eller `STALE-*`.

## Rate limiting

Der bruges SQLite-baserede token buckets:

- alle requests begrænses pr. anonym klient
- cache misses begrænses både globalt og pr. klient
- cache hits bruger ikke TMDB-budget
- 429 returneres med `Retry-After`

Frontend sender et tilfældigt klient-id fra `localStorage`. Proxyen kombinerer det med klient-IP og gemmer kun en SHA-256-hash i rate-limit-tabellen.

## CORS og sikkerhed

- Origins matches eksakt; `/taxa/` skal ikke med i origin.
- Standardmetoder er kun `GET` og `OPTIONS`.
- TMDB-tokenet sendes aldrig til browseren.
- `public/` skal være document root, så `config/local.php` og SQLite-filen ikke er webtilgængelige.
- Slå ikke `display_errors` til på den offentlige produktionsprofil.
