/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["*.app.halaalvest.localhost"],
  transpilePackages: [
    "@halaalvest/api",
    "@halaalvest/auth",
    "@halaalvest/db",
    "@halaalvest/domain",
    "@halaalvest/notifications",
    "@halaalvest/notifications-react",
    "@halaalvest/site-nav",
    "@halaalvest/ui",
    "@halaalvest/utils",
  ],
}

export default nextConfig
