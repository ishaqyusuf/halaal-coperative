import { cookies, headers } from "next/headers"
import { getTenantMemberSignupSettings } from "@halaalvest/db"
import { buildTenantHref } from "@halaalvest/tenant-url"
import { resolveTenantUrlContextFromHeaders } from "@halaalvest/tenant-url/next/server"
import { LoginForm } from "./login-form"
import { QaAccessPanel } from "./qa-access-panel"
import { PublicAuthShell } from "@/components/public-auth-shell"
import {
  PublicAuthNotice,
  publicAuthLinkClassName,
} from "@/components/public-auth-notice"
import { normalizeDashboardRedirectPath } from "@/lib/auth-redirect"
import {
  LOGIN_PREFILL_COOKIE,
  normalizeLoginPrefillCode,
} from "@/lib/login-prefill"
import { getDashboardServerContext } from "@/lib/server-context"
import { resolveInitialMigrationSetupGate } from "@/lib/setup-gate"
import { tenantRedirect } from "@/utils/tenant-redirect"
import { getDashboardTenantUrlConfig } from "@/utils/tenant-url-config"

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

  // Set by /auth/login-prefill when marketing "Sign in" found this
  // cooperative from a member code.
  const prefillIdentifier =
    normalizeLoginPrefillCode(
      (await cookies()).get(LOGIN_PREFILL_COOKIE)?.value,
      context.tenant?.cooperativeCodePrefix
    ) ?? ""
  const memberSignupSettings = context.tenant
    ? await getTenantMemberSignupSettings(context.tenant.id)
    : null
  const showMemberSignupCta =
    Boolean(context.tenant) &&
    memberSignupSettings?.memberSignupAccessMode === "public"
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
    <PublicAuthShell
      cooperativeName={context.tenant?.name}
      description="Use your email or member code."
      footer={
        showMemberSignupCta ? (
          <p>
            New member?{" "}
            <a className={publicAuthLinkClassName} href={memberSignupHref}>
              Join {context.tenant?.name ?? "your cooperative"}
            </a>
          </p>
        ) : null
      }
      title="Sign in"
    >
      <div className="grid gap-6">
        <QaAccessPanel nextPath={nextPath} />

        {error === "invalid-account" ? (
          <PublicAuthNotice tone="error">
            That email, member code or password is not right. Check them and try
            again.
          </PublicAuthNotice>
        ) : null}

        {reset === "complete" || reset === "invited" ? (
          <PublicAuthNotice tone="success">
            {reset === "invited"
              ? "Your password is set. Sign in below."
              : "Your password is changed. Sign in with your new password."}
          </PublicAuthNotice>
        ) : null}

        <LoginForm
          action={loginAction}
          defaultIdentifier={prefillIdentifier}
          codeExample={
            context.tenant?.memberNumberPrefix
              ? `${context.tenant.memberNumberPrefix}0042`
              : null
          }
          nextPath={nextPath}
          resetPasswordHref={resetPasswordHref}
        />
      </div>
    </PublicAuthShell>
  )
}
