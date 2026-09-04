<?php

declare(strict_types=1);

namespace TaxaProxy;

use JsonException;

final class UpstreamResponse
{
    /** @param array<string, string> $headers */
    public function __construct(
        public readonly int $status,
        public readonly string $body,
        public readonly array $headers = [],
    ) {
    }

    public function retryAfterSeconds(): ?int
    {
        $value = $this->headers['retry-after'] ?? null;
        if ($value === null || !ctype_digit($value)) {
            return null;
        }
        return max(1, (int) $value);
    }
}

final class TmdbClient
{
    public function __construct(private readonly Config $config)
    {
    }

    /** @param array<string, scalar> $parameters */
    public function get(string $path, array $parameters): UpstreamResponse
    {
        if (!$this->config->hasTmdbCredentials()) {
            throw new HttpException(503, 'Proxyens TMDB-legitimationsoplysninger mangler.');
        }

        $url = $this->buildUrl($path, $parameters);
        $headers = [
            'Accept: application/json',
            'User-Agent: ' . $this->config->string('tmdb.user_agent'),
        ];

        $bearerToken = $this->bearerToken();
        if ($bearerToken !== '') {
            $headers[] = 'Authorization: Bearer ' . $bearerToken;
        }

        if (function_exists('curl_init')) {
            return $this->requestWithCurl($url, $headers);
        }

        return $this->requestWithStreams($url, $headers);
    }

    /** @param array<string, scalar> $parameters */
    private function buildUrl(string $path, array $parameters): string
    {
        if (!str_starts_with($path, '/')) {
            throw new \InvalidArgumentException('TMDB-stien skal begynde med /.');
        }

        $bearerToken = $this->bearerToken();
        $apiKey = trim($this->config->string('tmdb.api_key'));
        if ($bearerToken === '' && $apiKey !== '') {
            $parameters['api_key'] = $apiKey;
        }

        $query = http_build_query($parameters, '', '&', PHP_QUERY_RFC3986);
        $url = rtrim($this->config->string('tmdb.base_url'), '/') . $path;
        return $query === '' ? $url : $url . '?' . $query;
    }

    private function bearerToken(): string
    {
        $token = trim($this->config->string('tmdb.bearer_token'));
        if (str_starts_with(strtolower($token), 'bearer ')) {
            return trim(substr($token, 7));
        }
        return $token;
    }

    /** @param list<string> $headers */
    private function requestWithCurl(string $url, array $headers): UpstreamResponse
    {
        $responseHeaders = [];
        $body = '';
        $maximumBytes = $this->config->integer('tmdb.maximum_response_bytes');

        $handle = curl_init($url);
        if ($handle === false) {
            throw new HttpException(502, 'Kunne ikke initialisere forbindelsen til TMDB.');
        }

        curl_setopt_array($handle, [
            CURLOPT_RETURNTRANSFER => false,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_CONNECTTIMEOUT => $this->config->integer('tmdb.connect_timeout_seconds'),
            CURLOPT_TIMEOUT => $this->config->integer('tmdb.timeout_seconds'),
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
            CURLOPT_HEADERFUNCTION => static function ($curl, string $line) use (&$responseHeaders): int {
                $length = strlen($line);
                $line = trim($line);
                if ($line === '' || !str_contains($line, ':')) {
                    return $length;
                }
                [$name, $value] = explode(':', $line, 2);
                $responseHeaders[strtolower(trim($name))] = trim($value);
                return $length;
            },
            CURLOPT_WRITEFUNCTION => static function ($curl, string $chunk) use (&$body, $maximumBytes): int {
                if (strlen($body) + strlen($chunk) > $maximumBytes) {
                    return 0;
                }
                $body .= $chunk;
                return strlen($chunk);
            },
        ]);

        $result = curl_exec($handle);
        $status = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
        $errorNumber = curl_errno($handle);
        $errorMessage = curl_error($handle);
        curl_close($handle);

        if ($result === false || $errorNumber !== 0) {
            $message = $errorNumber === CURLE_WRITE_ERROR && strlen($body) >= $maximumBytes
                ? 'TMDB-svaret var for stort.'
                : 'Kunne ikke kontakte TMDB.';
            throw new HttpException(502, $message, [], new \RuntimeException($errorMessage));
        }

        return $this->validateResponse($status, $body, $responseHeaders);
    }

    /** @param list<string> $headers */
    private function requestWithStreams(string $url, array $headers): UpstreamResponse
    {
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => implode("\r\n", $headers),
                'timeout' => $this->config->integer('tmdb.timeout_seconds'),
                'ignore_errors' => true,
                'follow_location' => 0,
            ],
            'ssl' => [
                'verify_peer' => true,
                'verify_peer_name' => true,
            ],
        ]);

        $body = @file_get_contents($url, false, $context);
        $rawHeaders = $http_response_header ?? [];
        if ($body === false && $rawHeaders === []) {
            throw new HttpException(502, 'Kunne ikke kontakte TMDB.');
        }

        if (strlen((string) $body) > $this->config->integer('tmdb.maximum_response_bytes')) {
            throw new HttpException(502, 'TMDB-svaret var for stort.');
        }

        $status = 0;
        $responseHeaders = [];
        foreach ($rawHeaders as $line) {
            if (preg_match('#^HTTP/\S+\s+(\d{3})#', $line, $matches)) {
                $status = (int) $matches[1];
                continue;
            }
            if (str_contains($line, ':')) {
                [$name, $value] = explode(':', $line, 2);
                $responseHeaders[strtolower(trim($name))] = trim($value);
            }
        }

        return $this->validateResponse($status, (string) $body, $responseHeaders);
    }

    /** @param array<string, string> $headers */
    private function validateResponse(int $status, string $body, array $headers): UpstreamResponse
    {
        if ($status < 100) {
            throw new HttpException(502, 'TMDB returnerede ikke en gyldig HTTP-status.');
        }

        try {
            json_decode($body, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new HttpException(502, 'TMDB returnerede ugyldig JSON.', [], $exception);
        }

        return new UpstreamResponse($status, $body, $headers);
    }
}
