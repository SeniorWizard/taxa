# Migrering fra 1.0.0

## Bevaret

- TMDB v3 API key og v4 Bearer-token.
- Eksisterende localStorage-nøgler, så gemt auth og TAXA-cache kan genbruges.
- Film/TV-søgning.
- Match på TMDB-person-id.
- Sortering efter TAXA-episoder, valgt titel og navn.
- GitHub Pages under `/taxa/`.

## Ændret

- React, Tailwind og JSX kompileres nu af Vite.
- Manifest og service worker er rigtige statiske filer.
- TMDB API-svar caches ikke længere ukritisk af service workeren.
- Koden er opdelt i API, domænelogik, storage og UI-komponenter.
- Direkte TMDB og kommende PHP-proxy er adskilt bag samme klientinterface.
- Fejltilstand er adskilt fra et gyldigt resultat uden overlap.

## Rettede fejl

- Hvis TAXA-cachen var tom ved første titelvalg, kunne version 1.0 sammenligne mod en gammel, tom `Map` efter hentningen. Den nye kode bygger mappet direkte fra de netop hentede data.
- Billing order `0` blev behandlet som manglende, fordi `||` blev brugt. Der bruges nu nullish fallback.
- En API-fejl kan ikke længere udløse den grønne TAXA-fri-besked.
- TAXA-cache fra et andet valgt sprog genbruges ikke som frisk cache.
- Tidligere søgninger annulleres ved en ny søgning eller et nyt titelvalg.
