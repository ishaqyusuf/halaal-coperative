/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    "*.halaalvest.localhost",
    "*.halaalvest-dash.localhost",
    "ibadan-heritage-artisans-mutual-aid.halaalvest.localhost",
  ],
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
