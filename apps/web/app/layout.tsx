import "@amanah/ui/globals.css"
import { NotificationsProvider } from "@amanah/notifications-react"

export const metadata = {
  title: "Cooperative SaaS Platform",
  description:
    "SaaS marketing site for a cooperative platform with separate dashboard, tenant-site, and API surfaces inspired by plot-keys.",
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
