# Migration notes - 1.4.0

Version 1.3 er primært en UI/UX-milepæl. Backend og den eksisterende proxykontrakt er bevaret.

## Vigtigste ændringer

- `SettingsPanel` er blevet et modal-/drawer-panel fra tandhjulsikonet.
- Sprog og voksenflag er flyttet fra hovedsiden til indstillinger.
- Proxy er standard, når `VITE_TMDB_PROXY_URL` findes.
- Direkte TMDB-kald med egen nøgle er fortsat muligt.
- Automatisk scroll/fokus efter søgning og titelvalg er tilføjet.
- About-visning er bookmarkbar som `#about` uden ekstra routerafhængighed.
- Overlapkort har kompakt fold-ud-element ved antal TAXA-episoder. Selve episodeindekset er ikke implementeret endnu.
- Den eksisterende app-ikonfil genbruges foreløbigt.

## Cache og localStorage

Ny localStorage-nøgle:

```text
tmdb_include_adult_v1
```

Den gamle cache- og authstruktur er bevaret.

## Efter kopiering til eksisterende repository

Kør:

```bash
npm install --package-lock-only
npm test
npm run build
```

Det synkroniserer `package-lock.json` med `package.json`-versionen 1.4.0.

## TMDB-attribution

Version 1.3 har en dedikeret About-visning med TMDB-attribution og link til `themoviedb.org`. TMDB kræver godkendt logo og den angivne attributionstekst i en About/Credits-sektion.


### Smart søgning

1.3 kan nu foreslå kontrollerede udvidelser ved 0 resultater. Brugerens indstillinger ændres ikke; hver udvidelse er et engangsforsøg. Adult-filteret kan aldrig lempes automatisk.

## 1.3 statusbar

Tilføjet en kompakt statuslinje under søgningen, som viser den aktuelle søgeprofil (forbindelse, sprog, adult, dansk, originaltitel og automatisk skift mellem TV/film). Inaktive valg vises dæmpet.


## UI/UX-opdatering i 1.4.0

- Søgesprog er ikke længere en brugerindstilling; TMDB metadata hentes altid med `da-DK`.
- Sortering vælges med tre ikonknapper i stedet for en dropdown.
- Titelresultater skjules efter valg; **Skift titel** viser den eksisterende liste igen.
- **Vis flere** henter næste TMDB-sider uden at ændre søgekriterierne.
- Overlaplisten pagineres lokalt med 12 personer pr. side.
