/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: `http://localhost:8080/:path*`,
      },
    ];
  },
};

export default nextConfig;
