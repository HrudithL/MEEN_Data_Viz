/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ynixhdmlagfgunwnyvxn.supabase.co',
      },
    ],
  },
  webpack: (config) => {
    // Three.js needs this for proper tree-shaking
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    }
    return config
  },
  // Allow large file uploads from client (no server body limit concern since we use signed URLs)
  experimental: {
    serverActions: {
      bodySizeLimit: '1mb',
    },
  },
}

export default nextConfig
