# TAXA-overlap 1.5.0 - episode count + final-card width fix

Denne lille patch retter to ting:

1. Det viste episodeantal bruger episodeindekset, når det findes. Specials (season 0) tælles derfor med. Peter Gantzler vises fx som 57 episoder, mens aggregate-count stadig bruges som fallback hvis snapshot ikke er tilgængeligt.
2. Episode-grid'et beholder samme antal kolonner på sidste side som på de øvrige sider. En sidste side med kun S00E01 får derfor samme kortbredde som de andre kort i stedet for fuld bredde.

Service-worker-cache er bumpet til `taxa-overlap-v1.5.0-episode5`.

Efter udpakning:

    npm test
    npm run build
    npm run preview

Teststatus i patch-miljøet: 37/37.
