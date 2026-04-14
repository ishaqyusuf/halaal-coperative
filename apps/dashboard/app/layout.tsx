import "@halaal-vest/ui/globals.css"
import { NotificationsProvider } from "@halaal-vest/notifications-react"
import { DashboardShellClient } from "@/components/dashboard-shell-client"
import { ThemeProvider } from "@/components/theme-provider"
import { normalizeRole } from "@halaal-vest/auth"
import { getDashboardServerContext } from "@/lib/server-context"

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
  const context = await getDashboardServerContext()
  const role = normalizeRole(context.auth.membership?.role ?? null)
  const tenantName = context.tenant?.name ?? "Platform Demo Workspace"
  const userName = context.auth.user?.fullName ?? "Anonymous Workspace User"

  return (
    <html lang="en" suppressHydrationWarning className="font-sans antialiased">
      <body>
        <ThemeProvider>
          <NotificationsProvider>
            <DashboardShellClient role={role} tenantName={tenantName} userName={userName}>
              {children}
            </DashboardShellClient>
          </NotificationsProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
