<?php

declare(strict_types=1);

/**
 * Kopiér denne fil til local.php og indsæt dine egne værdier.
 * local.php er ignoreret af Git og ligger uden for public-mappen.
 */
return [
    'tmdb' => [
        // Anbefalet: TMDB API Read Access Token uden ordet "Bearer".
        'bearer_token' => '',

        // Alternativt kan en v3 API key bruges. Lad feltet være tomt ved Bearer.
        'api_key' => '',

        'user_agent' => 'TaxaOverlapProxy/1.0 (+https://git.foo.dk/taxa/)',
    ],

    'cors' => [
        // Origins indeholder kun protokol + værtsnavn, aldrig /taxa/.
        'allowed_origins' => [
            'https://git.foo.dk',
            'http://localhost:5173',
        ],
    ],

    'storage' => [
        // Brug en absolut sti i en mappe, som Web Stations http-bruger kan skrive til.
        'database_path' => dirname(__DIR__) . '/var/taxa-proxy.sqlite',
    ],

    'network' => [
        // Lad stå false, medmindre proxyen står bag en kendt reverse proxy.
        'trust_proxy_headers' => false,
        'trusted_proxy_ips' => [],
    ],
];
