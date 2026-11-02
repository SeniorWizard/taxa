# Referenceindeks proof of concept

Dette er første backend-trin mod episodeindeks og flere referenceserier. Den eksisterende app bruger fortsat det gamle `reference/taxa` endpoint; proof-of-conceptet ændrer derfor ikke 1.4.x-klientens adfærd.

## Model

TMDB-data cachelagres først i den eksisterende SQLite-cache. Et refresh bygger derefter et normaliseret JSON-snapshot i `var/reference/<slug>.json`.

```text
TMDB -> SQLite cache -> ReferenceSnapshotBuilder -> taxa.json -> klienter
```

Episoder findes kun én gang:

```json
{
  "episodes": {
    "S01E12": {
      "tmdb_id": 123456,
      "season": 1,
      "episode": 12,
      "name": "...",
      "air_date": "...",
      "runtime": 45,
      "still_path": "/...jpg"
    }
  },
  "people": {
    "123": {
      "aggregate_episode_count": 4,
      "indexed_episode_count": 4,
      "episodes": ["S01E02", "S01E05", "S01E07", "S01E12"]
    }
  }
}
```

Personer bærer desuden TMDB-id, navn, profilbillede, aggregate roller og episode-count. Episodeobjekter gemmer de metadata, der kan være nyttige senere: TMDB-id, titel, dato, runtime, episode type, production code, still path, overview og ratingfelter.

## Datakilder

For hver reference bruges:

- `/tv/{id}` til serie- og sæsonoversigt.
- `/tv/{id}/aggregate_credits` som den eksisterende reference for cast og samlet episode-count.
- `/tv/{id}/season/{season}` til episode-metadata.
- `/tv/{id}/season/{season}/episode/{episode}/credits` til konkret person -> episode mapping.

Alle TMDB-svar går gennem `CachedTmdbReader` og den eksisterende SQLite-cache. Et normalt refresh bruger derfor cached source-data indtil TTL udløber. `--force` tvinger nye TMDB-kald.

## Første TAXA-test

Fra backend-mappen:

```bash
php bin/refresh-reference.php taxa --force
```

Efter første fulde scan kan samme kommando uden `--force` genbygge snapshot fra cache:

```bash
php bin/refresh-reference.php taxa
```

CLI'en skriver en kvalitetsrapport med bl.a.:

- antal personer i aggregate credits
- eksakt match mellem aggregate episode-count og det konkrete episodeindeks
- personer med afvigende counts
- personer uden episodeindeks
- personer som kun findes i episode credits
- de største count-afvigelser

Snapshot skrives atomisk, så klienter aldrig kan læse en halv fil.

## HTTP endpoint

Når `taxa.json` findes:

```text
GET /index.php?route=reference-data/taxa
```

eller med rewrite:

```text
GET /reference-data/taxa
```

Endpointet leverer `ETag`, `Last-Modified` og understøtter `If-None-Match`/`304 Not Modified`.

Det gamle endpoint:

```text
GET /reference/taxa
```

forbliver uændret under proof-of-conceptet.

## Flere referenceserier

Referenceserier er konfiguration, ikke kode. Defaults indeholder TAXA. En ekstra serie kan tilføjes i `config/local.php`:

```php
'references' => [
    'matador' => [
        'tmdb_id' => 12345,
        'name' => 'Matador',
        'language' => 'da-DK',
        'include_specials' => true,
    ],
],
```

Derefter:

```bash
php bin/refresh-reference.php matador --force
```

## Beslutningspunkt

Frontend bør først kobles på episodeindekset, når TAXA-rapporten viser en acceptabel datakvalitet. Hvis aggregate counts og episode credits afviger meget, kan UI stadig vise aggregate count og kun kalde fold-ud-listen "registrerede episoder".

## Refresh-diagnostik

`bin/refresh-reference.php` viser fra denne version også:

- datakvalitet både med og uden season 0/specials
- hvilke specials der forekommer blandt mismatch-personerne
- samlet køretid og tid pr. hovedfase
- cache hits, netværksrequests og stale fallback
- observerede TMDB HTTP 429-responses
- retries/sleep (aktuelt 0, da refresh ikke automatisk retry'er)
- TMDB svartid min/avg/max

Diagnostikken ændrer ikke refresh-adfærden. Den observerer kun de eksisterende kald.
