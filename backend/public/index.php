<?php

declare(strict_types=1);

use TaxaProxy\CacheStore;
use TaxaProxy\Config;
use TaxaProxy\Cors;
use TaxaProxy\HttpException;
use TaxaProxy\ProxyApplication;
use TaxaProxy\RateLimiter;
use TaxaProxy\Request;
use TaxaProxy\Response;
use TaxaProxy\TmdbClient;

$root = dirname(__DIR__);
require $root . '/src/bootstrap.php';

$requestId = bin2hex(random_bytes(8));
$corsHeaders = ['Vary' => 'Origin'];

try {
    $config = Config::load($root);
    $request = Request::fromGlobals();
    $corsHeaders = Cors::headers($request, $config);

    if ($request->method === 'OPTIONS') {
        (new Response(204, '', ['Cache-Control' => 'no-store']))->send(
            array_merge($corsHeaders, [
                'X-Request-ID' => $requestId,
                'X-Content-Type-Options' => 'nosniff',
            ]),
        );
    }

    $cache = new CacheStore($config->string('storage.database_path'));
    $application = new ProxyApplication(
        $config,
        $cache,
        new RateLimiter($cache->pdo()),
        new TmdbClient($config),
    );

    $application->handle($request)->send(array_merge($corsHeaders, [
        'X-Request-ID' => $requestId,
        'X-Content-Type-Options' => 'nosniff',
        'Referrer-Policy' => 'no-referrer',
    ]));
} catch (HttpException $exception) {
    Response::json([
        'status_code' => $exception->status,
        'status_message' => $exception->getMessage(),
        'success' => false,
        'request_id' => $requestId,
    ], $exception->status, $exception->headers)->send(array_merge($corsHeaders, [
        'Cache-Control' => 'no-store',
        'X-Request-ID' => $requestId,
        'X-Content-Type-Options' => 'nosniff',
    ]));
} catch (Throwable $exception) {
    error_log(sprintf(
        '[taxa-proxy] request=%s error=%s file=%s line=%d',
        $requestId,
        $exception->getMessage(),
        $exception->getFile(),
        $exception->getLine(),
    ));

    Response::json([
        'status_code' => 500,
        'status_message' => 'Proxyen kunne ikke behandle forespørgslen.',
        'success' => false,
        'request_id' => $requestId,
    ], 500)->send(array_merge($corsHeaders, [
        'Cache-Control' => 'no-store',
        'X-Request-ID' => $requestId,
        'X-Content-Type-Options' => 'nosniff',
    ]));
}
