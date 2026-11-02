<?php

declare(strict_types=1);

namespace TaxaProxy;

use RuntimeException;

final class ReferenceCatalog
{
    public function __construct(private readonly Config $config)
    {
    }

    /** @return list<ReferenceDefinition> */
    public function all(): array
    {
        $definitions = [];
        foreach ($this->config->array('references') as $slug => $raw) {
            if (!is_string($slug) || !preg_match('/^[a-z0-9-]+$/', $slug) || !is_array($raw)) {
                continue;
            }
            $definitions[] = $this->fromConfig($slug, $raw);
        }
        return $definitions;
    }

    public function get(string $slug): ReferenceDefinition
    {
        $references = $this->config->array('references');
        $raw = $references[$slug] ?? null;
        if (!is_array($raw)) {
            throw new RuntimeException(sprintf('Ukendt referenceserie: %s', $slug));
        }
        return $this->fromConfig($slug, $raw);
    }

    /** @param array<string, mixed> $raw */
    private function fromConfig(string $slug, array $raw): ReferenceDefinition
    {
        $tmdbId = (int) ($raw['tmdb_id'] ?? 0);
        $name = trim((string) ($raw['name'] ?? ''));
        $language = trim((string) ($raw['language'] ?? 'da-DK'));
        $includeSpecials = (bool) ($raw['include_specials'] ?? true);

        if ($tmdbId < 1 || $name === '' || !preg_match('/^[a-z]{2}(?:-[A-Z]{2})?$/', $language)) {
            throw new RuntimeException(sprintf('Ugyldig referenceserie-konfiguration: %s', $slug));
        }

        return new ReferenceDefinition($slug, $tmdbId, $name, $language, $includeSpecials);
    }
}
