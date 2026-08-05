# TAXA-overlap 1.1.0 – Vite-migrering

Denne branch migrerer version 1.0.0 til Vite uden at fjerne muligheden for at bruge brugerens egen TMDB-nøgle.

## 1. Krav på Mac

Projektet bruger Node.js 22 eller nyere.

Med `nvm`:

```bash
nvm install 22
nvm use
```

Kontrollér:

```bash
node --version
npm --version
```

Intel-Mac, VS Code og Vim kræver ingen særlige tilpasninger.

## 2. Første installation

Fra projektmappen:

```bash
npm install
npm test
npm run dev
```

Vite viser den lokale adresse i terminalen. Med standard-base åbnes appen normalt på:

```text
http://localhost:5173/taxa/
```

`npm install` opretter `package-lock.json`. Commit den fil, før GitHub Pages-workflowet køres, fordi workflowet bruger `npm ci`.

## 3. Production build

```bash
npm run build
npm run preview
```

De statiske deploymentfiler oprettes i `dist/`.

## 4. GitHub Pages

`vite.config.js` har som standard:

```text
/taxa/
```

Det passer til den nuværende placering `https://git.foo.dk/taxa/`.

Workflowet `.github/workflows/deploy-pages.yml` bygger og publicerer `dist/`. Hvis branch-navnet, som skal udgives, ikke er `main`, ændres dette i workflowets `branches`-felt, eller migreringsbranchen merges først til `main`.

I repository-indstillingerne skal Pages-kilden være **GitHub Actions**.

## 5. Direkte TMDB-nøgle og fremtidig proxy

Uden yderligere konfiguration virker appen som version 1.0: brugeren indtaster selv en v3 API key eller et v4 Bearer-token.

Når PHP-proxyen senere findes, kopieres `.env.example` til `.env.production` og proxyadressen udfyldes:

```env
VITE_BASE_PATH=/taxa/
VITE_TMDB_PROXY_URL=https://api.foo.dk/tmdb
```

Derefter tilbyder appen tre forbindelsestyper:

- Automatisk: proxy først, egen nøgle som fallback.
- Kun proxy.
- Direkte med egen nøgle.

Proxykontrakten er dokumenteret i `docs/PROXY_CONTRACT.md`.

Vigtigt: Læg aldrig TMDB-tokenet i en variabel med navnet `VITE_*`. Vite indbygger disse værdier i browserens JavaScript, så de er offentlige.

## 6. Test

```bash
npm test
```

Testene dækker blandt andet:

- sorteringsreglerne fra version 1.0
- billing order `0`
- match på person-id
- API-key/Bearer-detektion
- proxy til direkte fallback
- sprogafhængig TAXA-cache
- ødelagt JSON i localStorage

## 7. PWA

Manifest og service worker ligger i `public/`.

Service workeren:

- cacher appens egne statiske filer
- bruger network-first ved navigation
- cacher TMDB-billeder med stale-while-revalidate
- cacher ikke TMDB API-svar

Efter en deployment kan en gammel service worker om nødvendigt fjernes i browserens udviklerværktøjer under **Application → Service Workers**.

## 8. Midlertidigt ikon

`public/icons/` indeholder et enkelt midlertidigt TAXA/krone-ikon, så PWA-installation kan testes. Det kan senere erstattes af det endelige logo uden kodeændringer, hvis filnavne og størrelser bevares.
