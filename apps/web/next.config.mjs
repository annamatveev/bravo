/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The shared types package is consumed as TypeScript source.
  transpilePackages: ["@context-studio/types"],
};

export default nextConfig;
