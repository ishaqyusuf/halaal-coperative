import { headers } from "next/headers"
import {
  getTenantInitialMigrationState,
  verifyMemberOnboardingRequest,
} from "@halaalvest/db"
import { buildTenantHref } from "@halaalvest/tenant-url"
import { resolveTenantUrlContextFromHeaders } from "@halaalvest/tenant-url/next/server"
import { verifyMemberOnboardingVerificationToken } from "@/lib/member-onboarding-token"
import { getDashboardServerContext } from "@/lib/server-context"
import { getDashboardTenantUrlConfig } from "@/utils/tenant-url-config"

export default async function MemberSignupVerificationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const headerStore = await headers()
  const tenantUrlConfig = getDashboardTenantUrlConfig()
  const tenantUrlContext = resolveTenantUrlContextFromHeaders({
    config: tenantUrlConfig,
    headers: headerStore,
  })
  const params = await searchParams
  const context = await getDashboardServerContext()
  const token = typeof params.token === "string" ? params.token : null
  const loginHref = buildTenantHref(tenantUrlContext, "/login", tenantUrlConfig)
  const signupHref = buildTenantHref(tenantUrlContext, "/signup/members", tenantUrlConfig)

  let title = "Verification required"
  let description = "We could not verify this signup link."
  let tone = "warning"

  if (!context.tenant) {
    title = "Missing cooperative host"
    description = "Open this verification link on the cooperative host where the signup started."
  } else if (!(await getTenantInitialMigrationState(context.tenant.id)).snapshot.canUseLiveFinancialWrites) {
    title = "Signup is locked"
    description =
      "This cooperative is still completing its one-time historical migration. Member signup verification will reopen after the workspace goes live."
  } else if (!token) {
    description = "The verification link is missing a token."
  } else {
    try {
      const payload = verifyMemberOnboardingVerificationToken(token)

      if (payload.tenantId !== context.tenant.id) {
        throw new Error("This verification link belongs to a different cooperative host.")
      }

      const request = await verifyMemberOnboardingRequest({
        requestId: payload.requestId,
        tenantId: payload.tenantId,
      })

      title = "Email verified"
      description =
        request.status === "pending_approval"
          ? "Your email has been confirmed. Your signup is now waiting for final cooperative approval."
          : "Your email has already been verified."
      tone = "success"
    } catch (error) {
      title = "Verification failed"
      description = error instanceof Error ? error.message : "The verification link could not be completed."
      tone = "destructive"
    }
  }

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top,_rgba(17,94,89,0.12),_transparent_28%),linear-gradient(180deg,_rgba(250,250,249,0.96)_0%,_rgba(255,255,255,1)_38%,_rgba(245,245,244,1)_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl rounded-[2rem] border border-border/70 bg-card p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Signup verification</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground">{title}</h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">{description}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground transition hover:bg-primary/80" href={loginHref}>
            {tone === "success" ? "Go to login" : "Back to login"}
          </a>
          <a className="inline-flex h-8 items-center justify-center rounded-md border border-border px-4 text-xs font-medium text-foreground transition hover:bg-input/50" href={signupHref}>
            Open signup
          </a>
        </div>
      </div>
    </main>
  )
}
