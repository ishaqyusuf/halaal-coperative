import { headers } from "next/headers"
import { verifyMemberOnboardingRequest } from "@halaalvest/db"
import { buildTenantHref } from "@halaalvest/tenant-url"
import { resolveTenantUrlContextFromHeaders } from "@halaalvest/tenant-url/next/server"
import { buttonVariants } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import { PublicAuthNotice } from "@/components/public-auth-notice"
import { PublicAuthShell } from "@/components/public-auth-shell"
import { verifyMemberOnboardingVerificationToken } from "@/lib/member-onboarding-token"
import { getDashboardServerContext } from "@/lib/server-context"
import { getRequestMigrationGateState } from "@/lib/setup-gate"
import { getDashboardTenantUrlConfig } from "@/utils/tenant-url-config"

type VerifyOutcome = "closed" | "failed" | "no-tenant" | "verified"

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
  const tenant = context.tenant
  const token = typeof params.token === "string" ? params.token : null
  const loginHref = buildTenantHref(tenantUrlContext, "/login", tenantUrlConfig)
  let outcome: VerifyOutcome = "failed"

  if (!tenant) {
    outcome = "no-tenant"
  } else if (
    !(await getRequestMigrationGateState(tenant.id)).writeAccess
      .canUseLiveFinancialWrites
  ) {
    outcome = "closed"
  } else if (token) {
    // The emailed link is the confirmation: a signed, single-request token
    // whose second visit is a no-op, so this one GET write is deliberate.
    try {
      const payload = verifyMemberOnboardingVerificationToken(token)

      if (payload.tenantId === tenant.id) {
        await verifyMemberOnboardingRequest({
          requestId: payload.requestId,
          tenantId: payload.tenantId,
        })
        outcome = "verified"
      }
    } catch {
      outcome = "failed"
    }
  }

  const tenantName = tenant?.name ?? "Your cooperative"

  return (
    <PublicAuthShell
      cooperativeName={tenant?.name}
      title={
        outcome === "verified" ? "Email confirmed" : "This link did not work"
      }
    >
      <div className="grid gap-6">
        {outcome === "verified" ? (
          <PublicAuthNotice tone="success">
            {tenantName} will now review your request. We will email you when
            you can sign in.
          </PublicAuthNotice>
        ) : outcome === "closed" ? (
          <PublicAuthNotice title="Joining opens soon">
            {tenantName} is still getting ready. Please try again later.
          </PublicAuthNotice>
        ) : outcome === "no-tenant" ? (
          <PublicAuthNotice>
            Open the link from your email on your cooperative&apos;s page.
          </PublicAuthNotice>
        ) : (
          <PublicAuthNotice tone="error">
            The link may be old or already used. Sign in and we will send you a
            new one.
          </PublicAuthNotice>
        )}

        <a
          className={cn(buttonVariants({ size: "lg" }), "w-full")}
          href={loginHref}
        >
          Go to sign in
        </a>
      </div>
    </PublicAuthShell>
  )
}
