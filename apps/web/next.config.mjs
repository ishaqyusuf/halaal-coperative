/** @type {import('next').NextConfig} */
const nextConfig = {
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
