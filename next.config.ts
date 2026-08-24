import type { NextConfig } from "next";

const PB_URL  = 'https://pocketbase-production-e699.up.railway.app';
const PB_URL2 = 'https://storagemap-3.emergent.host';
const AUTH_URL = 'https://auth.emergentagent.com';

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
  { key: 'ngrok-skip-browser-warning', value: 'true' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://static.cloudflareinsights.com",
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.openstreetmap.org`,
      `frame-src https://www.openstreetmap.org https://challenges.cloudflare.com`,
      `connect-src 'self' ${PB_URL} ${PB_URL2} ${AUTH_URL} https://nominatim.openstreetmap.org https://challenges.cloudflare.com https://cloudflareinsights.com`,
      "media-src 'self' blob:",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/production', destination: '/tasks', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
