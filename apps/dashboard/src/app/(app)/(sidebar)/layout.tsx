import { normalizeRole } from "@halaalvest/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { DashboardShellClient } from "@/components/dashboard"
import { normalizeDashboardRedirectPath } from "@/lib/auth-redirect"
import { canAccessDashboardPath } from "@/lib/navigation/lib"
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

  if (!context.auth.membership && context.auth.pendingMemberOnboarding) {
    redirect("/awaiting-approval")
  }

  if (!context.auth.membership && !context.auth.user?.isPlatformOwner) {
    redirect(
      `/login?next=${encodeURIComponent(nextPath)}&error=invalid-account`
    )
  }

  const role = normalizeRole(context.auth.membership?.role ?? null)

  if (!canAccessDashboardPath(nextPath, role)) {
    redirect("/")
  }

  const tenantName = context.tenant?.name ?? "Platform Demo Workspace"
  const userName = context.auth.user?.fullName ?? "Anonymous Workspace User"

  return (
    <DashboardShellClient
      role={role}
      tenantName={tenantName}
      userName={userName}
    >
      {children}
    </DashboardShellClient>
  )
}
