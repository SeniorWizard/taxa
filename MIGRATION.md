# Ændringer i 1.2.0

## PHP-proxy

Tilføjet i `backend/`:

- read-only endpoints for søgning, credits og TAXA-reference
- server-side TMDB Bearer-token eller API key
- SQLite-cache med forskellige TTL'er
- stale fallback ved TMDB 429, 5xx og netværksfejl
- token-bucket-rate limiting globalt og pr. anonym klient
- CORS-allowlist og fast inputvalidering
- health endpoint, installationskontrol og cacheoprydning
- Synology-installationsvejledning

## Frontend

- Bevarer direkte TMDB-adgang med brugerens egen nøgle.
- `auto` bruger proxy først og direkte adgang ved reel proxyfejl.
- Almindelige 400-valideringsfejl falder ikke tilbage og skjules derfor ikke.
- Proxybasen kan være enten en clean URL eller `index.php` uden rewrite.
- Frontend sender et tilfældigt lokalt klient-id; backend gemmer kun en hash.
- GitHub Actions læser den offentlige proxy-URL fra repositoryvariablen `VITE_TMDB_PROXY_URL`.

## Uændret

- TAXA-reference-id 51261
- film- og TV-søgning
- eksisterende sortering
- lokal TAXA-cache
- mulighed for v3 API key og v4 Bearer-token
- GitHub Pages under `/taxa/`
