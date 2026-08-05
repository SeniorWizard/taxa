<?php

declare(strict_types=1);

namespace TaxaProxy;

final class Request
{
    /**
     * @param array<string, mixed> $query
     * @param array<string, string> $headers
     */
    public function __construct(
        public readonly string $method,
        public readonly string $route,
        public readonly array $query,
        public readonly array $headers,
        public readonly string $remoteAddress,
    ) {
    }

    public static function fromGlobals(): self
    {
        $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        $query = is_array($_GET) ? $_GET : [];
        $headers = self::readHeaders();
        $remoteAddress = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');

        return new self(
            $method,
            self::resolveRoute($query),
            $query,
            $headers,
            $remoteAddress,
        );
    }

    public function header(string $name): ?string
    {
        return $this->headers[strtolower($name)] ?? null;
    }

    /** @return array<string, string> */
    private static function readHeaders(): array
    {
        $headers = [];

        if (function_exists('getallheaders')) {
            $rawHeaders = getallheaders();
            if (is_array($rawHeaders)) {
                foreach ($rawHeaders as $name => $value) {
                    if (is_string($name) && is_scalar($value)) {
                        $headers[strtolower($name)] = trim((string) $value);
                    }
                }
            }
        }

        foreach ($_SERVER as $key => $value) {
            if (!is_string($key) || !is_scalar($value)) {
                continue;
            }

            if (str_starts_with($key, 'HTTP_')) {
                $name = strtolower(str_replace('_', '-', substr($key, 5)));
                $headers[$name] = trim((string) $value);
            }
        }

        if (isset($_SERVER['CONTENT_TYPE'])) {
            $headers['content-type'] = trim((string) $_SERVER['CONTENT_TYPE']);
        }

        return $headers;
    }

    /** @param array<string, mixed> $query */
    private static function resolveRoute(array $query): string
    {
        if (isset($query['route']) && is_scalar($query['route'])) {
            return self::normalizeRoute((string) $query['route']);
        }

        $pathInfo = (string) ($_SERVER['PATH_INFO'] ?? '');
        if ($pathInfo !== '') {
            return self::normalizeRoute($pathInfo);
        }

        $requestPath = (string) parse_url(
            (string) ($_SERVER['REQUEST_URI'] ?? '/'),
            PHP_URL_PATH,
        );
        $scriptName = (string) ($_SERVER['SCRIPT_NAME'] ?? '/index.php');

        if ($scriptName !== '' && str_starts_with($requestPath, $scriptName)) {
            $requestPath = substr($requestPath, strlen($scriptName));
        } else {
            $scriptDirectory = rtrim(str_replace('\\', '/', dirname($scriptName)), '/');
            if ($scriptDirectory !== '' && $scriptDirectory !== '.' && str_starts_with($requestPath, $scriptDirectory)) {
                $requestPath = substr($requestPath, strlen($scriptDirectory));
            }
        }

        return self::normalizeRoute($requestPath);
    }

    private static function normalizeRoute(string $route): string
    {
        $route = trim($route);
        $route = preg_replace('#/+#', '/', $route) ?? $route;
        return trim($route, '/');
    }
}
