import "@halaal-vest/ui/globals.css"
import { NotificationsProvider } from "@halaal-vest/notifications-react"
import { getMarketingConfig } from "@/lib/marketing-config"

const marketing = getMarketingConfig()

export const metadata = {
  title: marketing.isLaunchReady ? "halaal-vest" : "halaal-vest | Pre-Launch",
  description: marketing.isLaunchReady
    ? "Launch marketing site for halaal-vest, the multi-tenant halal cooperative operations platform."
    : "Pre-launch landing page for halaal-vest. Join early access before the cooperative platform goes live.",
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
