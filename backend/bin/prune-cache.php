<?php

declare(strict_types=1);

use TaxaProxy\CacheStore;
use TaxaProxy\Config;
use TaxaProxy\RateLimiter;

$root = dirname(__DIR__);
require $root . '/src/bootstrap.php';

try {
    $config = Config::load($root);
    $cache = new CacheStore($config->string('storage.database_path'));
    $limiter = new RateLimiter($cache->pdo());

    $cacheRows = $cache->prune(time());
    $bucketRows = $limiter->prune(microtime(true) - 86400);

    fwrite(STDOUT, sprintf(
        "Fjernede %d udløbne cacheposter og %d gamle rate-limit-buckets.\n",
        $cacheRows,
        $bucketRows,
    ));
    exit(0);
} catch (Throwable $exception) {
    fwrite(STDERR, 'Fejl: ' . $exception->getMessage() . "\n");
    exit(1);
}
