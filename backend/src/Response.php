<?php

declare(strict_types=1);

namespace TaxaProxy;

final class Response
{
    /** @param array<string, string> $headers */
    public function __construct(
        public readonly int $status,
        public readonly string $body,
        public readonly array $headers = [],
    ) {
    }

    /** @param array<string, mixed> $data @param array<string, string> $headers */
    public static function json(array $data, int $status = 200, array $headers = []): self
    {
        $body = json_encode(
            $data,
            JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR,
        );

        return new self($status, $body, $headers);
    }

    /** @param array<string, string> $headers */
    public static function rawJson(string $body, int $status = 200, array $headers = []): self
    {
        return new self($status, $body, $headers);
    }

    /** @param array<string, string> $additionalHeaders */
    public function send(array $additionalHeaders = []): never
    {
        http_response_code($this->status);
        header('Content-Type: application/json; charset=utf-8');

        foreach (array_merge($this->headers, $additionalHeaders) as $name => $value) {
            header($name . ': ' . $value);
        }

        echo $this->body;
        exit;
    }
}
