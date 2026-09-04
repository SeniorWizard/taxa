<?php

declare(strict_types=1);

namespace TaxaProxy;

final class Input
{
    /** @param array<string, mixed> $query @param list<string> $allowed */
    public static function enum(array $query, string $name, array $allowed): string
    {
        $value = self::string($query, $name, 1, 40);
        if (!in_array($value, $allowed, true)) {
            throw new HttpException(400, sprintf(
                'Parameteren "%s" skal være en af: %s.',
                $name,
                implode(', ', $allowed),
            ));
        }

        return $value;
    }

    /** @param array<string, mixed> $query */
    public static function string(
        array $query,
        string $name,
        int $minLength = 1,
        int $maxLength = 120,
    ): string {
        $raw = $query[$name] ?? null;
        if (!is_scalar($raw)) {
            throw new HttpException(400, sprintf('Parameteren "%s" mangler.', $name));
        }

        $value = trim((string) $raw);
        $length = function_exists('mb_strlen') ? mb_strlen($value) : strlen($value);
        if ($length < $minLength || $length > $maxLength) {
            throw new HttpException(400, sprintf(
                'Parameteren "%s" skal være mellem %d og %d tegn.',
                $name,
                $minLength,
                $maxLength,
            ));
        }

        return $value;
    }

    /** @param array<string, mixed> $query */
    public static function integer(
        array $query,
        string $name,
        int $minimum,
        int $maximum,
        ?int $default = null,
    ): int {
        $raw = $query[$name] ?? null;
        if (($raw === null || $raw === '') && $default !== null) {
            return $default;
        }

        if (!is_scalar($raw)) {
            throw new HttpException(400, sprintf('Parameteren "%s" skal være et heltal.', $name));
        }

        $value = filter_var($raw, FILTER_VALIDATE_INT);
        if ($value === false || $value < $minimum || $value > $maximum) {
            throw new HttpException(400, sprintf(
                'Parameteren "%s" skal være et heltal mellem %d og %d.',
                $name,
                $minimum,
                $maximum,
            ));
        }

        return $value;
    }

    /** @param array<string, mixed> $query */
    public static function boolean(array $query, string $name, bool $default = false): bool
    {
        $raw = $query[$name] ?? null;
        if ($raw === null || $raw === '') {
            return $default;
        }

        if (is_bool($raw)) {
            return $raw;
        }
        if (!is_scalar($raw)) {
            throw new HttpException(400, sprintf('Parameteren "%s" skal være true eller false.', $name));
        }

        $value = filter_var($raw, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        if ($value === null) {
            throw new HttpException(400, sprintf(
                'Parameteren "%s" skal være true eller false.',
                $name,
            ));
        }

        return $value;
    }

    /** @param array<string, mixed> $query */
    public static function language(array $query, string $default = 'da-DK'): string
    {
        $raw = $query['language'] ?? $default;
        if (!is_scalar($raw)) {
            throw new HttpException(400, 'Ugyldig sprogkode.');
        }

        $value = trim((string) $raw);
        if (!preg_match('/^[a-z]{2}(?:-[A-Z]{2})?$/', $value)) {
            throw new HttpException(400, 'Sprog skal have formatet da-DK eller da.');
        }

        return $value;
    }
}
