<?php

declare(strict_types=1);

namespace TaxaProxy;

final class ReferenceSnapshotBuilder
{
    public function __construct(
        private readonly ReferenceDataSource $tmdb,
        private readonly ?RefreshMetrics $metrics = null,
    ) {
    }

    /** @return array<string, mixed> */
    public function build(ReferenceDefinition $reference, bool $force = false): array
    {
        $language = ['language' => $reference->language];

        $startedAt = microtime(true);
        $series = $this->tmdb->get(sprintf('/tv/%d', $reference->tmdbId), $language, $force);
        $this->metrics?->addPhase('reference_metadata', microtime(true) - $startedAt);

        $startedAt = microtime(true);
        $aggregate = $this->tmdb->get(sprintf('/tv/%d/aggregate_credits', $reference->tmdbId), $language, $force);
        $this->metrics?->addPhase('aggregate_credits', microtime(true) - $startedAt);

        $people = $this->aggregatePeople($aggregate);
        $episodes = [];
        $apiCalls = 2;

        foreach (($series['seasons'] ?? []) as $seasonSummary) {
            if (!is_array($seasonSummary)) {
                continue;
            }
            $seasonNumber = (int) ($seasonSummary['season_number'] ?? -1);
            if ($seasonNumber < 0 || (!$reference->includeSpecials && $seasonNumber === 0)) {
                continue;
            }

            $startedAt = microtime(true);
            $season = $this->tmdb->get(
                sprintf('/tv/%d/season/%d', $reference->tmdbId, $seasonNumber),
                $language,
                $force,
            );
            $this->metrics?->addPhase('season_metadata', microtime(true) - $startedAt);
            $apiCalls++;

            foreach (($season['episodes'] ?? []) as $episode) {
                if (!is_array($episode)) {
                    continue;
                }
                $episodeNumber = (int) ($episode['episode_number'] ?? 0);
                if ($episodeNumber < 1) {
                    continue;
                }

                $key = self::episodeKey($seasonNumber, $episodeNumber);
                $episodes[$key] = $this->episodeMetadata($episode);

                $startedAt = microtime(true);
                $credits = $this->tmdb->get(
                    sprintf(
                        '/tv/%d/season/%d/episode/%d/credits',
                        $reference->tmdbId,
                        $seasonNumber,
                        $episodeNumber,
                    ),
                    $language,
                    $force,
                );
                $this->metrics?->addPhase('episode_credits', microtime(true) - $startedAt);
                $apiCalls++;

                $seenInEpisode = [];
                foreach (['cast', 'guest_stars'] as $bucket) {
                    foreach (($credits[$bucket] ?? []) as $credit) {
                        if (!is_array($credit)) {
                            continue;
                        }
                        $personId = (int) ($credit['id'] ?? 0);
                        if ($personId < 1 || isset($seenInEpisode[$personId])) {
                            continue;
                        }
                        $seenInEpisode[$personId] = true;
                        $this->addEpisodeCredit($people, $personId, $credit, $key);
                    }
                }
            }
        }

        $startedAt = microtime(true);
        ksort($episodes, SORT_NATURAL);
        foreach ($people as &$person) {
            $person['episodes'] = array_values(array_unique($person['episodes']));
            sort($person['episodes'], SORT_NATURAL);
            $person['indexed_episode_count'] = count($person['episodes']);
        }
        unset($person);
        ksort($people, SORT_NUMERIC);

        $quality = $this->quality($people, $episodes);
        $quality['tmdb_requests_for_full_refresh'] = $apiCalls;
        $this->metrics?->addPhase('snapshot_validation', microtime(true) - $startedAt);

        return [
            'schema_version' => 1,
            'reference' => [
                'slug' => $reference->slug,
                'tmdb_id' => $reference->tmdbId,
                'name' => (string) ($series['name'] ?? $reference->name),
                'original_name' => $series['original_name'] ?? null,
                'language' => $reference->language,
                'original_language' => $series['original_language'] ?? null,
                'first_air_date' => $series['first_air_date'] ?? null,
                'last_air_date' => $series['last_air_date'] ?? null,
                'status' => $series['status'] ?? null,
                'number_of_seasons' => $series['number_of_seasons'] ?? null,
                'number_of_episodes' => $series['number_of_episodes'] ?? null,
                'poster_path' => $series['poster_path'] ?? null,
                'backdrop_path' => $series['backdrop_path'] ?? null,
                'homepage' => $series['homepage'] ?? null,
                'include_specials' => $reference->includeSpecials,
                'updated_at' => gmdate(DATE_ATOM),
            ],
            'episodes' => $episodes,
            'people' => $people,
            'quality' => $quality,
        ];
    }

    public static function episodeKey(int $season, int $episode): string
    {
        return sprintf('S%02dE%02d', $season, $episode);
    }

    /** @param array<string, mixed> $aggregate @return array<int, array<string, mixed>> */
    private function aggregatePeople(array $aggregate): array
    {
        $people = [];
        foreach (($aggregate['cast'] ?? []) as $cast) {
            if (!is_array($cast)) {
                continue;
            }
            $id = (int) ($cast['id'] ?? 0);
            if ($id < 1) {
                continue;
            }
            $roles = [];
            foreach (($cast['roles'] ?? []) as $role) {
                if (!is_array($role)) {
                    continue;
                }
                $character = trim((string) ($role['character'] ?? ''));
                if ($character !== '') {
                    $roles[] = [
                        'character' => $character,
                        'episode_count' => (int) ($role['episode_count'] ?? 0),
                        'credit_id' => $role['credit_id'] ?? null,
                    ];
                }
            }
            $people[$id] = [
                'tmdb_id' => $id,
                'name' => (string) ($cast['name'] ?? ''),
                'original_name' => $cast['original_name'] ?? null,
                'profile_path' => $cast['profile_path'] ?? null,
                'order' => isset($cast['order']) ? (int) $cast['order'] : null,
                'aggregate_episode_count' => (int) ($cast['total_episode_count'] ?? 0),
                'indexed_episode_count' => 0,
                'roles' => $roles,
                'episodes' => [],
                'source' => 'aggregate_credits',
            ];
        }
        return $people;
    }

    /** @param array<int, array<string, mixed>> $people @param array<string, mixed> $credit */
    private function addEpisodeCredit(array &$people, int $personId, array $credit, string $episodeKey): void
    {
        if (!isset($people[$personId])) {
            $people[$personId] = [
                'tmdb_id' => $personId,
                'name' => (string) ($credit['name'] ?? ''),
                'original_name' => $credit['original_name'] ?? null,
                'profile_path' => $credit['profile_path'] ?? null,
                'order' => isset($credit['order']) ? (int) $credit['order'] : null,
                'aggregate_episode_count' => 0,
                'indexed_episode_count' => 0,
                'roles' => [],
                'episodes' => [],
                'source' => 'episode_credits_only',
            ];
        }
        $people[$personId]['episodes'][] = $episodeKey;
    }

    /** @param array<string, mixed> $episode @return array<string, mixed> */
    private function episodeMetadata(array $episode): array
    {
        return [
            'tmdb_id' => isset($episode['id']) ? (int) $episode['id'] : null,
            'season' => (int) ($episode['season_number'] ?? 0),
            'episode' => (int) ($episode['episode_number'] ?? 0),
            'name' => (string) ($episode['name'] ?? ''),
            'air_date' => $episode['air_date'] ?? null,
            'runtime' => isset($episode['runtime']) ? (int) $episode['runtime'] : null,
            'episode_type' => $episode['episode_type'] ?? null,
            'production_code' => $episode['production_code'] ?? null,
            'still_path' => $episode['still_path'] ?? null,
            'overview' => $episode['overview'] ?? null,
            'vote_average' => isset($episode['vote_average']) ? (float) $episode['vote_average'] : null,
            'vote_count' => isset($episode['vote_count']) ? (int) $episode['vote_count'] : null,
        ];
    }

    /** @param array<int, array<string, mixed>> $people @param array<string, array<string, mixed>> $episodes @return array<string, mixed> */
    private function quality(array $people, array $episodes): array
    {
        $aggregatePeople = 0;
        $exact = 0;
        $different = 0;
        $missing = 0;
        $episodeOnly = 0;
        $exactWithoutSpecials = 0;
        $differentWithoutSpecials = 0;
        $differences = [];
        $specialsAmongDifferences = [];

        foreach ($people as $person) {
            if (($person['source'] ?? '') === 'episode_credits_only') {
                $episodeOnly++;
                continue;
            }

            $aggregatePeople++;
            $aggregateCount = (int) ($person['aggregate_episode_count'] ?? 0);
            $personEpisodes = is_array($person['episodes'] ?? null) ? $person['episodes'] : [];
            $indexedCount = count($personEpisodes);
            $indexedWithoutSpecials = 0;
            foreach ($personEpisodes as $episodeKey) {
                if (!is_string($episodeKey)) {
                    continue;
                }
                if ((int) ($episodes[$episodeKey]['season'] ?? -1) !== 0) {
                    $indexedWithoutSpecials++;
                }
            }

            if ($indexedCount === 0 && $aggregateCount > 0) {
                $missing++;
            }

            if ($aggregateCount === $indexedCount) {
                $exact++;
            } else {
                $different++;
                $differences[] = [
                    'tmdb_id' => $person['tmdb_id'],
                    'name' => $person['name'],
                    'aggregate' => $aggregateCount,
                    'indexed' => $indexedCount,
                    'indexed_without_specials' => $indexedWithoutSpecials,
                    'delta' => $indexedCount - $aggregateCount,
                    'delta_without_specials' => $indexedWithoutSpecials - $aggregateCount,
                ];

                foreach ($personEpisodes as $episodeKey) {
                    if (!is_string($episodeKey) || (int) ($episodes[$episodeKey]['season'] ?? -1) !== 0) {
                        continue;
                    }
                    $specialsAmongDifferences[$episodeKey] = ($specialsAmongDifferences[$episodeKey] ?? 0) + 1;
                }
            }

            if ($aggregateCount === $indexedWithoutSpecials) {
                $exactWithoutSpecials++;
            } else {
                $differentWithoutSpecials++;
            }
        }

        usort($differences, static fn (array $a, array $b): int => abs($b['delta']) <=> abs($a['delta']));
        arsort($specialsAmongDifferences, SORT_NUMERIC);

        $specials = [];
        foreach ($specialsAmongDifferences as $episodeKey => $count) {
            $specials[] = [
                'episode_key' => $episodeKey,
                'tmdb_id' => $episodes[$episodeKey]['tmdb_id'] ?? null,
                'name' => $episodes[$episodeKey]['name'] ?? '',
                'people' => $count,
                'of_mismatches' => $different,
            ];
        }

        $coverage = $aggregatePeople === 0 ? 0.0 : round(($exact / $aggregatePeople) * 100, 1);
        $coverageWithoutSpecials = $aggregatePeople === 0
            ? 0.0
            : round(($exactWithoutSpecials / $aggregatePeople) * 100, 1);

        return [
            'aggregate_people' => $aggregatePeople,
            'exact_episode_count_match' => $exact,
            'different_episode_count' => $different,
            'missing_episode_index' => $missing,
            'episode_credits_only_people' => $episodeOnly,
            'exact_match_percent' => $coverage,
            'without_specials' => [
                'exact_episode_count_match' => $exactWithoutSpecials,
                'different_episode_count' => $differentWithoutSpecials,
                'exact_match_percent' => $coverageWithoutSpecials,
            ],
            'specials_among_differences' => $specials,
            'largest_differences' => array_slice($differences, 0, 25),
        ];
    }
}
