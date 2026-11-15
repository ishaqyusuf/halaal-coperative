import { headers } from "next/headers"
import { buildTenantHref } from "@halaalvest/tenant-url"
import { resolveTenantUrlContextFromHeaders } from "@halaalvest/tenant-url/next/server"
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import { PublicAuthNotice } from "@/components/public-auth-notice"
import { PublicAuthShell } from "@/components/public-auth-shell"
import { verifyMemberOnboardingVerificationToken } from "@/lib/member-onboarding-token"
import { getDashboardServerContext } from "@/lib/server-context"
import { getRequestMigrationGateState } from "@/lib/setup-gate"
import { getDashboardTenantUrlConfig } from "@/utils/tenant-url-config"
import { confirmMemberSignupEmailAction } from "./actions"

type VerifyOutcome = "closed" | "confirm" | "failed" | "no-tenant" | "verified"

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
  // Set by the confirm action after its redirect (no token in this URL).
  const status = typeof params.status === "string" ? params.status : null
  const loginHref = buildTenantHref(tenantUrlContext, "/login", tenantUrlConfig)
  let outcome: VerifyOutcome = "failed"

  if (!tenant) {
    outcome = "no-tenant"
  } else if (
    !(await getRequestMigrationGateState(tenant.id)).writeAccess
      .canUseLiveFinancialWrites
  ) {
    outcome = "closed"
  } else if (status === "verified") {
    outcome = "verified"
  } else if (token) {
    // Opening the link only checks it; the member confirms with a button
    // (POST), so mail scanners that open links can't confirm for them.
    try {
      const payload = verifyMemberOnboardingVerificationToken(token)

      if (payload.tenantId === tenant.id) {
        outcome = "confirm"
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
        outcome === "verified"
          ? "Email confirmed"
          : outcome === "confirm"
            ? "Confirm your email"
            : "This link did not work"
      }
    >
      <div className="grid gap-6">
        {outcome === "confirm" ? (
          <form action={confirmMemberSignupEmailAction} className="grid gap-4">
            <input name="token" type="hidden" value={token ?? ""} />
            <PublicAuthNotice>
              Press the button to confirm this is your email. {tenantName} will
              then review your request.
            </PublicAuthNotice>
            <Button className="w-full" size="lg" type="submit">
              Confirm my email
            </Button>
          </form>
        ) : outcome === "verified" ? (
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

        {outcome === "confirm" ? null : (
          <a
            className={cn(buttonVariants({ size: "lg" }), "w-full")}
            href={loginHref}
          >
            Go to sign in
          </a>
        )}
      </div>
    </PublicAuthShell>
  )
}
