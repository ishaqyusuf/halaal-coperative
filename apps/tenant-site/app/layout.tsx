import "@amanah/ui/globals.css"
import { NotificationsProvider } from "@amanah/notifications-react"

export const metadata = {
  title: "Cooperative Tenant Site",
  description:
    "Tenant-owned public website surface for cooperative marketing, onboarding, and member-facing discovery.",
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
