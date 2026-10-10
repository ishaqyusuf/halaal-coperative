import { headers } from "next/headers"
import { getTenantMemberSignupSettings } from "@halaalvest/db"
import { buildTenantHref } from "@halaalvest/tenant-url"
import { resolveTenantUrlContextFromHeaders } from "@halaalvest/tenant-url/next/server"
import { Badge } from "@halaalvest/ui/components/badge"
import { HalaalvestLogo } from "@halaalvest/ui/components/brand-logo"
import { cn } from "@halaalvest/ui/lib/utils"
import { LoginForm } from "./login-form"
import { QaAccessPanel } from "./qa-access-panel"
import { normalizeDashboardRedirectPath } from "@/lib/auth-redirect"
import { resolveDashboardPublicLegalOrigin } from "@/lib/public-legal-origin"
import { getPublicRequestHost } from "@/lib/request-host"
import { getDashboardServerContext } from "@/lib/server-context"
import { resolveInitialMigrationSetupGate } from "@/lib/setup-gate"
import { tenantRedirect } from "@/utils/tenant-redirect"
import { getDashboardTenantUrlConfig } from "@/utils/tenant-url-config"

function LegalSupportDestinations({ origin }: { origin: string | null }) {
  if (!origin) {
    return (
      <span className="mt-3 block text-muted-foreground" role="status">
        Public legal, account deletion and support pages are being prepared.
      </span>
    )
  }

  return (
    <nav
      aria-label="Platform legal and support"
      className="mt-3 flex flex-wrap gap-4"
    >
      <a
        className="inline-flex min-h-11 items-center underline"
        href={`${origin}/terms`}
      >
        Terms
      </a>
      <a
        className="inline-flex min-h-11 items-center underline"
        href={`${origin}/privacy`}
      >
        Privacy
      </a>
      <a
        className="inline-flex min-h-11 items-center underline"
        href={`${origin}/delete-account`}
      >
        Delete account
      </a>
      <a
        className="inline-flex min-h-11 items-center underline"
        href={`${origin}/support`}
      >
        Support
      </a>
    </nav>
  )
}

export default async function LoginPage({
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
  const nextPath = normalizeDashboardRedirectPath(
    typeof params.next === "string" ? params.next : "/"
  )
  const error = typeof params.error === "string" ? params.error : null
  const reset = typeof params.reset === "string" ? params.reset : null
  const isDevelopment = process.env.NODE_ENV !== "production"

  if (context.auth.sessionToken && context.auth.user) {
    if (context.auth.membership && context.tenant) {
      const setupGate = await resolveInitialMigrationSetupGate({
        role: context.auth.membership.role,
        tenantId: context.tenant.id,
      })

      if (setupGate.shouldRedirectAdminToSetup) {
        await tenantRedirect("/getting-started")
      }

      if (setupGate.shouldRedirectAdminToSuccess) {
        await tenantRedirect("/onboarding-success")
      }
    }

    await tenantRedirect(nextPath)
  }

  const tenantName = context.tenant?.name ?? "Halaalvest"
  const memberSignupSettings = context.tenant
    ? await getTenantMemberSignupSettings(context.tenant.id)
    : null
  const showMemberSignupCta =
    Boolean(context.tenant) &&
    memberSignupSettings?.memberSignupAccessMode === "public"
  const tenantHostname = getPublicRequestHost(headerStore)
  const publicLegalOrigin = resolveDashboardPublicLegalOrigin(
    process.env.DASHBOARD_PUBLIC_LEGAL_ORIGIN
  )
  const heroEyebrow = context.tenant
    ? "Cooperative workspace"
    : "Platform access"
  const heroTitle = context.tenant
    ? `Welcome back to ${context.tenant.name}`
    : "Sign in to your cooperative workspace"
  const heroDescription = context.tenant
    ? "Members and staff sign in on the cooperative host. New members can start onboarding from the same entry point."
    : "Use the cooperative-specific host for workspace sign-in, or continue here while setting up and testing the platform."
  const supportCopy = context.tenant
    ? "Sessions stay scoped to this cooperative host so the public site, login, and workspace remain isolated."
    : "Sessions stay host-scoped so each cooperative site and the platform environment can keep separate logins."
  const loginAction = buildTenantHref(
    tenantUrlContext,
    "/auth/login",
    tenantUrlConfig
  )
  const memberSignupHref = buildTenantHref(
    tenantUrlContext,
    "/signup/members",
    tenantUrlConfig
  )
  const resetPasswordHref = buildTenantHref(
    tenantUrlContext,
    "/login/reset",
    tenantUrlConfig
  )

  return (
    <main
      className={cn(
        "bg-public-canvas flex min-h-svh flex-col text-foreground",
        isDevelopment && "bg-[#fff8df] dark:bg-[#201b0d]"
      )}
    >
      {isDevelopment ? (
        <div className="border-b border-[#d6a63a]/50 bg-[#fff2c7] px-4 py-2 text-xs font-medium text-[#0b1f36] dark:border-[#d6a63a]/40 dark:bg-[#2a240e] dark:text-[#f7faf7]">
          Development environment - email suggestions enabled
        </div>
      ) : null}

      <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="hidden border-r border-border bg-background/45 px-8 py-10 lg:flex">
          <div className="flex w-full flex-col">
            <HalaalvestLogo
              markClassName="size-9"
              wordmarkClassName="text-base tracking-normal"
            />

            <div className="mt-10 max-w-md lg:mt-20">
              <Badge variant="outline">{heroEyebrow}</Badge>
              <h1 className="mt-4 text-2xl leading-tight font-semibold text-foreground sm:text-3xl">
                {heroTitle}
              </h1>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                {heroDescription}
              </p>
            </div>

            <dl className="mt-8 border border-border bg-background/70 text-sm lg:mt-auto">
              <div className="grid grid-cols-[7rem_1fr] gap-4 border-b border-border px-4 py-3">
                <dt className="text-muted-foreground">Workspace</dt>
                <dd className="min-w-0 font-medium text-foreground">
                  {tenantName}
                </dd>
              </div>
              {tenantHostname ? (
                <div className="grid grid-cols-[7rem_1fr] gap-4 border-b border-border px-4 py-3">
                  <dt className="text-muted-foreground">Host</dt>
                  <dd className="min-w-0 truncate font-medium text-foreground">
                    {tenantHostname}
                  </dd>
                </div>
              ) : null}
              <div className="grid grid-cols-[7rem_1fr] gap-4 px-4 py-3">
                <dt className="text-muted-foreground">Session</dt>
                <dd className="min-w-0 leading-6 text-muted-foreground">
                  {supportCopy}
                  <LegalSupportDestinations origin={publicLegalOrigin} />
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="flex flex-1 items-start px-4 py-8 sm:px-6 lg:items-center lg:px-10">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-6 lg:hidden">
              <div className="flex items-center justify-between gap-4">
                <HalaalvestLogo
                  markClassName="size-9"
                  wordmarkClassName="text-base tracking-normal"
                />
                <Badge variant="outline">{heroEyebrow}</Badge>
              </div>
              {tenantHostname ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  {tenantHostname}
                </p>
              ) : null}
            </div>

            <QaAccessPanel />

            <div className="border border-border bg-background p-5 shadow-sm sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Member and staff login
                  </p>
                  <h2 className="mt-2 text-2xl leading-tight font-semibold text-foreground">
                    Continue to your workspace
                  </h2>
                </div>
                <Badge variant="outline" className="mt-1 hidden sm:inline-flex">
                  Secure
                </Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Enter your email or cooperative access code and password to
                access the current cooperative host.
              </p>

              {error === "invalid-account" ? (
                <div className="mt-5 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  The account could not be used for this cooperative host, or
                  the credentials were invalid.
                </div>
              ) : null}

              {reset === "complete" ? (
                <div className="mt-5 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-950 dark:border-emerald-500/50 dark:bg-emerald-950/30 dark:text-emerald-100">
                  Your password has been updated. Sign in with the new password.
                </div>
              ) : null}

              <LoginForm
                action={loginAction}
                memberSignupHref={memberSignupHref}
                nextPath={nextPath}
                resetPasswordHref={resetPasswordHref}
                showMemberSignupCta={showMemberSignupCta}
              />
            </div>

            <div className="mt-4 text-center text-xs leading-5 text-muted-foreground">
              {supportCopy}
              <LegalSupportDestinations origin={publicLegalOrigin} />
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
