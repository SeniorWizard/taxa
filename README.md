# TAXA-overlap 1.3.0

React/Vite-PWA som finder skuespillere i en valgt film eller serie, der også medvirker i TAXA. Version 1.3 fokuserer på en renere brugerflade og samler tekniske indstillinger i et tandhjulspanel.

## Frontend

Krav: Node.js 22.12 eller nyere.

```bash
nvm use
npm install
npm test
npm run dev
```

Lokal adresse er normalt:

```text
http://localhost:5173/taxa/
```

Production build:

```bash
npm run build
npm run preview
```

Filerne oprettes i `dist/`.

## Version 1.3 ændringer

- Hovedskærmen er reduceret til søgning og resultater.
- API-/proxy-konfiguration er flyttet til et tandhjulspanel.
- TAXA-proxy er standard, når den er konfigureret.
- Direkte TMDB-forbindelse med egen nøgle er bevaret som et tydeligt privat alternativ.
- Egen nøgle bruges automatisk som fallback i standard proxy-tilstand.
- Sprog og `include_adult` er flyttet til indstillinger.
- Voksenindhold gemmes lokalt og er slået fra som standard.
- Automatisk søgning i den anden medietype ved 0 filtrerede resultater.
- Valgfrit filter for kun dansksprogede titler og søgning kun på originaltitel.
- Automatisk scroll/fokus til søgeresultater og overlap.
- TAXA-inspireret CSS-loader.
- Kompakte overlapkort med fold-ud-element ved antal TAXA-episoder.
- Ny statisk About-visning via `#about` med TMDB-attribution.
- Den eksisterende app-ikonfil genbruges som midlertidigt logo; et mere præcist TAXA-neonsymbol kan udskiftes senere.

## Forbindelsestyper

Når proxyen er konfigureret:

- **TAXA-proxy:** standard. Proxy først, egen nøgle som automatisk fallback.
- **Direkte til TMDB:** egen v3 API key eller v4 Bearer-token bruges direkte fra browseren.
- **Kun proxy:** findes som en lille fejlsøgningsindstilling.

Uden proxyvariabel fungerer appen fortsat med direkte nøgle.

## Adult

Indstillingen `Medtag voksenindhold` styrer TMDB's `include_adult`-parameter for søgning. Den er slået fra som standard og gemmes lokalt. TMDBs søgeendpoints understøtter `include_adult` som parameter.

## PHP-proxy

Proxyen findes i `backend/` og indeholder:

- fast allowlist af endpoints
- server-side TMDB-token
- SQLite-cache
- global og klientbaseret token-bucket-rate limiting
- stale cache ved 429, 5xx og netværksfejl
- eksakt CORS-allowlist
- anonymt klient-id til rate limiting
- ingen Composer-afhængigheder

Se:

- `backend/README.md`
- `docs/SYNOLOGY_DEPLOYMENT.md`
- `docs/PROXY_CONTRACT.md`

PHP-tests:

```bash
php backend/tests/run.php
```

Alle kontroller, når PHP er installeret lokalt:

```bash
npm run check:all
```

## Frontendkonfiguration

Lokal udvikling kan bruge `.env.local`:

```env
VITE_BASE_PATH=/taxa/
VITE_TMDB_PROXY_URL=https://api.foo.dk/tmdb/index.php
```

Produktionskonfigurationen bruger `.env.production` med samme offentlige proxy-URL.

Proxy-URL'en er offentlig. Læg aldrig TMDB-tokenet i en `VITE_*`-variabel, da Vite indbygger den i browserens JavaScript.

## GitHub Pages

Workflowet `.github/workflows/deploy-pages.yml` publicerer `dist/` fra `main`.

Repositoryets Pages-kilde skal være:

```text
Settings → Pages → Source: GitHub Actions
```

## Tests

```bash
npm test
```

Frontendtestene dækker blandt andet:

- sorteringsregler
- overlap på TMDB person-id
- direkte v3/v4-auth
- proxy-URL med og uden rewrite
- proxy til direkte fallback
- at 400-fejl ikke skjules af fallback
- sprogafhængig TAXA-cache
- anonymt proxy-klient-id
- lokal persistence af voksenindhold

## PWA

Manifest og service worker ligger i `public/`.

Service workeren:

- cacher appens statiske filer
- bruger network-first ved navigation
- cacher TMDB-billeder med stale-while-revalidate
- cacher ikke TMDB API- eller proxy-svar
