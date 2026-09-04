<?php

declare(strict_types=1);

namespace TaxaProxy;

use PDO;
use PDOException;
use RuntimeException;

final class CacheEntry
{
    public function __construct(
        public readonly string $key,
        public readonly string $body,
        public readonly int $status,
        public readonly int $fetchedAt,
        public readonly int $expiresAt,
        public readonly int $staleUntil,
    ) {
    }

    public function isFresh(int $now): bool
    {
        return $this->expiresAt > $now;
    }

    public function canServeStale(int $now): bool
    {
        return $this->staleUntil > $now;
    }

    public function age(int $now): int
    {
        return max(0, $now - $this->fetchedAt);
    }
}

final class CacheStore
{
    private PDO $pdo;

    public function __construct(string $databasePath)
    {
        if (!extension_loaded('pdo_sqlite')) {
            throw new RuntimeException('PHP-udvidelsen pdo_sqlite er ikke aktiveret.');
        }

        $directory = dirname($databasePath);
        if (!is_dir($directory) && !mkdir($directory, 0770, true) && !is_dir($directory)) {
            throw new RuntimeException('Kunne ikke oprette SQLite-mappen.');
        }

        $this->pdo = new PDO('sqlite:' . $databasePath, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        $this->pdo->exec('PRAGMA journal_mode = WAL');
        $this->pdo->exec('PRAGMA synchronous = NORMAL');
        $this->pdo->exec('PRAGMA busy_timeout = 5000');
        $this->createSchema();
    }

    public function pdo(): PDO
    {
        return $this->pdo;
    }

    public function ping(): bool
    {
        return (int) $this->pdo->query('SELECT 1')->fetchColumn() === 1;
    }

    public function get(string $key): ?CacheEntry
    {
        $statement = $this->pdo->prepare(
            'SELECT cache_key, body, status, fetched_at, expires_at, stale_until
             FROM cache_entries
             WHERE cache_key = :cache_key',
        );
        $statement->execute(['cache_key' => $key]);
        $row = $statement->fetch();

        if (!is_array($row)) {
            return null;
        }

        return new CacheEntry(
            (string) $row['cache_key'],
            (string) $row['body'],
            (int) $row['status'],
            (int) $row['fetched_at'],
            (int) $row['expires_at'],
            (int) $row['stale_until'],
        );
    }

    public function put(
        string $key,
        string $body,
        int $status,
        int $fetchedAt,
        int $expiresAt,
        int $staleUntil,
    ): void {
        $statement = $this->pdo->prepare(
            'INSERT INTO cache_entries (
                cache_key, body, status, fetched_at, expires_at, stale_until
             ) VALUES (
                :cache_key, :body, :status, :fetched_at, :expires_at, :stale_until
             )
             ON CONFLICT(cache_key) DO UPDATE SET
                body = excluded.body,
                status = excluded.status,
                fetched_at = excluded.fetched_at,
                expires_at = excluded.expires_at,
                stale_until = excluded.stale_until',
        );
        $statement->execute([
            'cache_key' => $key,
            'body' => $body,
            'status' => $status,
            'fetched_at' => $fetchedAt,
            'expires_at' => $expiresAt,
            'stale_until' => $staleUntil,
        ]);
    }

    public function prune(int $now): int
    {
        $statement = $this->pdo->prepare(
            'DELETE FROM cache_entries WHERE stale_until <= :now',
        );
        $statement->execute(['now' => $now]);
        return $statement->rowCount();
    }

    private function createSchema(): void
    {
        try {
            $this->pdo->exec(
                'CREATE TABLE IF NOT EXISTS cache_entries (
                    cache_key TEXT PRIMARY KEY,
                    body TEXT NOT NULL,
                    status INTEGER NOT NULL,
                    fetched_at INTEGER NOT NULL,
                    expires_at INTEGER NOT NULL,
                    stale_until INTEGER NOT NULL
                )',
            );
            $this->pdo->exec(
                'CREATE INDEX IF NOT EXISTS cache_entries_stale_until
                 ON cache_entries (stale_until)',
            );
            $this->pdo->exec(
                'CREATE TABLE IF NOT EXISTS rate_buckets (
                    bucket_key TEXT PRIMARY KEY,
                    tokens REAL NOT NULL,
                    updated_at REAL NOT NULL
                )',
            );
            $this->pdo->exec(
                'CREATE INDEX IF NOT EXISTS rate_buckets_updated_at
                 ON rate_buckets (updated_at)',
            );
        } catch (PDOException $exception) {
            throw new RuntimeException('Kunne ikke initialisere SQLite-databasen.', 0, $exception);
        }
    }
}
