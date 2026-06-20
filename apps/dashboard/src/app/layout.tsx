import "@halaalvest/ui/globals.css"
import { NotificationsProvider } from "@halaalvest/notifications-react"
import { NuqsAdapter } from "nuqs/adapters/next/app"
import { ThemeProvider } from "@/components/theme-provider"

export const metadata = {
  title: "Cooperative SaaS Dashboard",
  description:
    "Tenant dashboard for halaalvest, covering members, contributions, loans, charges, and operations.",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="font-sans antialiased">
      <body>
        <NuqsAdapter>
          <ThemeProvider>
            <NotificationsProvider>{children}</NotificationsProvider>
          </ThemeProvider>
        </NuqsAdapter>
      </body>
    </html>
  )
}
