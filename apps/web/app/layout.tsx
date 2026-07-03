import "@halaalvest/ui/globals.css"
import { NotificationsProvider } from "@halaalvest/notifications-react"
import { getMarketingConfig } from "@/lib/marketing-config"
import "./readability.css"

const marketing = getMarketingConfig()
const iconName =
  process.env.NODE_ENV === "development"
    ? "halaalvest-icon-dev"
    : "halaalvest-icon"
const iconUrl = `/brand/${iconName}.svg`
const iconDarkUrl = `/brand/${iconName}-dark.svg`

export const metadata = {
  title: !marketing.showHomePage
    ? "halaalvest | Signup"
    : marketing.isLaunchReady
      ? "halaalvest"
      : "halaalvest | Pre-Launch",
  description: !marketing.showHomePage
    ? "Public signup entry for halaalvest, the interest-free cooperative operations platform."
    : marketing.isLaunchReady
      ? "Launch marketing site for halaalvest, the interest-free cooperative operations platform."
      : "Pre-launch landing page for halaalvest. Join early access before the cooperative platform goes live.",
  icons: {
    icon: [
      {
        url: iconUrl,
        type: "image/svg+xml",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: iconDarkUrl,
        type: "image/svg+xml",
        media: "(prefers-color-scheme: dark)",
      },
    ],
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
