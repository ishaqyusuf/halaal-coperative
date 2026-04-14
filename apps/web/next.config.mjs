/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@halaal-vest/db",
    "@halaal-vest/notifications",
    "@halaal-vest/notifications-react",
    "@halaal-vest/ui",
    "@halaal-vest/utils",
  ],
}

export default nextConfig
