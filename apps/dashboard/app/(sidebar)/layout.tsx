import { normalizeRole } from "@halaal-vest/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { DashboardShellClient } from "@/components/dashboard-shell-client"
import { normalizeDashboardRedirectPath } from "@/lib/auth-redirect"
import { getDashboardServerContext } from "@/lib/server-context"

export default async function SidebarLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const headerStore = await headers()
  const context = await getDashboardServerContext()
  const nextPath = normalizeDashboardRedirectPath(headerStore.get("x-pathname"))

  if (!context.auth.sessionToken || !context.auth.user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`)
  }

  const role = normalizeRole(context.auth.membership?.role ?? null)
  const tenantName = context.tenant?.name ?? "Platform Demo Workspace"
  const userId = context.auth.user?.id ?? null
  const userName = context.auth.user?.fullName ?? "Anonymous Workspace User"

  return (
    <DashboardShellClient role={role} tenantName={tenantName} userId={userId} userName={userName}>
      {children}
    </DashboardShellClient>
  )
}
