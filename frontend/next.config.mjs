/** @type {import('next').NextConfig} */

const backendUrl =
    process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';
const backendHost = backendUrl ? new URL(backendUrl).hostname : '127.0.0.1';
const backendProtocol = backendUrl ? new URL(backendUrl).protocol.replace(':', '') : 'http';

function siteStoragePattern() {
    const raw = process.env.NEXT_PUBLIC_DOMAIN || process.env.FRONTEND_URL || '';
    if (!raw) return null;
    try {
        const url = new URL(raw.includes('://') ? raw : `http://${raw}`);
        const pattern = {
            protocol: url.protocol.replace(':', ''),
            hostname: url.hostname,
            pathname: '/storage/**',
        };
        if (url.port) pattern.port = url.port;
        return pattern;
    } catch {
        return null;
    }
}

const siteStorage = siteStoragePattern();

const nextConfig = {
    serverExternalPackages: ['sharp'],
    async rewrites() {
        return [
            { source: '/storage/:path*', destination: `${backendUrl}/storage/:path*` },
        ];
    },
    images: {
        remotePatterns: [
            ...(siteStorage ? [siteStorage] : []),
            {
                hostname: backendHost,
                protocol: backendProtocol,
                pathname: '/storage/**',
            },
            {
                hostname: '127.0.0.1',
                protocol: 'http',
                pathname: '/storage/**',
            },
            {
                hostname: 'localhost',
                protocol: 'http',
                pathname: '/storage/**',
            },
            {
                hostname: 'cdn.discordapp.com',
                protocol: 'https',
            },
            {
                hostname: 'imagedelivery.net',
                protocol: 'https',
            },
            {
                hostname: 'content.rustmaps.com',
                protocol: 'https',
            },
            {
                hostname: 'cdn.mrddd.xyz',
                protocol: 'https',
            },
            {
                hostname: 'avatar.iran.liara.run',
                protocol: 'https',
            },
            {
                hostname: 'avatars.steamstatic.com',
                protocol: 'https',
            },
            {
                hostname: 'www.looty.cc',
                protocol: 'https',
            },
            {
                hostname: 'synthhosting.com',
                protocol: 'https',
            },
            {
                hostname: 'pub-2f3824dd26d6443e9775afc14efa5de1.r2.dev',
                protocol: 'https',
            },
            {
                hostname: 'cdn.rusticon.co',
                protocol: 'https',
            },
            {
                hostname: 'cdn.looty.cc',
                protocol: 'https',
            },
            {
                hostname: 'rustmaps.com',
                protocol: 'https',
            },
        ],
    },
};

export default nextConfig;
