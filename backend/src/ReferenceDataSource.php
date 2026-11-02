<?php

declare(strict_types=1);

namespace TaxaProxy;

interface ReferenceDataSource
{
    /** @param array<string, scalar> $parameters @return array<string, mixed> */
    public function get(string $path, array $parameters, bool $force = false): array;
}
