# PHP-proxykontrakt

Proxyen findes i `backend/` og returnerer TMDB-kompatibel JSON. Frontend kan bruge enten clean paths eller en direkte `index.php`-URL.

## Frontendkonfiguration

Clean paths:

```env
VITE_TMDB_PROXY_URL=https://api.foo.dk/tmdb
```

Uden rewrite:

```env
VITE_TMDB_PROXY_URL=https://api.foo.dk/tmdb/index.php
```

## Søgning

```http
GET /search?media_type=tv&query=Taxa&language=da-DK&include_adult=false&page=1
```

Tilladte værdier:

- `media_type`: `tv` eller `movie`
- `query`: 1–120 tegn
- `language`: eksempelvis `da-DK`
- `include_adult`: `true` eller `false`
- `page`: 1–500

## Credits

```http
GET /credits?media_type=tv&id=51261&language=da-DK
```

TV bruger TMDB `/aggregate_credits`. Film bruger `/credits`.

## TAXA-reference

```http
GET /reference/taxa?language=da-DK
```

Referenceendpointet har lang servercache.

## Health

```http
GET /health
```

Returnerer proxyversion, cachetype og auth-type, men aldrig tokenet.

## Frontendfallback

I tilstanden `auto` prøver frontend proxyen først. Ved netværksfejl, 401, 404, 429 eller 5xx bruges brugerens lokalt gemte TMDB-nøgle, hvis en sådan findes. Aborterede requests og almindelige 400-valideringsfejl falder ikke tilbage.

## Headers

Frontend sender:

```http
X-Taxa-Client-ID: <tilfældigt lokalt id>
```

Proxyen kan returnere:

```http
X-Taxa-Cache: HIT|MISS|REFRESH|STALE-...
Age: <sekunder>
Retry-After: <sekunder>
X-Request-ID: <id>
```
