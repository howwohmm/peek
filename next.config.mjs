/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // emit a self-contained server bundle for the docker runner stage
  output: "standalone",
};

export default nextConfig;
