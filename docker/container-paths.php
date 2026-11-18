<?php

declare(strict_types=1);

/**
 * Loaded before every PHP script in the container.
 * When the image is read-only, Laravel still tries to write
 * backend/bootstrap/cache unless these paths are set in $_ENV.
 */
(static function (): void {
    $root = getenv('APP_ROOT') ?: '/var/www/rust-template';
    $defaultCache = $root.'/backend/bootstrap/cache';
    $defaultStorage = $root.'/backend/storage';

    $writable = static function (string $path): bool {
        return $path !== '' && is_dir($path) && is_writable($path);
    };

    $ensure = static function (string $path) use ($writable): bool {
        if (! is_dir($path)) {
            @mkdir($path, 0775, true);
        }

        return $writable($path);
    };

    $set = static function (string $key, string $value): void {
        putenv($key.'='.$value);
        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
    };

    $packages = getenv('APP_PACKAGES_CACHE');
    $cacheDir = is_string($packages) && $packages !== '' ? dirname($packages) : '';
    if (! $writable($defaultCache) && ! $writable($cacheDir)) {
        $picked = null;
        foreach ([
            '/home/container/storage/bootstrap/cache',
            '/tmp/rust-template-storage/bootstrap/cache',
            '/tmp/rust-template-bootstrap-cache',
        ] as $candidate) {
            if ($ensure($candidate)) {
                $picked = $candidate;
                break;
            }
        }
        if ($picked !== null) {
            $set('APP_PACKAGES_CACHE', $picked.'/packages.php');
            $set('APP_SERVICES_CACHE', $picked.'/services.php');
            $set('APP_CONFIG_CACHE', $picked.'/config.php');
            $set('APP_ROUTES_CACHE', $picked.'/routes-v7.php');
            $set('APP_EVENTS_CACHE', $picked.'/events.php');
        }
    }

    $backendDir = $root.'/backend';
    $envPath = getenv('LARAVEL_ENV_PATH');
    $envPath = is_string($envPath) ? $envPath : '';
    if (! $writable($backendDir) && ! $writable($envPath)) {
        foreach (['/home/container/backend', '/tmp/rust-template-backend'] as $candidate) {
            if ($ensure($candidate)) {
                $set('LARAVEL_ENV_PATH', $candidate);
                break;
            }
        }
    }

    $storage = getenv('LARAVEL_STORAGE_PATH');
    $storage = is_string($storage) ? $storage : '';
    if (getenv('RUST_TEMPLATE_CONTAINER') === '1') {
        // The config default used to be the database driver. With no .env loaded
        // that writes the read-only image sqlite file and every browser request 500s.
        $set('SESSION_DRIVER', 'file');
    }
    if (! $writable($defaultStorage) && ! $writable($storage)) {
        $picked = null;
        foreach (['/home/container/storage', '/tmp/rust-template-storage'] as $candidate) {
            if ($ensure($candidate)) {
                $picked = $candidate;
                break;
            }
        }
        if ($picked !== null) {
            foreach ([
                'app/public',
                'app/private',
                'app/container-secrets',
                'framework/cache/data',
                'framework/sessions',
                'framework/views',
                'logs',
                'bootstrap/cache',
            ] as $sub) {
                $ensure($picked.'/'.$sub);
            }
            $set('LARAVEL_STORAGE_PATH', $picked);
            $storage = $picked;
        }
    }

    if ($storage === '') {
        $storage = $defaultStorage;
    }
    $sessionDir = rtrim($storage, '/').'/framework/sessions';
    if (! $ensure($sessionDir)) {
        $fallback = '/tmp/rust-template-sessions';
        if ($ensure($fallback)) {
            $set('SESSION_FILES', $fallback);
        }
    }

    $keyOk = static function (string $key): bool {
        $key = trim($key);
        if (strlen($key) >= 2 && ($key[0] === '"' || $key[0] === "'") && str_ends_with($key, $key[0])) {
            $key = substr($key, 1, -1);
        }
        if (str_starts_with($key, 'base64:')) {
            $raw = base64_decode(substr($key, 7), true);

            return is_string($raw) && strlen($raw) === 32;
        }

        return strlen($key) === 32;
    };
    $currentKey = getenv('APP_KEY');
    $currentKey = is_string($currentKey) ? trim($currentKey) : '';
    $normalizedKey = $currentKey;
    if (strlen($normalizedKey) >= 2 && ($normalizedKey[0] === '"' || $normalizedKey[0] === "'") && str_ends_with($normalizedKey, $normalizedKey[0])) {
        $normalizedKey = substr($normalizedKey, 1, -1);
    }
    if ($keyOk($normalizedKey)) {
        if ($normalizedKey !== $currentKey) {
            $set('APP_KEY', $normalizedKey);
        }
    } else {
        $foundKey = '';
        foreach ([
            rtrim($storage, '/').'/app/container-secrets/app.key',
            '/home/container/storage/app/container-secrets/app.key',
            '/tmp/rust-template-storage/app/container-secrets/app.key',
        ] as $secretFile) {
            if (! is_file($secretFile)) {
                continue;
            }
            $value = trim((string) file_get_contents($secretFile));
            if ($keyOk($value)) {
                $foundKey = $value;
                break;
            }
        }
        if ($foundKey === '') {
            $foundKey = 'base64:'.base64_encode(random_bytes(32));
            foreach ([
                rtrim($storage, '/').'/app/container-secrets',
                '/home/container/storage/app/container-secrets',
                '/tmp/rust-template-storage/app/container-secrets',
            ] as $secretDir) {
                if (! is_dir($secretDir) && ! @mkdir($secretDir, 0775, true) && ! is_dir($secretDir)) {
                    continue;
                }
                if (! is_writable($secretDir)) {
                    continue;
                }
                if (@file_put_contents($secretDir.'/app.key', $foundKey."\n", LOCK_EX) !== false) {
                    break;
                }
            }
            fwrite(STDERR, "APP_KEY is missing or not a 32-byte key. Generated a new one.\n");
        }
        $set('APP_KEY', $foundKey);
    }

    if (getenv('RUST_TEMPLATE_CONTAINER') === '1') {
        $dbHost = getenv('DB_HOST');
        $hasDatabase = (is_string($dbHost) && trim($dbHost) !== '')
            || is_file(rtrim($storage, '/').'/app/database.json');
        if (! $hasDatabase) {
            $set('CACHE_STORE', 'file');
            $set('QUEUE_CONNECTION', 'sync');
            $configCaches = [
                getenv('APP_CONFIG_CACHE') ?: '',
                $defaultCache.'/config.php',
                rtrim($storage, '/').'/bootstrap/cache/config.php',
            ];
            foreach ($configCaches as $configCache) {
                if ($configCache !== '' && is_file($configCache)) {
                    @unlink($configCache);
                }
            }
        }
    }
})();
