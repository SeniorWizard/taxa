# TAXA-overlap 1.4.0

React/Vite-PWA som finder skuespillere i en valgt film eller serie, der også medvirker i TAXA. Version 1.4 fokuserer på et kortere mobilflow, visuel TAXA-identitet og mere kompakte kontroller.

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

## Version 1.4.1 ændringer

- tilføjet paginering med aktive filtre
- søgeresultater kollapser efter titelvalg
- ikonbaseret skift titel / ryd søgning
- ikonbaseret sortering
- lokal paginering af skuespillere
- swipe-navigation på mobil
- fast dansk metadata-sprog
- diverse flow- og mobilforbedringer

## Version 1.4 ændringer

- TAXA-inspireret neonbranding, appikon, favicon og grafiske kontrolikoner.
- Hovedskærmen er reduceret til søgning og resultater; tekniske valg ligger bag tandhjulet.
- **Via TAXA** er standard, mens direkte TMDB med egen nøgle er et valgfrit alternativ.
- Statusikoner viser de aktive søgekriterier uden at fylde hovedskærmen med tekst.
- Voksenindhold, automatisk TV/film-skift, kun dansk og originaltitel kan styres i indstillinger.
- Smart Search kan ved 0 hits foreslå en kontrolleret lempelse af bløde kriterier; adult-filteret lempes aldrig automatisk.
- TMDB-metadata hentes fast på dansk (`da-DK`); sprogvælgeren er fjernet fra UI'et.
- Ved lokale filterhits undersøges op til tre TMDB-sider før søgningen erklæres tom.
- **Vis flere** henter yderligere TMDB-sider uden at ændre søgekriterierne.
- Søgeresultater kollapser efter titelvalg; **Skift titel** viser den eksisterende liste igen.
- Valgt titel vises sammen med overlap-resultatet og har genvej til **Ny søgning**.
- Sortering vælges med tre ikonknapper: TAXA, valgt titel og A–Z.
- Overlap pagineres lokalt 12 ad gangen med synlige knapper og swipe som ekstra touch-genvej.
- About-visningen via `#about` indeholder TMDB-attribution.

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

