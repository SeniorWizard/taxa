<?php

declare(strict_types=1);

namespace TaxaProxy;

use RuntimeException;

final class Config
{
    /** @param array<string, mixed> $values */
    private function __construct(private readonly array $values)
    {
    }

    public static function load(string $rootDirectory): self
    {
        $defaults = [
            'service' => [
                'version' => '1.0.0',
            ],
            'tmdb' => [
                'base_url' => 'https://api.themoviedb.org/3',
                'bearer_token' => '',
                'api_key' => '',
                'connect_timeout_seconds' => 5,
                'timeout_seconds' => 15,
                'maximum_response_bytes' => 10 * 1024 * 1024,
                'user_agent' => 'TaxaOverlapProxy/1.0',
            ],
            'cors' => [
                'allowed_origins' => [
                    'http://localhost:5173',
                ],
            ],
            'storage' => [
                'database_path' => $rootDirectory . '/var/taxa-proxy.sqlite',
            ],
            'network' => [
                'trust_proxy_headers' => false,
                'trusted_proxy_ips' => [],
            ],
            'rate_limit' => [
                'ingress_capacity' => 30.0,
                'ingress_refill_per_second' => 2.0,
                'upstream_global_capacity' => 30.0,
                'upstream_global_refill_per_second' => 15.0,
                'upstream_client_capacity' => 10.0,
                'upstream_client_refill_per_second' => 1.0,
            ],
            'cache' => [
                'search_ttl_seconds' => 1800,
                'search_stale_seconds' => 86400,
                'credits_ttl_seconds' => 86400,
                'credits_stale_seconds' => 604800,
                'reference_ttl_seconds' => 604800,
                'reference_stale_seconds' => 7776000,
            ],
        ];

        $localPath = $rootDirectory . '/config/local.php';
        $local = [];
        if (is_file($localPath)) {
            $loaded = require $localPath;
            if (!is_array($loaded)) {
                throw new RuntimeException('config/local.php skal returnere et array.');
            }
            $local = $loaded;
        }

        $values = array_replace_recursive($defaults, $local);
        self::applyEnvironment($values);
        self::validate($values);

        return new self($values);
    }

    public function string(string $path): string
    {
        $value = $this->value($path);
        if (!is_scalar($value)) {
            throw new RuntimeException(sprintf('Konfigurationen "%s" er ikke en tekstværdi.', $path));
        }
        return (string) $value;
    }

    public function integer(string $path): int
    {
        return (int) $this->value($path);
    }

    public function float(string $path): float
    {
        return (float) $this->value($path);
    }

    public function boolean(string $path): bool
    {
        return (bool) $this->value($path);
    }

    /** @return list<string> */
    public function stringList(string $path): array
    {
        $value = $this->value($path);
        if (!is_array($value)) {
            throw new RuntimeException(sprintf('Konfigurationen "%s" er ikke en liste.', $path));
        }

        return array_values(array_filter(array_map(
            static fn (mixed $item): string => trim((string) $item),
            $value,
        ), static fn (string $item): bool => $item !== ''));
    }

    public function hasTmdbCredentials(): bool
    {
        return $this->string('tmdb.bearer_token') !== ''
            || $this->string('tmdb.api_key') !== '';
    }

    private function value(string $path): mixed
    {
        $value = $this->values;
        foreach (explode('.', $path) as $segment) {
            if (!is_array($value) || !array_key_exists($segment, $value)) {
                throw new RuntimeException(sprintf('Konfigurationen "%s" findes ikke.', $path));
            }
            $value = $value[$segment];
        }

        return $value;
    }

    /** @param array<string, mixed> $values */
    private static function applyEnvironment(array &$values): void
    {
        self::setEnvString($values, 'TMDB_BEARER_TOKEN', ['tmdb', 'bearer_token']);
        self::setEnvString($values, 'TMDB_API_KEY', ['tmdb', 'api_key']);
        self::setEnvString($values, 'TAXA_PROXY_DATABASE', ['storage', 'database_path']);

        $origins = getenv('TAXA_PROXY_ALLOWED_ORIGINS');
        if ($origins !== false && trim($origins) !== '') {
            $values['cors']['allowed_origins'] = self::commaList($origins);
        }

        $trustedProxyIps = getenv('TAXA_PROXY_TRUSTED_PROXY_IPS');
        if ($trustedProxyIps !== false && trim($trustedProxyIps) !== '') {
            $values['network']['trusted_proxy_ips'] = self::commaList($trustedProxyIps);
        }

        $trustProxy = getenv('TAXA_PROXY_TRUST_PROXY_HEADERS');
        if ($trustProxy !== false && trim($trustProxy) !== '') {
            $parsed = filter_var($trustProxy, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($parsed === null) {
                throw new RuntimeException('TAXA_PROXY_TRUST_PROXY_HEADERS skal være true eller false.');
            }
            $values['network']['trust_proxy_headers'] = $parsed;
        }
    }

    /** @param array<string, mixed> $values @param list<string> $path */
    private static function setEnvString(array &$values, string $environmentName, array $path): void
    {
        $environmentValue = getenv($environmentName);
        if ($environmentValue === false || trim($environmentValue) === '') {
            return;
        }

        $target =& $values;
        foreach ($path as $segment) {
            $target =& $target[$segment];
        }
        $target = trim($environmentValue);
    }

    /** @return list<string> */
    private static function commaList(string $value): array
    {
        return array_values(array_filter(array_map(
            static fn (string $item): string => trim($item),
            explode(',', $value),
        ), static fn (string $item): bool => $item !== ''));
    }

    /** @param array<string, mixed> $values */
    private static function validate(array $values): void
    {
        $baseUrl = (string) ($values['tmdb']['base_url'] ?? '');
        if (!str_starts_with($baseUrl, 'https://')) {
            throw new RuntimeException('TMDB base URL skal bruge HTTPS.');
        }

        $databasePath = (string) ($values['storage']['database_path'] ?? '');
        if ($databasePath === '' || !str_starts_with($databasePath, '/')) {
            throw new RuntimeException('SQLite-stien skal være en absolut sti.');
        }

        $origins = $values['cors']['allowed_origins'] ?? [];
        if (!is_array($origins) || $origins === []) {
            throw new RuntimeException('Mindst én CORS-origin skal være tilladt.');
        }

        foreach ($origins as $origin) {
            if (!is_string($origin) || !preg_match('#^https?://[^/]+$#', $origin)) {
                throw new RuntimeException(sprintf('Ugyldig CORS-origin: %s', (string) $origin));
            }
        }
    }
}
