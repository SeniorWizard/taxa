<?php

declare(strict_types=1);

namespace TaxaProxy;

final class ClientIdentity
{
    public static function hash(Request $request, Config $config): string
    {
        $ip = self::resolveIp($request, $config);
        $deviceId = trim((string) ($request->header('x-taxa-client-id') ?? ''));
        if (!preg_match('/^[A-Za-z0-9._-]{16,80}$/', $deviceId)) {
            $deviceId = 'no-device-id';
        }

        return hash('sha256', $ip . '|' . $deviceId);
    }

    private static function resolveIp(Request $request, Config $config): string
    {
        $remoteAddress = $request->remoteAddress;
        if (!$config->boolean('network.trust_proxy_headers')) {
            return $remoteAddress;
        }

        if (!in_array($remoteAddress, $config->stringList('network.trusted_proxy_ips'), true)) {
            return $remoteAddress;
        }

        $forwarded = $request->header('x-forwarded-for');
        if ($forwarded === null || $forwarded === '') {
            return $remoteAddress;
        }

        $candidate = trim(explode(',', $forwarded)[0]);
        return filter_var($candidate, FILTER_VALIDATE_IP) ? $candidate : $remoteAddress;
    }
}
