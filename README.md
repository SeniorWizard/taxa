# TAXA

## Formål 
Jeg har en løbende diskussion med min kone om hvorvidt Danmark er tilpas lille land til at talentmassen indenfor skuespillere er tilsvarende lille og det derfor ender med at der højst er et par håndfulde dygtige i hver generation. Dette medfører naturligvis at disse medvirker i snart sagt alle større produktioner.

Som reference benyttes tv-serien TAXA fra 1997 - 56 afsnit fordelt over 5 sæsoner, og hver eneste gang vi sidder og ser en dansk film eller tv-serie spøger jeg ofte
> Er det ikke ham/hende der er med i TAXA?

Det giver altid en afbrydelse og diverse opslag og internetsøgninger, og som oftes er det tilfældet. 

Denne lille app er født med data fra TAXA, det er så muligt at søge på [TMDB](https://www.themoviedb.org/) efter film og serier og derefter få en nøjagtig liste over hvilke skuespillere der **også** spiller med i TAXA, herunder hvilke roller, antallet af afsnit mv.

## Demo

Der er ren javascript og den er deployet på [git.foo.dk/taxa/](https://git.foo.dk/taxa/)  så bare klik og prøv

## Konfiguration

### API nøgle 

Det er nødvendigt med en API-key til [TMDB](https://www.themoviedb.org/) for at kunne foretage søgninger igennem deres API, hvis ikke du har en allerede er det forholdsvis enkelt:

**1. Opret konto**
**2. Log ind og gå til settings**
**3. Find API sektionen og klik request API key**

Når den er godkendt kan du og paste nøglen ind i applikationen hvor den gennems i lokal storage, så det skulle meget vel være en engangsforteelse (pr device/browser dog).

### App-like funktionalitet 

I de fleste browsere kan man under **Del/Share** vælge tilføj til skrivebord/hjemmeskærm - jeg har forsøgt at lave det sådan at det ligner en applikation.

## Andre versioner, features, fejl mv

Jeg tror ikke jeg kommer til at lave mere ved den, det var et sjovt projekt der tog 3 timer en fredag eftermiddag. Jeg er godt klar over den er grim, og at alt det med API-nøgler er lidt noget bøvl, og UX også er lidt underlig hvor man selv skal scrolle. Men den virker fint for mig, og jeg er bange for at ryge ned i kaninhullet hvis den skal være meget bedre - du er velkommen til bare at forke den og pille videre.
