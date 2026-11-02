<?php

declare(strict_types=1);

namespace TaxaProxy;

final class ReferenceDefinition
{
    public function __construct(
        public readonly string $slug,
        public readonly int $tmdbId,
        public readonly string $name,
        public readonly string $language,
        public readonly bool $includeSpecials,
    ) {
    }
}
