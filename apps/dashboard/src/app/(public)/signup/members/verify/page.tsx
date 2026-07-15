import { headers } from "next/headers"
import {
  getTenantInitialMigrationState,
  verifyMemberOnboardingRequest,
} from "@halaalvest/db"
import { buildTenantHref } from "@halaalvest/tenant-url"
import { resolveTenantUrlContextFromHeaders } from "@halaalvest/tenant-url/next/server"
import { buttonVariants } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import { PublicAuthShell } from "@/components/public-auth-shell"
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
    <PublicAuthShell
      badge="Signup verification"
      description="Confirm your email address before cooperative staff complete the membership approval."
      title={title}
    >
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Signup verification
        </p>
        <h2 className="mt-2 text-2xl leading-tight font-semibold text-foreground">
          {title}
        </h2>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          {description}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            className={cn(buttonVariants({ size: "lg" }), "flex-1")}
            href={loginHref}
          >
            {tone === "success" ? "Go to login" : "Back to login"}
          </a>
          <a
            className={cn(
              buttonVariants({ size: "lg", variant: "outline" }),
              "flex-1"
            )}
            href={signupHref}
          >
            Open signup
          </a>
        </div>
      </div>
    </PublicAuthShell>
  )
}
