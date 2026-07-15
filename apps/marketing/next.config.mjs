/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["*.halaalvest.localhost", "*.halaalvest-dash.localhost"],
  transpilePackages: [
    "@halaalvest/db",
    "@halaalvest/domain",
    "@halaalvest/notifications",
    "@halaalvest/notifications-react",
    "@halaalvest/ui",
    "@halaalvest/utils",
  ],
}

export default nextConfig
