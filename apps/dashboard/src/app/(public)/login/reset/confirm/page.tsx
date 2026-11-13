import { headers } from "next/headers"
import { buildTenantHref } from "@halaalvest/tenant-url"
import { resolveTenantUrlContextFromHeaders } from "@halaalvest/tenant-url/next/server"
import { buttonVariants } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import { PublicAuthShell } from "@/components/public-auth-shell"
import {
  PublicAuthNotice,
} from "@/components/public-auth-notice"
import { PasswordResetConfirmForm } from "@/components/public-auth-forms"
import {
  getPasswordSetupCopy,
  getPasswordSetupError,
  parsePasswordSetupPurpose,
} from "@/lib/password-setup-copy"
import { getDashboardServerContext } from "@/lib/server-context"
import { getDashboardTenantUrlConfig } from "@/utils/tenant-url-config"

export default async function PasswordResetConfirmPage({
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
  const token = typeof params.token === "string" ? params.token : ""
  const error = typeof params.error === "string" ? params.error : null
  const purpose = parsePasswordSetupPurpose(params.purpose)
  const copy = getPasswordSetupCopy(purpose)
  const confirmAction = buildTenantHref(
    tenantUrlContext,
    "/auth/password-reset/confirm",
    tenantUrlConfig
  )
  const requestHref = buildTenantHref(
    tenantUrlContext,
    "/login/reset",
    tenantUrlConfig
  )

  return (
    <PublicAuthShell
      cooperativeName={context.tenant?.name}
      description={token ? copy.description : undefined}
      title={copy.title}
    >
      <div className="grid gap-6">
        {error || !token ? (
          <PublicAuthNotice tone="error">
            {getPasswordSetupError(purpose, error ?? "missing-token")}
          </PublicAuthNotice>
        ) : null}

        {token ? (
          <PasswordResetConfirmForm
            action={confirmAction}
            purpose={purpose}
            token={token}
          />
        ) : (
          <a
            className={cn(
              buttonVariants({ size: "lg", variant: "outline" }),
              "w-full"
            )}
            href={requestHref}
          >
            Get a new link
          </a>
        )}
      </div>
    </PublicAuthShell>
  )
}
