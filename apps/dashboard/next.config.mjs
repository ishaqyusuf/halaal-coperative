/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@amanah/api",
    "@amanah/auth",
    "@amanah/domain",
    "@amanah/notifications",
    "@amanah/notifications-react",
    "@amanah/ui",
    "@amanah/utils",
  ],
}

export default nextConfig
