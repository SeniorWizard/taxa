#!/usr/bin/env php
<?php

declare(strict_types=1);

use TaxaProxy\Config;
use TaxaProxy\ReferenceCatalog;
use TaxaProxy\ReferenceSnapshotStore;

$root = dirname(__DIR__);
require $root . '/src/bootstrap.php';

try {
    $config = Config::load($root);
    $catalog = new ReferenceCatalog($config);
    $store = new ReferenceSnapshotStore($config->string('storage.reference_snapshot_dir'));

    foreach ($catalog->all() as $reference) {
        $snapshot = $store->read($reference->slug);
        printf(
            "%-20s TMDB=%-8d snapshot=%s\n",
            $reference->slug,
            $reference->tmdbId,
            $snapshot === null ? 'mangler' : gmdate(DATE_ATOM, $snapshot->modifiedAt),
        );
    }
} catch (Throwable $exception) {
    fwrite(STDERR, sprintf("FEJL: %s\n", $exception->getMessage()));
    exit(1);
}
