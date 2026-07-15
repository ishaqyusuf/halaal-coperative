import { headers } from "next/headers"
import { getTenantInitialMigrationState } from "@halaalvest/db"
import { buildTenantHref } from "@halaalvest/tenant-url"
import { resolveTenantUrlContextFromHeaders } from "@halaalvest/tenant-url/next/server"
import { buttonVariants } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import { MemberSignupForm } from "@/components/onboarding/member-signup-form"
import { PublicAuthShell } from "@/components/public-auth-shell"
import { resolveMemberSignupGate } from "@/lib/member-signup-access"
import { canShowQuickFill, getDashboardServerContext } from "@/lib/server-context"
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

  const migrationState = context.tenant
    ? await getTenantInitialMigrationState(context.tenant.id)
    : null
  const memberSignupOpen = Boolean(
    migrationState?.snapshot.canUseLiveFinancialWrites,
  )
  const gate =
    context.tenant && !context.auth.membership && memberSignupOpen
      ? await resolveMemberSignupGate({
          tenantId: context.tenant.id,
          token: signupToken,
        })
      : null
  const loginHref = buildTenantHref(tenantUrlContext, "/login", tenantUrlConfig)

  return (
    <PublicAuthShell
      badge="Membership signup"
      contentClassName="max-w-2xl"
      description="Create your member account, verify your email, and wait for cooperative approval before dashboard access is activated."
      title={`Join ${context.tenant?.name ?? "this cooperative"}`}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Membership signup
          </p>
          <h2 className="mt-2 text-2xl leading-tight font-semibold text-foreground">
            Create your member account
          </h2>
        </div>
        <a
          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
          href={loginHref}
        >
          Already have an account?
        </a>
      </div>

      {context.tenant && gate?.access === "granted" ? (
        <div className="mb-6 rounded-md border border-border/70 bg-muted/20 p-4">
          <p className="text-xs uppercase text-muted-foreground">
            {gate.mode === "link"
              ? "Staff-issued signup link"
              : "Signup access"}
          </p>
          <p className="mt-2 text-sm leading-6 text-foreground">
            {gate.mode === "link"
              ? `This signup link is active for ${gate.link?.name ?? "member onboarding"}${gate.link?.maxSignups ? ` and has ${Math.max(0, gate.link.maxSignups - gate.link.currentSignupCount)} slots remaining.` : "."}`
              : "This cooperative currently allows public member signup."}
          </p>
          {gate.link?.expiresAt ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Expires on {gate.link.expiresAt.toISOString().slice(0, 10)}.
            </p>
          ) : null}
        </div>
      ) : null}

      {gate?.access === "denied" ? (
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Signup is restricted</p>
          <p className="mt-2 leading-6">{gate.message}</p>
        </div>
      ) : null}

      {context.tenant && !memberSignupOpen ? (
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Signup is temporarily locked</p>
          <p className="mt-2 leading-6">
            This cooperative is still completing its one-time historical
            migration. Member signup will reopen after the workspace goes live.
          </p>
        </div>
      ) : null}

      {context.tenant && memberSignupOpen && gate?.access === "granted" ? (
        <MemberSignupForm
          devMode={canShowQuickFill(context)}
          memberNumberPrefix={context.tenant.memberNumberPrefix}
          signupToken={gate.token}
          tenantName={context.tenant.name}
        />
      ) : (
        <p className="text-sm leading-7 text-muted-foreground">
          Ask the cooperative office for an in-office signup session or a fresh
          staff-issued signup link if you need remote access.
        </p>
      )}
    </PublicAuthShell>
  )
}
