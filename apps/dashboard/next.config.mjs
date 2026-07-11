/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    "*.halaalvest.localhost",
    "*.halaalvest-dash.localhost",
    // "ibadan-reliable-small-business-savings.halaalvest-dash.localhost",
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
