<?php

declare(strict_types=1);

namespace TaxaProxy;

final class RefreshMetrics
{
    private float $startedAt;
    /** @var array<string, float> */
    private array $phaseSeconds = [];
    /** @var list<float> */
    private array $networkDurationsMs = [];
    private int $cacheHits = 0;
    private int $cacheMisses = 0;
    private int $staleFallbacks = 0;
    private int $networkRequests = 0;
    private int $throttles = 0;
    private int $retries = 0;
    private float $sleepSeconds = 0.0;
    private int $errors = 0;

    public function __construct()
    {
        $this->startedAt = microtime(true);
    }

    public function addPhase(string $name, float $seconds): void
    {
        $this->phaseSeconds[$name] = ($this->phaseSeconds[$name] ?? 0.0) + max(0.0, $seconds);
    }

    public function cacheHit(): void
    {
        $this->cacheHits++;
    }

    public function cacheMiss(): void
    {
        $this->cacheMisses++;
    }

    public function staleFallback(): void
    {
        $this->staleFallbacks++;
    }

    public function networkRequest(int $status, float $durationMs): void
    {
        $this->networkRequests++;
        $this->networkDurationsMs[] = max(0.0, $durationMs);
        if ($status === 429) {
            $this->throttles++;
        }
    }

    public function retry(float $sleepSeconds = 0.0): void
    {
        $this->retries++;
        $this->sleepSeconds += max(0.0, $sleepSeconds);
    }

    public function error(): void
    {
        $this->errors++;
    }

    /** @return array<string, mixed> */
    public function snapshot(): array
    {
        $durations = $this->networkDurationsMs;
        sort($durations, SORT_NUMERIC);
        $count = count($durations);
        $average = $count === 0 ? 0.0 : array_sum($durations) / $count;

        return [
            'total_seconds' => microtime(true) - $this->startedAt,
            'phases' => $this->phaseSeconds,
            'cache_hits' => $this->cacheHits,
            'cache_misses' => $this->cacheMisses,
            'stale_fallbacks' => $this->staleFallbacks,
            'network_requests' => $this->networkRequests,
            'tmdb_throttles_429' => $this->throttles,
            'retries' => $this->retries,
            'sleep_seconds' => $this->sleepSeconds,
            'errors' => $this->errors,
            'response_ms' => [
                'min' => $count === 0 ? 0.0 : $durations[0],
                'avg' => $average,
                'max' => $count === 0 ? 0.0 : $durations[$count - 1],
            ],
        ];
    }
}
