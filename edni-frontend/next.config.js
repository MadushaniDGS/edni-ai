/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow images from common academic/avatar domains
  images: {
    domains: [
      "avatars.githubusercontent.com",
      "lh3.googleusercontent.com",
    ],
  },

  // Strict mode for better dev experience
  reactStrictMode: true,
};

module.exports = nextConfig;