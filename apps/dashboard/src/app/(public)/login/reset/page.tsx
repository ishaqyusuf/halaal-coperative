import { headers } from "next/headers"
import { listTenantUsersWithMemberships, listTenants } from "@halaalvest/db"
import { buildTenantHref } from "@halaalvest/tenant-url"
import { resolveTenantUrlContextFromHeaders } from "@halaalvest/tenant-url/next/server"
import { buttonVariants } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import { PublicAuthShell } from "@/components/public-auth-shell"
import { PasswordResetRequestForm } from "@/components/public-auth-forms"
import { getDashboardTenantUrlConfig } from "@/utils/tenant-url-config"
import { getDashboardServerContext } from "@/lib/server-context"

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
  const existingAccountEmails =
    process.env.NODE_ENV === "production"
      ? []
      : (
          await Promise.all(
            (context.tenant ? [context.tenant] : await listTenants()).map(
              async (tenant) => listTenantUsersWithMemberships(tenant.id),
            ),
          )
        )
          .flat()
          .map((user) => user.email)
          .filter((email, index, emails) => emails.indexOf(email) === index)
  const requestAction = buildTenantHref(
    tenantUrlContext,
    "/auth/password-reset/request",
    tenantUrlConfig
  )
  const loginHref = buildTenantHref(tenantUrlContext, "/login", tenantUrlConfig)

  return (
    <PublicAuthShell
      badge="Password reset"
      description="Enter your account email and we will send a link to set your workspace password."
      title="Set a new password"
    >
      <div className="space-y-2 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          Password reset
        </p>
        <h2 className="text-2xl leading-tight font-semibold text-foreground">
          Send reset link
        </h2>
      </div>

      {sent ? (
        <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-950">
          If an account exists for this cooperative, a password reset link has
          been queued for that email.
        </div>
      ) : null}

      <PasswordResetRequestForm
        action={requestAction}
        existingAccountEmails={existingAccountEmails}
      />

      <a
        className={cn(
          buttonVariants({ size: "lg", variant: "ghost" }),
          "mt-3 w-full"
        )}
        href={loginHref}
      >
        Back to login
      </a>
    </PublicAuthShell>
  )
}
