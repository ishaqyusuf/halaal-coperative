import "@halaalvest/ui/globals.css"
import { NotificationsProvider } from "@halaalvest/notifications-react"
import { getMarketingConfig } from "@/lib/marketing-config"

const marketing = getMarketingConfig()
const iconUrl =
  process.env.NODE_ENV === "development"
    ? "/brand/halaalvest-icon-dev.svg"
    : "/brand/halaalvest-icon.svg"

export const metadata = {
  title: !marketing.showHomePage
    ? "halaalvest | Signup"
    : marketing.isLaunchReady
      ? "halaalvest"
      : "halaalvest | Pre-Launch",
  description: !marketing.showHomePage
    ? "Public signup entry for halaalvest, the multi-tenant halal cooperative operations platform."
    : marketing.isLaunchReady
      ? "Launch marketing site for halaalvest, the multi-tenant halal cooperative operations platform."
      : "Pre-launch landing page for halaalvest. Join early access before the cooperative platform goes live.",
  icons: {
    icon: [{ url: iconUrl, type: "image/svg+xml" }],
    shortcut: [{ url: iconUrl, type: "image/svg+xml" }],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="font-sans antialiased">
      <body>
        <NotificationsProvider>{children}</NotificationsProvider>
      </body>
    </html>
  )
}
