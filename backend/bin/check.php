<?php

declare(strict_types=1);

use TaxaProxy\CacheStore;
use TaxaProxy\Config;

$root = dirname(__DIR__);
require $root . '/src/bootstrap.php';

try {
    $config = Config::load($root);
    $pdoSqlite = extension_loaded('pdo_sqlite');
    $sqliteWritable = false;
    $sqliteError = '';

    if ($pdoSqlite) {
        try {
            $cache = new CacheStore($config->string('storage.database_path'));
            $sqliteWritable = $cache->ping();
        } catch (Throwable $exception) {
            $sqliteError = $exception->getMessage();
        }
    }

    $checks = [
        'PHP version >= 8.1' => version_compare(PHP_VERSION, '8.1.0', '>='),
        'JSON' => extension_loaded('json'),
        'PDO' => extension_loaded('pdo'),
        'PDO SQLite' => $pdoSqlite,
        'HTTP client (curl eller streams)' => function_exists('curl_init') || (bool) ini_get('allow_url_fopen'),
        'TMDB credential' => $config->hasTmdbCredentials(),
        'SQLite writable' => $sqliteWritable,
    ];

    $failed = false;
    foreach ($checks as $label => $ok) {
        fwrite(STDOUT, sprintf("[%s] %s\n", $ok ? 'OK' : 'FEJL', $label));
        $failed = $failed || !$ok;
    }

    if ($sqliteError !== '') {
        fwrite(STDERR, '[INFO] SQLite: ' . $sqliteError . "\n");
    }

    exit($failed ? 1 : 0);
} catch (Throwable $exception) {
    fwrite(STDERR, '[FEJL] ' . $exception->getMessage() . "\n");
    exit(1);
}
