#!/usr/bin/env php
<?php

declare(strict_types=1);

use TaxaProxy\CacheStore;
use TaxaProxy\CachedTmdbReader;
use TaxaProxy\Config;
use TaxaProxy\ReferenceCatalog;
use TaxaProxy\ReferenceSnapshotBuilder;
use TaxaProxy\ReferenceSnapshotStore;
use TaxaProxy\RefreshMetrics;
use TaxaProxy\TmdbClient;

$root = dirname(__DIR__);
require $root . '/src/bootstrap.php';

$slug = 'taxa';
$force = false;
foreach (array_slice($argv, 1) as $argument) {
    if ($argument === '--force') {
        $force = true;
        continue;
    }
    if ($argument === '--help' || $argument === '-h') {
        fwrite(STDOUT, "Usage: php bin/refresh-reference.php [slug] [--force]\n");
        fwrite(STDOUT, "Eksempel: php bin/refresh-reference.php taxa --force\n");
        exit(0);
    }
    if (str_starts_with($argument, '-')) {
        fwrite(STDERR, "Ukendt option: {$argument}\n");
        exit(2);
    }
    $slug = $argument;
}

try {
    $config = Config::load($root);
    $cache = new CacheStore($config->string('storage.database_path'));
    $catalog = new ReferenceCatalog($config);
    $reference = $catalog->get($slug);
    $metrics = new RefreshMetrics();
    $tmdb = new TmdbClient($config, $metrics);
    $reader = new CachedTmdbReader($config, $cache, $tmdb, $metrics);
    $builder = new ReferenceSnapshotBuilder($reader, $metrics);
    $store = new ReferenceSnapshotStore($config->string('storage.reference_snapshot_dir'));

    fwrite(STDOUT, sprintf(
        "Bygger reference-snapshot: %s (TMDB %d)%s\n",
        $reference->name,
        $reference->tmdbId,
        $force ? ' [force]' : '',
    ));

    $snapshot = $builder->build($reference, $force);
    $writeStartedAt = microtime(true);
    $path = $store->write($reference->slug, $snapshot);
    $metrics->addPhase('snapshot_write', microtime(true) - $writeStartedAt);
    $quality = $snapshot['quality'];
    $run = $metrics->snapshot();

    fwrite(STDOUT, "\nDatakvalitet\n");
    fwrite(STDOUT, "------------\n");
    fwrite(STDOUT, sprintf("Aggregate cast:              %d\n", $quality['aggregate_people']));
    fwrite(STDOUT, sprintf("Eksakt episode-count match:  %d (%.1f%%)\n", $quality['exact_episode_count_match'], $quality['exact_match_percent']));
    fwrite(STDOUT, sprintf("Afvigende episode-count:     %d\n", $quality['different_episode_count']));
    fwrite(STDOUT, sprintf("Uden episodeindeks:          %d\n", $quality['missing_episode_index']));
    fwrite(STDOUT, sprintf("Kun fundet i episodecredits: %d\n", $quality['episode_credits_only_people']));
    fwrite(STDOUT, sprintf("TMDB requests ved full scan: %d\n", $quality['tmdb_requests_for_full_refresh']));

    $withoutSpecials = $quality['without_specials'] ?? [];
    fwrite(STDOUT, "\nUden specials (season 0)\n");
    fwrite(STDOUT, "-----------------------\n");
    fwrite(STDOUT, sprintf("Eksakt episode-count match:  %d (%.1f%%)\n",
        (int) ($withoutSpecials['exact_episode_count_match'] ?? 0),
        (float) ($withoutSpecials['exact_match_percent'] ?? 0.0),
    ));
    fwrite(STDOUT, sprintf("Afvigende episode-count:     %d\n",
        (int) ($withoutSpecials['different_episode_count'] ?? 0),
    ));

    $specials = $quality['specials_among_differences'] ?? [];
    if (is_array($specials) && $specials !== []) {
        fwrite(STDOUT, "\nSpecials blandt afvigelser\n");
        fwrite(STDOUT, "--------------------------\n");
        foreach (array_slice($specials, 0, 10) as $special) {
            fwrite(STDOUT, sprintf(
                "%-8s %-30s %d/%d\n",
                (string) ($special['episode_key'] ?? ''),
                substr((string) ($special['name'] ?? ''), 0, 30),
                (int) ($special['people'] ?? 0),
                (int) ($special['of_mismatches'] ?? 0),
            ));
        }
    }

    $differences = $quality['largest_differences'] ?? [];
    if (is_array($differences) && $differences !== []) {
        fwrite(STDOUT, "\nStørste afvigelser\n");
        fwrite(STDOUT, "------------------\n");
        foreach (array_slice($differences, 0, 15) as $difference) {
            fwrite(STDOUT, sprintf(
                "%-35s aggregate=%3d indexed=%3d delta=%+d\n",
                substr((string) $difference['name'], 0, 35),
                (int) $difference['aggregate'],
                (int) $difference['indexed'],
                (int) $difference['delta'],
            ));
        }
    }


    fwrite(STDOUT, "\nKørsel\n");
    fwrite(STDOUT, "------\n");
    fwrite(STDOUT, sprintf("Samlet tid:                  %6.2f s\n", (float) $run['total_seconds']));
    $phaseLabels = [
        'reference_metadata' => 'Reference metadata',
        'aggregate_credits' => 'Aggregate credits',
        'season_metadata' => 'Sæson/episode metadata',
        'episode_credits' => 'Episode credits',
        'snapshot_validation' => 'Snapshot + validering',
        'snapshot_write' => 'Snapshot skrivning',
    ];
    foreach ($phaseLabels as $key => $label) {
        fwrite(STDOUT, sprintf("%-28s %6.2f s\n", $label . ':', (float) ($run['phases'][$key] ?? 0.0)));
    }

    $responseMs = $run['response_ms'] ?? [];
    fwrite(STDOUT, "\nTMDB/cache\n");
    fwrite(STDOUT, "----------\n");
    fwrite(STDOUT, sprintf("Datakilde-opslag:            %d\n", (int) $run['cache_hits'] + (int) $run['cache_misses']));
    fwrite(STDOUT, sprintf("Cache hits:                  %d\n", (int) $run['cache_hits']));
    fwrite(STDOUT, sprintf("Netværksrequests:            %d\n", (int) $run['network_requests']));
    fwrite(STDOUT, sprintf("Stale fallback:              %d\n", (int) $run['stale_fallbacks']));
    fwrite(STDOUT, sprintf("HTTP 429 / throttles:        %d\n", (int) $run['tmdb_throttles_429']));
    fwrite(STDOUT, sprintf("Retries:                     %d\n", (int) $run['retries']));
    fwrite(STDOUT, sprintf("Tid i retry/sleep:           %6.2f s\n", (float) $run['sleep_seconds']));
    fwrite(STDOUT, sprintf("Netværksfejl:                %d\n", (int) $run['errors']));
    fwrite(STDOUT, sprintf(
        "TMDB svartid min/avg/max:   %.0f / %.0f / %.0f ms\n",
        (float) ($responseMs['min'] ?? 0.0),
        (float) ($responseMs['avg'] ?? 0.0),
        (float) ($responseMs['max'] ?? 0.0),
    ));

    fwrite(STDOUT, sprintf("\nSnapshot: %s\n", $path));
    fwrite(STDOUT, sprintf("Størrelse: %.1f KiB\n", filesize($path) / 1024));
} catch (Throwable $exception) {
    fwrite(STDERR, sprintf("FEJL: %s\n", $exception->getMessage()));
    exit(1);
}
