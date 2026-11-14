import { headers } from "next/headers"
import { listTenantUsersWithMemberships } from "@halaalvest/db"
import { buildTenantHref } from "@halaalvest/tenant-url"
import { resolveTenantUrlContextFromHeaders } from "@halaalvest/tenant-url/next/server"
import { PublicAuthShell } from "@/components/public-auth-shell"
import {
  PublicAuthNotice,
  publicAuthLinkClassName,
} from "@/components/public-auth-notice"
import { PasswordResetRequestForm } from "@/components/public-auth-forms"
import { getDashboardServerContext } from "@/lib/server-context"
import { getDashboardTenantUrlConfig } from "@/utils/tenant-url-config"

export default async function PasswordResetRequestPage({
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
  const sent = params.sent === "1"
  const context = await getDashboardServerContext()
  // Development Quick fill only: this cooperative's account emails.
  const existingAccountEmails =
    process.env.NODE_ENV !== "production" && context.tenant
      ? [
          ...new Set(
            (await listTenantUsersWithMemberships(context.tenant.id)).map(
              (user) => user.email
            )
          ),
        ]
      : []
  const requestAction = buildTenantHref(
    tenantUrlContext,
    "/auth/password-reset/request",
    tenantUrlConfig
  )
  const loginHref = buildTenantHref(tenantUrlContext, "/login", tenantUrlConfig)

  return (
    <PublicAuthShell
      cooperativeName={context.tenant?.name}
      description={
        sent ? undefined : "Enter your email. We will send you a link."
      }
      footer={
        <a className={publicAuthLinkClassName} href={loginHref}>
          Back to sign in
        </a>
      }
      title={sent ? "Check your email" : "Forgot your password?"}
    >
      {sent ? (
        <PublicAuthNotice tone="success">
          If this email has an account here, we have sent a link to choose a new
          password.
        </PublicAuthNotice>
      ) : (
        <PasswordResetRequestForm
          action={requestAction}
          existingAccountEmails={existingAccountEmails}
        />
      )}
    </PublicAuthShell>
  )
}
