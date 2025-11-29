/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.externals.push('pino-pretty', 'lokijs', 'encoding');
    }
    return config;
  },
};

module.exports = nextConfig;
