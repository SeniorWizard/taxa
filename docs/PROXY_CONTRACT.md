# Forventet proxy-kontrakt

Frontendens proxyunderstøttelse er forberedt, men PHP-backenden er ikke en del af denne migrering.

Sæt senere:

```env
VITE_TMDB_PROXY_URL=https://api.foo.dk/tmdb
```

Proxyen skal returnere TMDB-kompatibel JSON og tilbyde disse read-only endpoints:

## Søgning

```http
GET /tmdb/search?media_type=tv&query=Taxa&language=da-DK&include_adult=false&page=1
```

`media_type` må kun være `tv` eller `movie`.

## Credits

```http
GET /tmdb/credits?media_type=tv&id=51261&language=da-DK
```

For TV forventes aggregate credits. For film forventes almindelige credits.

## TAXA-reference

```http
GET /tmdb/reference/taxa?language=da-DK
```

Dette endpoint er oplagt til lang servercache.

## Fallback

I tilstanden `auto` prøver frontend proxyen først. Ved enhver proxy- eller netværksfejl bruges den lokalt gemte TMDB-nøgle, hvis en sådan findes. Aborterede requests falder ikke tilbage.

Proxyen skal implementere en fast allowlist og må ikke acceptere en vilkårlig TMDB-path eller URL fra klienten.
