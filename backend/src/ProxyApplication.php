<?php

declare(strict_types=1);

namespace TaxaProxy;

use Throwable;

final class ProxyApplication
{
    public function __construct(
        private readonly Config $config,
        private readonly CacheStore $cache,
        private readonly RateLimiter $rateLimiter,
        private readonly TmdbClient $tmdb,
    ) {
    }

    public function handle(Request $request): Response
    {
        if ($request->route === 'health') {
            return $this->health();
        }

        if ($request->method !== 'GET') {
            throw new HttpException(405, 'Kun GET og OPTIONS er tilladt.', [
                'Allow' => 'GET, OPTIONS',
            ]);
        }

        $clientHash = ClientIdentity::hash($request, $this->config);
        $ingressDecision = $this->rateLimiter->consume([
            new RateLimitSpec(
                'ingress:' . $clientHash,
                $this->config->float('rate_limit.ingress_capacity'),
                $this->config->float('rate_limit.ingress_refill_per_second'),
            ),
        ]);
        if (!$ingressDecision->allowed) {
            throw new HttpException(429, 'For mange forespørgsler til proxyen.', [
                'Retry-After' => (string) max(1, $ingressDecision->retryAfterSeconds),
            ]);
        }

        $response = match ($request->route) {
            'search' => $this->search($request, $clientHash),
            'credits' => $this->credits($request, $clientHash),
            'reference/taxa' => $this->taxaReference($request, $clientHash),
            default => throw new HttpException(404, 'Ukendt proxy-endpoint.'),
        };

        $this->probabilisticCleanup();
        return $response;
    }

    private function health(): Response
    {
        return Response::json([
            'ok' => $this->cache->ping() && $this->config->hasTmdbCredentials(),
            'service' => 'taxa-tmdb-proxy',
            'version' => $this->config->string('service.version'),
            'tmdb_auth' => $this->config->string('tmdb.bearer_token') !== ''
                ? 'bearer'
                : ($this->config->string('tmdb.api_key') !== '' ? 'api_key' : 'none'),
            'cache' => 'sqlite',
            'time' => gmdate(DATE_ATOM),
        ], 200, [
            'Cache-Control' => 'no-store',
        ]);
    }

    private function search(Request $request, string $clientHash): Response
    {
        $mediaType = Input::enum($request->query, 'media_type', ['tv', 'movie']);
        $query = Input::string($request->query, 'query', 1, 120);
        $language = Input::language($request->query);
        $includeAdult = Input::boolean($request->query, 'include_adult', false);
        $page = Input::integer($request->query, 'page', 1, 500, 1);

        return $this->cachedTmdbGet(
            'search',
            $mediaType === 'tv' ? '/search/tv' : '/search/movie',
            [
                'query' => $query,
                'language' => $language,
                'include_adult' => $includeAdult ? 'true' : 'false',
                'page' => $page,
            ],
            $this->config->integer('cache.search_ttl_seconds'),
            $this->config->integer('cache.search_stale_seconds'),
            $clientHash,
        );
    }

    private function credits(Request $request, string $clientHash): Response
    {
        $mediaType = Input::enum($request->query, 'media_type', ['tv', 'movie']);
        $id = Input::integer($request->query, 'id', 1, 2147483647);
        $language = Input::language($request->query);

        $path = $mediaType === 'tv'
            ? sprintf('/tv/%d/aggregate_credits', $id)
            : sprintf('/movie/%d/credits', $id);

        return $this->cachedTmdbGet(
            'credits',
            $path,
            ['language' => $language],
            $this->config->integer('cache.credits_ttl_seconds'),
            $this->config->integer('cache.credits_stale_seconds'),
            $clientHash,
        );
    }

    private function taxaReference(Request $request, string $clientHash): Response
    {
        $language = Input::language($request->query);

        return $this->cachedTmdbGet(
            'reference:taxa',
            '/tv/51261/aggregate_credits',
            ['language' => $language],
            $this->config->integer('cache.reference_ttl_seconds'),
            $this->config->integer('cache.reference_stale_seconds'),
            $clientHash,
        );
    }

    /** @param array<string, scalar> $parameters */
    private function cachedTmdbGet(
        string $operation,
        string $path,
        array $parameters,
        int $ttlSeconds,
        int $staleSeconds,
        string $clientHash,
    ): Response {
        $now = time();
        $cacheKey = $this->cacheKey($operation, $path, $parameters);
        $cached = $this->cache->get($cacheKey);

        if ($cached?->isFresh($now)) {
            return $this->cachedResponse($cached, 'HIT', $now);
        }

        $upstreamDecision = $this->rateLimiter->consume([
            new RateLimitSpec(
                'upstream:global',
                $this->config->float('rate_limit.upstream_global_capacity'),
                $this->config->float('rate_limit.upstream_global_refill_per_second'),
            ),
            new RateLimitSpec(
                'upstream:client:' . $clientHash,
                $this->config->float('rate_limit.upstream_client_capacity'),
                $this->config->float('rate_limit.upstream_client_refill_per_second'),
            ),
        ]);

        if (!$upstreamDecision->allowed) {
            if ($cached?->canServeStale($now)) {
                return $this->cachedResponse(
                    $cached,
                    'STALE-RATE-LIMIT',
                    $now,
                    ['Retry-After' => (string) max(1, $upstreamDecision->retryAfterSeconds)],
                );
            }

            throw new HttpException(429, 'Proxyens TMDB-budget er midlertidigt opbrugt.', [
                'Retry-After' => (string) max(1, $upstreamDecision->retryAfterSeconds),
            ]);
        }

        try {
            $upstream = $this->tmdb->get($path, $parameters);
        } catch (HttpException $exception) {
            if ($cached?->canServeStale($now)) {
                return $this->cachedResponse($cached, 'STALE-UPSTREAM-ERROR', $now, [
                    'X-Taxa-Upstream-Status' => (string) $exception->status,
                ]);
            }
            throw $exception;
        }

        if ($upstream->status === 200) {
            $this->cache->put(
                $cacheKey,
                $upstream->body,
                $upstream->status,
                $now,
                $now + max(1, $ttlSeconds),
                $now + max($ttlSeconds + 1, $staleSeconds),
            );

            return Response::rawJson($upstream->body, 200, [
                'Cache-Control' => 'no-store',
                'X-Taxa-Cache' => $cached === null ? 'MISS' : 'REFRESH',
                'Age' => '0',
            ]);
        }

        if (($upstream->status === 429 || $upstream->status >= 500) && $cached?->canServeStale($now)) {
            $headers = [
                'X-Taxa-Upstream-Status' => (string) $upstream->status,
            ];
            $retryAfter = $upstream->retryAfterSeconds();
            if ($retryAfter !== null) {
                $headers['Retry-After'] = (string) $retryAfter;
            }
            return $this->cachedResponse($cached, 'STALE-UPSTREAM-STATUS', $now, $headers);
        }

        $headers = [
            'Cache-Control' => 'no-store',
            'X-Taxa-Cache' => 'BYPASS',
        ];
        $retryAfter = $upstream->retryAfterSeconds();
        if ($retryAfter !== null) {
            $headers['Retry-After'] = (string) $retryAfter;
        }

        return Response::rawJson($upstream->body, $upstream->status, $headers);
    }

    /** @param array<string, scalar> $parameters */
    private function cacheKey(string $operation, string $path, array $parameters): string
    {
        ksort($parameters);
        $canonical = json_encode([
            'operation' => $operation,
            'path' => $path,
            'parameters' => $parameters,
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);

        return hash('sha256', $canonical);
    }

    /** @param array<string, string> $extraHeaders */
    private function cachedResponse(
        CacheEntry $entry,
        string $cacheStatus,
        int $now,
        array $extraHeaders = [],
    ): Response {
        $headers = [
            'Cache-Control' => 'no-store',
            'X-Taxa-Cache' => $cacheStatus,
            'Age' => (string) $entry->age($now),
        ];

        if (!$entry->isFresh($now)) {
            $headers['Warning'] = '110 - "Response is stale"';
        }

        return Response::rawJson(
            $entry->body,
            $entry->status,
            array_merge($headers, $extraHeaders),
        );
    }

    private function probabilisticCleanup(): void
    {
        try {
            if (random_int(1, 100) !== 1) {
                return;
            }
            $this->cache->prune(time());
            $this->rateLimiter->prune(microtime(true) - 86400);
        } catch (Throwable) {
            // Oprydning må aldrig få et ellers gyldigt API-kald til at fejle.
        }
    }
}
