<?php

declare(strict_types=1);

namespace TaxaProxy;

final class Cors
{
    /** @return array<string, string> */
    public static function headers(Request $request, Config $config): array
    {
        $headers = [
            'Vary' => 'Origin',
            'Access-Control-Allow-Methods' => 'GET, OPTIONS',
            'Access-Control-Allow-Headers' => 'Accept, Content-Type, X-Taxa-Client-ID',
            'Access-Control-Max-Age' => '86400',
        ];

        $origin = $request->header('origin');
        if ($origin === null || $origin === '') {
            return $headers;
        }

        if (!in_array($origin, $config->stringList('cors.allowed_origins'), true)) {
            throw new HttpException(403, 'Denne origin har ikke adgang til proxyen.');
        }

        $headers['Access-Control-Allow-Origin'] = $origin;
        return $headers;
    }
}
