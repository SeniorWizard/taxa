# TAXA-overlap 1.2.0

React/Vite-PWA som finder skuespillere i en valgt film eller serie, der også medvirker i TAXA. Version 1.2 tilføjer en valgfri PHP-proxy, men bevarer direkte TMDB-adgang med brugerens egen nøgle.

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

## Forbindelsestyper

Appen understøtter tre tilstande, når proxyen er konfigureret:

- **Automatisk:** PHP-proxy først, egen nøgle som fallback.
- **Kun proxy:** ingen direkte browserkald til TMDB.
- **Direkte:** brugerens egen v3 API key eller v4 Bearer-token.

Uden proxyvariabel fungerer appen fortsat som version 1.1 med direkte nøgle.

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

Kopiér ved lokal udvikling:

```bash
cp .env.example .env.local
```

Clean-path proxy:

```env
VITE_BASE_PATH=/taxa/
VITE_TMDB_PROXY_URL=https://api.foo.dk/tmdb
```

Synology uden rewrite:

```env
VITE_BASE_PATH=/taxa/
VITE_TMDB_PROXY_URL=https://api.foo.dk/tmdb/index.php
```

Proxy-URL'en er offentlig. Læg aldrig TMDB-tokenet i en `VITE_*`-variabel, da Vite indbygger den i browserens JavaScript.

## GitHub Pages

Workflowet `.github/workflows/deploy-pages.yml` publicerer `dist/` fra `main`.

I repository-indstillingerne:

```text
Settings → Pages → Source: GitHub Actions
```

Når proxyen er klar, opret denne repositoryvariabel:

```text
Settings → Secrets and variables → Actions → Variables
VITE_TMDB_PROXY_URL=https://api.foo.dk/tmdb/index.php
```

Workflowet bruger variablen ved build.

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

## PWA

Manifest og service worker ligger i `public/`.

Service workeren:

- cacher appens statiske filer
- bruger network-first ved navigation
- cacher TMDB-billeder med stale-while-revalidate
- cacher ikke TMDB API- eller proxy-svar
