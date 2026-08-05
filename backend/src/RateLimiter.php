<?php

declare(strict_types=1);

namespace TaxaProxy;

use PDO;
use Throwable;

final class RateLimitSpec
{
    public function __construct(
        public readonly string $key,
        public readonly float $capacity,
        public readonly float $refillPerSecond,
        public readonly float $cost = 1.0,
    ) {
    }
}

final class RateLimitDecision
{
    public function __construct(
        public readonly bool $allowed,
        public readonly int $retryAfterSeconds = 0,
    ) {
    }
}

final class RateLimiter
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    /** @param list<RateLimitSpec> $specifications */
    public function consume(array $specifications, ?float $now = null): RateLimitDecision
    {
        if ($specifications === []) {
            return new RateLimitDecision(true);
        }

        $now ??= microtime(true);
        $states = [];
        $retryAfter = 0;

        $transactionActive = false;
        $this->pdo->exec('BEGIN IMMEDIATE');
        $transactionActive = true;
        try {
            foreach ($specifications as $specification) {
                if ($specification->capacity <= 0 || $specification->refillPerSecond <= 0) {
                    throw new \InvalidArgumentException('Rate-limit-værdier skal være større end nul.');
                }

                $statement = $this->pdo->prepare(
                    'SELECT tokens, updated_at FROM rate_buckets WHERE bucket_key = :bucket_key',
                );
                $statement->execute(['bucket_key' => $specification->key]);
                $row = $statement->fetch();

                $previousTokens = is_array($row)
                    ? (float) $row['tokens']
                    : $specification->capacity;
                $previousUpdatedAt = is_array($row)
                    ? (float) $row['updated_at']
                    : $now;
                $elapsed = max(0.0, $now - $previousUpdatedAt);
                $available = min(
                    $specification->capacity,
                    $previousTokens + ($elapsed * $specification->refillPerSecond),
                );

                if ($available < $specification->cost) {
                    $missing = $specification->cost - $available;
                    $retryAfter = max(
                        $retryAfter,
                        (int) ceil($missing / $specification->refillPerSecond),
                    );
                }

                $states[] = [$specification, $available];
            }

            $allowed = $retryAfter === 0;
            foreach ($states as [$specification, $available]) {
                $tokens = $allowed
                    ? max(0.0, $available - $specification->cost)
                    : $available;
                $this->upsert($specification->key, $tokens, $now);
            }

            $this->pdo->exec('COMMIT');
            $transactionActive = false;
            return new RateLimitDecision($allowed, $retryAfter);
        } catch (Throwable $exception) {
            if ($transactionActive) {
                $this->pdo->exec('ROLLBACK');
            }
            throw $exception;
        }
    }

    public function prune(float $olderThan): int
    {
        $statement = $this->pdo->prepare(
            'DELETE FROM rate_buckets WHERE updated_at < :older_than',
        );
        $statement->execute(['older_than' => $olderThan]);
        return $statement->rowCount();
    }

    private function upsert(string $key, float $tokens, float $updatedAt): void
    {
        $statement = $this->pdo->prepare(
            'INSERT INTO rate_buckets (bucket_key, tokens, updated_at)
             VALUES (:bucket_key, :tokens, :updated_at)
             ON CONFLICT(bucket_key) DO UPDATE SET
                tokens = excluded.tokens,
                updated_at = excluded.updated_at',
        );
        $statement->execute([
            'bucket_key' => $key,
            'tokens' => $tokens,
            'updated_at' => $updatedAt,
        ]);
    }
}
