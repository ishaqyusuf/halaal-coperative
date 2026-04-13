/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@halaal-vest/api",
    "@halaal-vest/auth",
    "@halaal-vest/db",
    "@halaal-vest/domain",
    "@halaal-vest/notifications",
    "@halaal-vest/notifications-react",
    "@halaal-vest/ui",
    "@halaal-vest/utils",
  ],
}

export default nextConfig
