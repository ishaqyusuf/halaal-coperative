import { headers } from "next/headers"
import { buildTenantHref } from "@halaalvest/tenant-url"
import { resolveTenantUrlContextFromHeaders } from "@halaalvest/tenant-url/next/server"
import { MemberSignupForm } from "@/components/onboarding/member-signup-form"
import {
  PublicAuthNotice,
  publicAuthLinkClassName,
} from "@/components/public-auth-notice"
import { PublicAuthShell } from "@/components/public-auth-shell"
import { resolveMemberSignupGate } from "@/lib/member-signup-access"
import {
  canShowQuickFill,
  getDashboardServerContext,
} from "@/lib/server-context"
import { getRequestMigrationGateState } from "@/lib/setup-gate"
import { tenantRedirect } from "@/utils/tenant-redirect"
import { getDashboardTenantUrlConfig } from "@/utils/tenant-url-config"

export default async function MemberSignupPage({
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
  const context = await getDashboardServerContext()
  const params = await searchParams
  const signupToken = typeof params.token === "string" ? params.token : null

  if (
    context.auth.sessionToken &&
    context.auth.user &&
    context.auth.pendingMemberOnboarding
  ) {
    await tenantRedirect("/awaiting-approval")
  }

  if (context.auth.sessionToken && context.auth.membership) {
    await tenantRedirect("/")
  }

  const tenant = context.tenant
  // One tenant row decides whether joining is open (not the full migration state).
  const memberSignupOpen = tenant
    ? (await getRequestMigrationGateState(tenant.id)).writeAccess
        .canUseLiveFinancialWrites
    : false
  const gate =
    tenant && memberSignupOpen
      ? await resolveMemberSignupGate({
          tenantId: tenant.id,
          token: signupToken,
        })
      : null
  const loginHref = buildTenantHref(tenantUrlContext, "/login", tenantUrlConfig)
  const canJoin = Boolean(tenant && gate?.access === "granted")

  return (
    <PublicAuthShell
      cooperativeName={tenant?.name}
      description={
        canJoin
          ? "Fill in your details. The office will check them."
          : undefined
      }
      footer={
        <p>
          Already a member?{" "}
          <a className={publicAuthLinkClassName} href={loginHref}>
            Sign in
          </a>
        </p>
      }
      title={tenant ? `Join ${tenant.name}` : "Join your cooperative"}
    >
      {!tenant ? (
        <PublicAuthNotice title="Use your cooperative's link">
          Open the joining link your cooperative gave you.
        </PublicAuthNotice>
      ) : !memberSignupOpen ? (
        <PublicAuthNotice title="Joining opens soon">
          {tenant.name} is still getting ready. Please try again later.
        </PublicAuthNotice>
      ) : gate?.access === "denied" ? (
        <PublicAuthNotice
          title={
            gate.type === "invalid_token"
              ? "This link does not work"
              : "Ask the office to join"
          }
        >
          {gate.message}
        </PublicAuthNotice>
      ) : gate?.access === "granted" ? (
        <MemberSignupForm
          devMode={canShowQuickFill(context)}
          memberNumberPrefix={tenant.memberNumberPrefix}
          signupToken={gate.token}
          tenantName={tenant.name}
        />
      ) : null}
    </PublicAuthShell>
  )
}
