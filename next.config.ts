import type { NextConfig } from "next";

const PB_URL = 'https://pocketbase-production-e699.up.railway.app';
const AUTH_URL = 'https://auth.emergentagent.com';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'ngrok-skip-browser-warning', value: 'true' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.openstreetmap.org`,
      `frame-src https://www.openstreetmap.org`,
      `connect-src 'self' ${PB_URL} ${AUTH_URL} https://nominatim.openstreetmap.org https://api.emailjs.com`,
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
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
