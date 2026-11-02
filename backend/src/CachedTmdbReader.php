<?php

declare(strict_types=1);

namespace TaxaProxy;

use JsonException;

final class CachedTmdbReader implements ReferenceDataSource
{
    public function __construct(
        private readonly Config $config,
        private readonly CacheStore $cache,
        private readonly TmdbClient $tmdb,
        private readonly ?RefreshMetrics $metrics = null,
    ) {
    }

    /** @param array<string, scalar> $parameters @return array<string, mixed> */
    public function get(string $path, array $parameters, bool $force = false): array
    {
        ksort($parameters);
        $key = hash('sha256', json_encode([
            'kind' => 'reference-source',
            'path' => $path,
            'parameters' => $parameters,
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));

        $now = time();
        $cached = $this->cache->get($key);
        if (!$force && $cached?->isFresh($now)) {
            $this->metrics?->cacheHit();
            return $this->decode($cached->body);
        }
        $this->metrics?->cacheMiss();

        try {
            $response = $this->tmdb->get($path, $parameters);
            if ($response->status !== 200) {
                throw new HttpException($response->status, sprintf('TMDB returnerede HTTP %d for %s.', $response->status, $path));
            }

            $ttl = $this->config->integer('cache.reference_source_ttl_seconds');
            $stale = $this->config->integer('cache.reference_source_stale_seconds');
            $this->cache->put($key, $response->body, 200, $now, $now + $ttl, $now + $stale);
            return $this->decode($response->body);
        } catch (HttpException $exception) {
            if ($cached?->canServeStale($now)) {
                $this->metrics?->staleFallback();
                return $this->decode($cached->body);
            }
            throw $exception;
        }
    }

    /** @return array<string, mixed> */
    private function decode(string $json): array
    {
        try {
            $value = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new HttpException(502, 'Cache indeholder ugyldig TMDB JSON.', [], $exception);
        }
        if (!is_array($value)) {
            throw new HttpException(502, 'TMDB JSON havde ikke forventet objektformat.');
        }
        return $value;
    }
}
