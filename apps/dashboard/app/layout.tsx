import "@halaal-vest/ui/globals.css"
import { NotificationsProvider } from "@halaal-vest/notifications-react"
import { ThemeProvider } from "@/components/theme-provider"

export const metadata = {
  title: "Cooperative SaaS Dashboard",
  description:
    "Tenant dashboard for halaal-vest, covering members, contributions, loans, charges, and operations.",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="font-sans antialiased">
      <body>
        <ThemeProvider>
          <NotificationsProvider>
            {children}
          </NotificationsProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
