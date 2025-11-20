/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  env: {
    API_URL: process.env.API_URL || 'http://localhost:3001/api',
  },
};

module.exports = nextConfig;
