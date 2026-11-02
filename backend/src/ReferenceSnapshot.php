<?php

declare(strict_types=1);

namespace TaxaProxy;

final class ReferenceSnapshot
{
    public function __construct(
        public readonly string $body,
        public readonly string $etag,
        public readonly int $modifiedAt,
    ) {
    }
}
