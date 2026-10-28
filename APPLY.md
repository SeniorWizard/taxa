# TAXA-overlap 1.4 – filtreret pagination og kompakte titelkontroller

Patchen lægges oven på den seneste 1.4 flow-polish-version.

## Ændringer

- Filtrerede TMDB-søgninger henter videre, indtil der er mindst 20 filtrerede resultater eller TMDB ikke har flere sider.
- "Hent flere" henter tilsvarende op til 20 nye filtrerede resultater og forsvinder, når alle TMDB-sider er gennemgået.
- Ved helt nul filtrerede hits beholdes en sikkerhedsgrænse på 3 TMDB-sider før Smart Search foreslås, så meget snævre søgninger ikke kan udløse hundredvis af API-kald.
- "Vis flere" er omdøbt til "Hent flere".
- "Skift titel" er erstattet af en fold-ud-pil, som genåbner de allerede hentede titler uden nyt API-kald.
- "Ny søgning" er erstattet af en skraldespand, som rydder søgningen og fokuserer søgefeltet.
- Service-worker-cache er bumpet til ux6.
- To regressionstests dækker den nye filtrerede pagineringslogik.

## Efter udpakning

```bash
npm test
npm run build
npm run preview
```
