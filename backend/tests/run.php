<?php

declare(strict_types=1);

use TaxaProxy\ClientIdentity;
use TaxaProxy\Config;
use TaxaProxy\HttpException;
use TaxaProxy\Input;
use TaxaProxy\Request;

$root = dirname(__DIR__);
require $root . '/src/bootstrap.php';

$tests = [];

$test = static function (string $name, callable $callback) use (&$tests): void {
    $tests[] = [$name, $callback];
};

$assertSame = static function (mixed $expected, mixed $actual, string $message = ''): void {
    if ($expected !== $actual) {
        throw new RuntimeException($message !== '' ? $message : sprintf(
            'Forventede %s, fik %s.',
            var_export($expected, true),
            var_export($actual, true),
        ));
    }
};

$assertThrows = static function (callable $callback, int $status): void {
    try {
        $callback();
    } catch (HttpException $exception) {
        if ($exception->status !== $status) {
            throw new RuntimeException(sprintf(
                'Forventede HTTP %d, fik HTTP %d.',
                $status,
                $exception->status,
            ));
        }
        return;
    }
    throw new RuntimeException('Forventede en HttpException.');
};

$test('Input validerer søgeparametre', static function () use ($assertSame): void {
    $query = [
        'media_type' => 'tv',
        'query' => ' Taxa ',
        'include_adult' => 'true',
        'page' => '2',
        'language' => 'da-DK',
    ];

    $assertSame('tv', Input::enum($query, 'media_type', ['tv', 'movie']));
    $assertSame('Taxa', Input::string($query, 'query'));
    $assertSame(true, Input::boolean($query, 'include_adult'));
    $assertSame(2, Input::integer($query, 'page', 1, 500, 1));
    $assertSame('da-DK', Input::language($query));
});

$test('Input afviser ukendt medietype', static function () use ($assertThrows): void {
    $assertThrows(
        static fn () => Input::enum(['media_type' => 'person'], 'media_type', ['tv', 'movie']),
        400,
    );
});

$test('Request understøtter index.php route-parameter', static function () use ($assertSame): void {
    $oldGet = $_GET;
    $oldServer = $_SERVER;
    try {
        $_GET = ['route' => 'reference/taxa'];
        $_SERVER = [
            'REQUEST_METHOD' => 'GET',
            'REQUEST_URI' => '/tmdb/index.php?route=reference%2Ftaxa',
            'SCRIPT_NAME' => '/tmdb/index.php',
            'REMOTE_ADDR' => '127.0.0.1',
        ];
        $request = Request::fromGlobals();
        $assertSame('reference/taxa', $request->route);
    } finally {
        $_GET = $oldGet;
        $_SERVER = $oldServer;
    }
});

$test('Request understøtter clean path med rewrite', static function () use ($assertSame): void {
    $oldGet = $_GET;
    $oldServer = $_SERVER;
    try {
        $_GET = [];
        $_SERVER = [
            'REQUEST_METHOD' => 'GET',
            'REQUEST_URI' => '/tmdb/search?query=Taxa',
            'SCRIPT_NAME' => '/tmdb/index.php',
            'REMOTE_ADDR' => '127.0.0.1',
        ];
        $request = Request::fromGlobals();
        $assertSame('search', $request->route);
    } finally {
        $_GET = $oldGet;
        $_SERVER = $oldServer;
    }
});

$test('Klientidentitet gemmer kun en hash', static function () use ($assertSame): void {
    $temporaryRoot = sys_get_temp_dir() . '/taxa-proxy-test-' . bin2hex(random_bytes(4));
    mkdir($temporaryRoot . '/config', 0770, true);
    mkdir($temporaryRoot . '/var', 0770, true);
    file_put_contents($temporaryRoot . '/config/local.php', <<<'CONFIG'
<?php
return [
    'tmdb' => ['api_key' => 'test-key'],
    'cors' => ['allowed_origins' => ['https://git.foo.dk']],
    'storage' => ['database_path' => __DIR__ . '/../var/test.sqlite'],
];
CONFIG);

    try {
        $config = Config::load($temporaryRoot);
        $request = new Request(
            'GET',
            'health',
            [],
            ['x-taxa-client-id' => '12345678-1234-1234-1234-123456789012'],
            '192.0.2.10',
        );
        $hash = ClientIdentity::hash($request, $config);
        $assertSame(64, strlen($hash));
        $assertSame(false, str_contains($hash, '192.0.2.10'));
    } finally {
        @unlink($temporaryRoot . '/config/local.php');
        @rmdir($temporaryRoot . '/config');
        @rmdir($temporaryRoot . '/var');
        @rmdir($temporaryRoot);
    }
});



$test('Reference-snapshot normaliserer episoder og måler datakvalitet', static function () use ($assertSame): void {
    $source = new class implements \TaxaProxy\ReferenceDataSource {
        public function get(string $path, array $parameters, bool $force = false): array
        {
            return match ($path) {
                '/tv/51261' => [
                    'name' => 'TAXA',
                    'original_name' => 'Taxa',
                    'original_language' => 'da',
                    'number_of_seasons' => 1,
                    'number_of_episodes' => 2,
                    'seasons' => [
                        ['season_number' => 1, 'episode_count' => 2],
                    ],
                ],
                '/tv/51261/aggregate_credits' => [
                    'cast' => [
                        [
                            'id' => 10,
                            'name' => 'Person A',
                            'total_episode_count' => 2,
                            'roles' => [['character' => 'A', 'episode_count' => 2, 'credit_id' => 'a']],
                        ],
                        [
                            'id' => 20,
                            'name' => 'Person B',
                            'total_episode_count' => 1,
                            'roles' => [['character' => 'B', 'episode_count' => 1, 'credit_id' => 'b']],
                        ],
                    ],
                ],
                '/tv/51261/season/1' => [
                    'episodes' => [
                        [
                            'id' => 101,
                            'season_number' => 1,
                            'episode_number' => 1,
                            'name' => 'Første',
                            'air_date' => '1997-01-01',
                            'runtime' => 45,
                        ],
                        [
                            'id' => 102,
                            'season_number' => 1,
                            'episode_number' => 2,
                            'name' => 'Anden',
                            'air_date' => '1997-01-08',
                            'runtime' => 46,
                        ],
                    ],
                ],
                '/tv/51261/season/1/episode/1/credits' => [
                    'cast' => [['id' => 10, 'name' => 'Person A']],
                    'guest_stars' => [['id' => 30, 'name' => 'Person C']],
                ],
                '/tv/51261/season/1/episode/2/credits' => [
                    'cast' => [['id' => 10, 'name' => 'Person A']],
                    'guest_stars' => [],
                ],
                default => throw new RuntimeException('Uventet test-path: ' . $path),
            };
        }
    };

    $builder = new \TaxaProxy\ReferenceSnapshotBuilder($source);
    $reference = new \TaxaProxy\ReferenceDefinition('taxa', 51261, 'TAXA', 'da-DK', true);
    $snapshot = $builder->build($reference);

    $assertSame(101, $snapshot['episodes']['S01E01']['tmdb_id']);
    $assertSame(['S01E01', 'S01E02'], $snapshot['people'][10]['episodes']);
    $assertSame(2, $snapshot['people'][10]['indexed_episode_count']);
    $assertSame('episode_credits_only', $snapshot['people'][30]['source']);
    $assertSame(1, $snapshot['quality']['exact_episode_count_match']);
    $assertSame(1, $snapshot['quality']['missing_episode_index']);
    $assertSame(1, $snapshot['quality']['episode_credits_only_people']);
});


$test('Datakvalitet forklarer season 0 som special-afvigelse', static function () use ($assertSame): void {
    $source = new class implements \TaxaProxy\ReferenceDataSource {
        public function get(string $path, array $parameters, bool $force = false): array
        {
            return match ($path) {
                '/tv/51261' => [
                    'name' => 'TAXA',
                    'seasons' => [
                        ['season_number' => 0, 'episode_count' => 1],
                        ['season_number' => 1, 'episode_count' => 1],
                    ],
                ],
                '/tv/51261/aggregate_credits' => [
                    'cast' => [[
                        'id' => 10,
                        'name' => 'Person A',
                        'total_episode_count' => 1,
                        'roles' => [['character' => 'A', 'episode_count' => 1]],
                    ]],
                ],
                '/tv/51261/season/0' => [
                    'episodes' => [[
                        'id' => 100,
                        'season_number' => 0,
                        'episode_number' => 1,
                        'name' => 'Farvel til Taxa',
                    ]],
                ],
                '/tv/51261/season/0/episode/1/credits' => [
                    'cast' => [['id' => 10, 'name' => 'Person A']],
                    'guest_stars' => [],
                ],
                '/tv/51261/season/1' => [
                    'episodes' => [[
                        'id' => 101,
                        'season_number' => 1,
                        'episode_number' => 1,
                        'name' => 'Første',
                    ]],
                ],
                '/tv/51261/season/1/episode/1/credits' => [
                    'cast' => [['id' => 10, 'name' => 'Person A']],
                    'guest_stars' => [],
                ],
                default => throw new RuntimeException('Uventet test-path: ' . $path),
            };
        }
    };

    $builder = new \TaxaProxy\ReferenceSnapshotBuilder($source);
    $reference = new \TaxaProxy\ReferenceDefinition('taxa', 51261, 'TAXA', 'da-DK', true);
    $snapshot = $builder->build($reference);
    $quality = $snapshot['quality'];

    $assertSame(0, $quality['exact_episode_count_match']);
    $assertSame(1, $quality['different_episode_count']);
    $assertSame(1, $quality['without_specials']['exact_episode_count_match']);
    $assertSame(0, $quality['without_specials']['different_episode_count']);
    $assertSame('S00E01', $quality['specials_among_differences'][0]['episode_key']);
    $assertSame('Farvel til Taxa', $quality['specials_among_differences'][0]['name']);
    $assertSame(1, $quality['specials_among_differences'][0]['people']);
});

$test('RefreshMetrics opsummerer cache og netværk', static function () use ($assertSame): void {
    $metrics = new \TaxaProxy\RefreshMetrics();
    $metrics->cacheHit();
    $metrics->cacheMiss();
    $metrics->networkRequest(200, 100.0);
    $metrics->networkRequest(429, 300.0);
    $metrics->staleFallback();
    $metrics->addPhase('episode_credits', 0.5);
    $snapshot = $metrics->snapshot();

    $assertSame(1, $snapshot['cache_hits']);
    $assertSame(1, $snapshot['cache_misses']);
    $assertSame(2, $snapshot['network_requests']);
    $assertSame(1, $snapshot['tmdb_throttles_429']);
    $assertSame(1, $snapshot['stale_fallbacks']);
    $assertSame(100.0, $snapshot['response_ms']['min']);
    $assertSame(200.0, $snapshot['response_ms']['avg']);
    $assertSame(300.0, $snapshot['response_ms']['max']);
});

$test('Episode-nøgler er stabile og menneskeligt læsbare', static function () use ($assertSame): void {
    $assertSame('S00E01', \TaxaProxy\ReferenceSnapshotBuilder::episodeKey(0, 1));
    $assertSame('S01E12', \TaxaProxy\ReferenceSnapshotBuilder::episodeKey(1, 12));
    $assertSame('S12E103', \TaxaProxy\ReferenceSnapshotBuilder::episodeKey(12, 103));
});

if (extension_loaded('pdo_sqlite')) {
    $test('SQLite-cache gemmer og læser poster', static function () use ($assertSame): void {
        $path = sys_get_temp_dir() . '/taxa-cache-' . bin2hex(random_bytes(4)) . '.sqlite';
        try {
            $cache = new \TaxaProxy\CacheStore($path);
            $cache->put('key', '{"ok":true}', 200, 100, 200, 300);
            $entry = $cache->get('key');
            $assertSame('{"ok":true}', $entry?->body);
            $assertSame(true, $entry?->isFresh(150));
            $assertSame(true, $entry?->canServeStale(250));
        } finally {
            @unlink($path);
            @unlink($path . '-wal');
            @unlink($path . '-shm');
        }
    });

    $test('Token bucket begrænser og genopfylder', static function () use ($assertSame): void {
        $path = sys_get_temp_dir() . '/taxa-rate-' . bin2hex(random_bytes(4)) . '.sqlite';
        try {
            $cache = new \TaxaProxy\CacheStore($path);
            $limiter = new \TaxaProxy\RateLimiter($cache->pdo());
            $spec = new \TaxaProxy\RateLimitSpec('test', 2.0, 1.0);

            $assertSame(true, $limiter->consume([$spec], 100.0)->allowed);
            $assertSame(true, $limiter->consume([$spec], 100.0)->allowed);
            $denied = $limiter->consume([$spec], 100.0);
            $assertSame(false, $denied->allowed);
            $assertSame(1, $denied->retryAfterSeconds);
            $assertSame(true, $limiter->consume([$spec], 101.0)->allowed);
        } finally {
            @unlink($path);
            @unlink($path . '-wal');
            @unlink($path . '-shm');
        }
    });
}

$failures = 0;
foreach ($tests as [$name, $callback]) {
    try {
        $callback();
        fwrite(STDOUT, "[OK] {$name}\n");
    } catch (Throwable $exception) {
        $failures++;
        fwrite(STDERR, "[FEJL] {$name}: {$exception->getMessage()}\n");
    }
}

fwrite(STDOUT, sprintf(
    "%d tests, %d fejl.\n",
    count($tests),
    $failures,
));
exit($failures === 0 ? 0 : 1);
