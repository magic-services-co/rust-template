<?php

declare(strict_types=1);

/**
 * Write backend/.env and frontend/.env from the container environment.
 * APP_KEY and NEXTAUTH_SECRET persist under storage so a new container
 * on the same volume keeps sessions and auth cookies.
 */

$root = getenv('APP_ROOT') ?: '/var/www/rust-template';
$backendEnv = env_destination($root.'/backend/.env', '/home/container/backend', '/tmp/rust-template-backend');
$frontendEnv = env_destination($root.'/frontend/.env', '/home/container/frontend', '/tmp/rust-template-frontend');
$storageRoot = getenv('LARAVEL_STORAGE_PATH') ?: ($root.'/backend/storage');
$secretDir = rtrim($storageRoot, '/').'/app/container-secrets';
$savedDatabase = read_saved_database(rtrim($storageRoot, '/').'/app/database.json');

$publicPort = (int) (env_raw('PORT') ?: '3000');
if ($publicPort < 1) {
    $publicPort = 3000;
}
$laravelPort = (int) (env_raw('LARAVEL_PORT') ?: '8000');
$siteUrl = normalize_site(env_raw('SITE_URL'), $publicPort);
$host = parse_url($siteUrl, PHP_URL_HOST);
if (! is_string($host) || $host === '') {
    fwrite(STDERR, "SITE_URL is not a valid URL: {$siteUrl}\n");
    exit(1);
}
$scheme = strtolower((string) parse_url($siteUrl, PHP_URL_SCHEME));
$urlPort = parse_url($siteUrl, PHP_URL_PORT);
$defaultPort = $scheme === 'https' ? 443 : 80;
$publicDomain = ($urlPort === null || (int) $urlPort === $defaultPort)
    ? $host
    : $host.':'.$urlPort;

$appKey = first_valid_app_key(
    env_raw('APP_KEY'),
    read_env_value($backendEnv, 'APP_KEY'),
    read_secret($secretDir.'/app.key'),
);
if ($appKey === '') {
    $appKey = 'base64:'.base64_encode(random_bytes(32));
    fwrite(STDERR, "APP_KEY is missing or not a 32-byte key. Generated a new one.\n");
}
write_secret($secretDir.'/app.key', $appKey);

$nextAuth = env_raw('NEXTAUTH_SECRET');
if ($nextAuth === '') {
    $nextAuth = read_env_value($frontendEnv, 'NEXTAUTH_SECRET');
}
if ($nextAuth === '') {
    $nextAuth = read_env_value($backendEnv, 'NEXTAUTH_SECRET');
}
if ($nextAuth === '') {
    $nextAuth = read_secret($secretDir.'/nextauth.secret');
}
if ($nextAuth === '') {
    $nextAuth = bin2hex(random_bytes(32));
}
write_secret($secretDir.'/nextauth.secret', $nextAuth);

$sessionDomain = 'null';
$sessionSecure = $scheme === 'https' ? 'true' : 'false';
if (! filter_var($host, FILTER_VALIDATE_IP) && ! in_array($host, ['localhost', '127.0.0.1'], true)) {
    $sessionDomain = $host;
}

$stateful = implode(',', array_unique(array_filter([
    'localhost',
    'localhost:3000',
    '127.0.0.1',
    '127.0.0.1:8000',
    '127.0.0.1:'.$laravelPort,
    '127.0.0.1:'.$publicPort,
    $host,
    $publicDomain,
])));

if ($savedDatabase !== null) {
    $dbHost = $savedDatabase['host'];
    $dbPort = $savedDatabase['port'];
    $dbName = $savedDatabase['database'];
    $dbUser = $savedDatabase['username'];
    $dbPassword = $savedDatabase['password'];
} else {
    $dbHost = env_raw('DB_HOST');
    $dbPort = env_raw('DB_PORT') !== '' ? env_raw('DB_PORT') : '3306';
    $dbName = env_raw('DB_DATABASE');
    $dbUser = env_raw('DB_USERNAME');
    $dbPassword = env_raw('DB_PASSWORD');
}
$databaseReady = $dbHost !== '' && $dbName !== '' && $dbUser !== '';

ensure_from_example($backendEnv, $root.'/backend/.env.example');
ensure_from_example($frontendEnv, $root.'/frontend/.env.example');

$appName = env_raw('APP_NAME');
if ($appName === '') {
    $appName = read_env_value($backendEnv, 'APP_NAME');
}
if ($appName === '') {
    $appName = 'Laravel';
}

overlay_env($backendEnv, [
    'APP_NAME' => $appName,
    'APP_ENV' => 'production',
    'APP_KEY' => $appKey,
    'APP_DEBUG' => 'false',
    'APP_URL' => 'http://127.0.0.1:'.$laravelPort,
    'FRONTEND_URL' => $siteUrl,
    'STORAGE_PUBLIC_URL' => $siteUrl,
    'SESSION_DRIVER' => 'file',
    'SESSION_DOMAIN' => $sessionDomain,
    'SESSION_SECURE_COOKIE' => $sessionSecure,
    'SANCTUM_STATEFUL_DOMAINS' => $stateful,
    'NEXTAUTH_SECRET' => $nextAuth,
    'LOG_CHANNEL' => 'stderr',
    'QUEUE_CONNECTION' => $databaseReady ? 'database' : 'sync',
    'CACHE_STORE' => $databaseReady ? 'database' : 'file',
    'RUST_TEMPLATE_CONTAINER' => '1',
]);

if ($databaseReady) {
    overlay_env($backendEnv, [
        'DB_CONNECTION' => 'mysql',
        'DB_HOST' => $dbHost,
        'DB_PORT' => (string) $dbPort,
        'DB_DATABASE' => $dbName,
        'DB_USERNAME' => $dbUser,
        'DB_PASSWORD' => $dbPassword,
    ]);
}

$fake = env_raw('NEXT_PUBLIC_LEADERBOARD_FAKE_DATA');
if ($fake === '') {
    $fake = 'false';
}

overlay_env($frontendEnv, [
    'NEXTAUTH_SECRET' => $nextAuth,
    'NEXTAUTH_URL' => $siteUrl,
    'NEXT_PUBLIC_DOMAIN' => $publicDomain,
    'BACKEND_URL' => 'http://127.0.0.1:'.$laravelPort,
    'NEXT_PUBLIC_LEADERBOARD_FAKE_DATA' => $fake,
]);

$processEnv = [
    'APP_KEY' => $appKey,
    'APP_URL' => 'http://127.0.0.1:'.$laravelPort,
    'FRONTEND_URL' => $siteUrl,
    'STORAGE_PUBLIC_URL' => $siteUrl,
    'NEXTAUTH_SECRET' => $nextAuth,
    'NEXTAUTH_URL' => $siteUrl,
    'NEXT_PUBLIC_DOMAIN' => $publicDomain,
    'BACKEND_URL' => 'http://127.0.0.1:'.$laravelPort,
    'NEXT_PUBLIC_LEADERBOARD_FAKE_DATA' => $fake,
    'SESSION_DRIVER' => 'file',
    'SESSION_DOMAIN' => $sessionDomain,
    'SESSION_SECURE_COOKIE' => $sessionSecure,
    'QUEUE_CONNECTION' => $databaseReady ? 'database' : 'sync',
    'CACHE_STORE' => $databaseReady ? 'database' : 'file',
];
$processEnv['DB_CONNECTION'] = 'mysql';
$processEnv['DB_HOST'] = $databaseReady ? $dbHost : '';
$processEnv['DB_PORT'] = $databaseReady ? (string) $dbPort : '3306';
$processEnv['DB_DATABASE'] = $databaseReady ? $dbName : '';
$processEnv['DB_USERNAME'] = $databaseReady ? $dbUser : '';
$processEnv['DB_PASSWORD'] = $databaseReady ? $dbPassword : '';
$backendEnvDir = dirname($backendEnv);
if ($backendEnvDir !== $root.'/backend') {
    $processEnv['LARAVEL_ENV_PATH'] = $backendEnvDir;
}
write_process_env('/tmp/rust-template.env', $processEnv);

echo "Wrote env for {$siteUrl}\n";
if ($backendEnv !== $root.'/backend/.env' || $frontendEnv !== $root.'/frontend/.env') {
    echo "Env files: {$backendEnv} and {$frontendEnv}\n";
}
if (! $databaseReady) {
    echo "No database yet. The setup wizard will ask for it.\n";
}

function env_destination(string $preferred, string $volumeDir, string $tmpDir): string
{
    $dir = dirname($preferred);
    if (is_dir($dir) && is_writable($dir)) {
        return $preferred;
    }
    foreach ([$volumeDir, $tmpDir] as $candidate) {
        if (! is_dir($candidate)) {
            @mkdir($candidate, 0775, true);
        }
        if (is_dir($candidate) && is_writable($candidate)) {
            return $candidate.'/.env';
        }
    }

    return $preferred;
}

function app_key_is_valid(string $key): bool
{
    $key = trim($key);
    if (strlen($key) >= 2 && ($key[0] === '"' || $key[0] === "'") && str_ends_with($key, $key[0])) {
        $key = substr($key, 1, -1);
    }
    if (str_starts_with($key, 'base64:')) {
        $raw = base64_decode(substr($key, 7), true);

        return is_string($raw) && strlen($raw) === 32;
    }

    return strlen($key) === 32;
}

function first_valid_app_key(string ...$candidates): string
{
    foreach ($candidates as $key) {
        $key = trim($key);
        if (strlen($key) >= 2 && ($key[0] === '"' || $key[0] === "'") && str_ends_with($key, $key[0])) {
            $key = substr($key, 1, -1);
        }
        if (app_key_is_valid($key)) {
            return $key;
        }
    }

    return '';
}

function env_raw(string $key): string
{
    $value = getenv($key);
    if ($value === false) {
        return '';
    }

    return trim($value);
}

function normalize_site(string $raw, int $publicPort): string
{
    $raw = trim($raw);
    if ($raw === '') {
        return 'http://localhost:'.$publicPort;
    }
    if (! preg_match('#^https?://#i', $raw)) {
        if (preg_match('/^(localhost|(\d+\.){3}\d+)(:\d+)?$/', $raw) === 1) {
            $raw = 'http://'.$raw;
        } else {
            $raw = 'https://'.$raw;
        }
    }

    return rtrim($raw, '/');
}

function ensure_from_example(string $path, string $example): void
{
    if (is_file($path)) {
        return;
    }
    $dir = dirname($path);
    if (! is_dir($dir) || ! is_writable($dir)) {
        return;
    }
    if (! is_file($example)) {
        @file_put_contents($path, '');

        return;
    }
    if (! @copy($example, $path)) {
        fwrite(STDERR, "Could not copy {$example} to {$path}. The process environment still has these values.\n");
    }
}

function read_env_value(string $path, string $key): string
{
    if (! is_file($path)) {
        return '';
    }
    $prefix = $key.'=';
    foreach (file($path, FILE_IGNORE_NEW_LINES) ?: [] as $line) {
        if (! str_starts_with($line, $prefix)) {
            continue;
        }
        $value = substr($line, strlen($prefix));
        $value = trim($value);
        if (strlen($value) >= 2 && $value[0] === '"' && str_ends_with($value, '"')) {
            $value = stripcslashes(substr($value, 1, -1));
        }

        return $value;
    }

    return '';
}

function read_secret(string $path): string
{
    if (is_file($path)) {
        return trim((string) file_get_contents($path));
    }
    $name = basename($path);
    foreach (secret_dirs() as $dir) {
        $candidate = $dir.'/'.$name;
        if (is_file($candidate)) {
            return trim((string) file_get_contents($candidate));
        }
    }

    return '';
}

function write_secret(string $path, string $value): void
{
    $name = basename($path);
    foreach (secret_dirs() as $dir) {
        if (! is_dir($dir) && ! @mkdir($dir, 0775, true) && ! is_dir($dir)) {
            continue;
        }
        if (! is_writable($dir)) {
            continue;
        }
        $target = $dir.'/'.$name;
        if (@file_put_contents($target, $value."\n") !== false) {
            @chmod($target, 0660);

            return;
        }
    }
    fwrite(STDERR, "Could not persist {$name}. It will be kept for this process only.\n");
}

/**
 * @return list<string>
 */
function secret_dirs(): array
{
    global $storageRoot, $root;
    $dirs = [
        rtrim((string) $storageRoot, '/').'/app/container-secrets',
        $root.'/backend/storage/app/container-secrets',
        '/home/container/storage/app/container-secrets',
        '/tmp/container-secrets',
    ];

    return array_values(array_unique(array_filter($dirs, static fn (string $dir): bool => $dir !== '/app/container-secrets')));
}

/**
 * @return array{host: string, port: string, database: string, username: string, password: string}|null
 */
function read_saved_database(string $path): ?array
{
    if (! is_file($path)) {
        return null;
    }
    $decoded = json_decode((string) file_get_contents($path), true);
    if (! is_array($decoded)) {
        return null;
    }
    $host = trim((string) ($decoded['host'] ?? ''));
    $database = trim((string) ($decoded['database'] ?? ''));
    $username = trim((string) ($decoded['username'] ?? ''));
    if ($host === '' || $database === '' || $username === '') {
        return null;
    }
    $port = (int) ($decoded['port'] ?? 3306);
    if ($port < 1 || $port > 65535) {
        $port = 3306;
    }

    return [
        'host' => $host,
        'port' => (string) $port,
        'database' => $database,
        'username' => $username,
        'password' => (string) ($decoded['password'] ?? ''),
    ];
}

/**
 * @param array<string, string> $pairs
 */
function write_process_env(string $path, array $pairs): void
{
    $lines = [];
    foreach ($pairs as $key => $value) {
        $lines[] = 'export '.$key.'='.escapeshellarg($value);
    }
    if (@file_put_contents($path, implode("\n", $lines)."\n") === false) {
        fwrite(STDERR, "Could not write {$path}\n");
    }
}

/**
 * @param array<string, string> $pairs
 */
function overlay_env(string $path, array $pairs): void
{
    $lines = is_file($path) ? (file($path, FILE_IGNORE_NEW_LINES) ?: []) : [];
    $seen = array_fill_keys(array_keys($pairs), false);
    $out = [];
    foreach ($lines as $line) {
        $replaced = false;
        foreach ($pairs as $key => $value) {
            if (str_starts_with($line, $key.'=')) {
                $out[] = format_env($key, $value);
                $seen[$key] = true;
                $replaced = true;
                break;
            }
        }
        if (! $replaced) {
            $out[] = $line;
        }
    }
    foreach ($pairs as $key => $value) {
        if (! $seen[$key]) {
            $out[] = format_env($key, $value);
        }
    }
    if (@file_put_contents($path, implode("\n", $out)."\n") === false) {
        fwrite(STDERR, "Could not write {$path}. The process environment still has these values.\n");

        return;
    }
    @chmod($path, 0664);
}

function format_env(string $key, string $value): string
{
    if (preg_match('/\A[A-Za-z0-9_.:\/-]*\z/', $value) === 1) {
        return $key.'='.$value;
    }
    $escaped = str_replace(['\\', '"', "\n", "\r"], ['\\\\', '\\"', '', ''], $value);

    return $key.'="'.$escaped.'"';
}
