import { headers } from "next/headers"
import { buildTenantHref } from "@halaalvest/tenant-url"
import { resolveTenantUrlContextFromHeaders } from "@halaalvest/tenant-url/next/server"
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import { cn } from "@halaalvest/ui/lib/utils"
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
    <main className="flex min-h-svh items-center justify-center bg-public-canvas px-4 py-10">
      <section className="w-full max-w-md rounded-[2rem] border border-border/70 bg-background/94 p-6 shadow-[0_24px_80px_rgba(88,52,24,0.08)] backdrop-blur sm:p-8">
        <div className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Password reset
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Choose your password
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Use at least 8 characters. After saving, sign in with your email and
            new password.
          </p>
        </div>

        {error ? (
          <div className="mt-6 rounded-[1.25rem] border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm leading-6 text-destructive">
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
          <form action={confirmAction} method="post" className="mt-6 space-y-4">
            <input type="hidden" name="token" value={token} />

            <label className="grid gap-2 text-sm text-foreground">
              <span>New password</span>
              <Input
                type="password"
                name="password"
                placeholder="Enter a new password"
                required
                minLength={8}
                className="h-11"
              />
            </label>

            <label className="grid gap-2 text-sm text-foreground">
              <span>Confirm password</span>
              <Input
                type="password"
                name="confirmPassword"
                placeholder="Confirm your new password"
                required
                minLength={8}
                className="h-11"
              />
            </label>

            <Button type="submit" size="lg" className="w-full">
              Save password
            </Button>
          </form>
        )}
      </section>
    </main>
  )
}
