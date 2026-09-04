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
