<?php

declare(strict_types=1);

namespace TaxaProxy;

use RuntimeException;

final class ReferenceSnapshotStore
{
    public function __construct(private readonly string $directory)
    {
    }

    public function path(string $slug): string
    {
        if (!preg_match('/^[a-z0-9-]+$/', $slug)) {
            throw new RuntimeException('Ugyldigt reference-slug.');
        }
        return rtrim($this->directory, '/') . '/' . $slug . '.json';
    }

    /** @param array<string, mixed> $snapshot */
    public function write(string $slug, array $snapshot): string
    {
        if (!is_dir($this->directory) && !mkdir($this->directory, 0775, true) && !is_dir($this->directory)) {
            throw new RuntimeException('Kunne ikke oprette snapshot-mappen.');
        }

        $json = json_encode(
            $snapshot,
            JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR,
        ) . "\n";
        $path = $this->path($slug);
        $temporary = $path . '.tmp-' . bin2hex(random_bytes(6));
        if (file_put_contents($temporary, $json, LOCK_EX) === false) {
            throw new RuntimeException('Kunne ikke skrive midlertidigt reference-snapshot.');
        }
        @chmod($temporary, 0664);
        if (!rename($temporary, $path)) {
            @unlink($temporary);
            throw new RuntimeException('Kunne ikke publicere reference-snapshot atomisk.');
        }
        return $path;
    }

    public function read(string $slug): ?ReferenceSnapshot
    {
        $path = $this->path($slug);
        if (!is_file($path)) {
            return null;
        }
        $body = file_get_contents($path);
        if ($body === false) {
            throw new RuntimeException('Kunne ikke læse reference-snapshot.');
        }
        return new ReferenceSnapshot($body, '"' . hash('sha256', $body) . '"', (int) filemtime($path));
    }
}
