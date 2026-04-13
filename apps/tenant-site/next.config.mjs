/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@amanah/auth",
    "@amanah/domain",
    "@amanah/notifications-react",
    "@amanah/ui",
    "@amanah/utils",
  ],
}

export default nextConfig
