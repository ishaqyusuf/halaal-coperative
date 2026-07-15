import { headers } from "next/headers"
import { buildTenantHref } from "@halaalvest/tenant-url"
import { resolveTenantUrlContextFromHeaders } from "@halaalvest/tenant-url/next/server"
import { buttonVariants } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import { PublicAuthShell } from "@/components/public-auth-shell"
import { PasswordResetConfirmForm } from "@/components/public-auth-forms"
import { getDashboardTenantUrlConfig } from "@/utils/tenant-url-config"

const errorMessages: Record<string, string> = {
  "invalid-token": "This password reset link is invalid or has already been used.",
  "missing-token": "Open the password reset link from your email.",
  "password-mismatch": "Passwords do not match.",
  "password-too-short": "Password must be at least 8 characters.",
}

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
  const token = typeof params.token === "string" ? params.token : ""
  const error = typeof params.error === "string" ? params.error : null
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
      badge="Password reset"
      description="Use at least 8 characters. After saving, sign in with your email and new password."
      title="Choose your password"
    >
      <div className="space-y-2 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          Password reset
        </p>
        <h2 className="text-2xl leading-tight font-semibold text-foreground">
          Save new password
        </h2>
      </div>

      {error ? (
        <div className="mt-6 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm leading-6 text-destructive">
          {errorMessages[error] ?? errorMessages["invalid-token"]}
        </div>
      ) : null}

      {!token ? (
        <a
          className={cn(
            buttonVariants({ size: "lg", variant: "outline" }),
            "mt-6 w-full"
          )}
          href={requestHref}
        >
          Request a new link
        </a>
      ) : (
        <PasswordResetConfirmForm action={confirmAction} token={token} />
      )}
    </PublicAuthShell>
  )
}
