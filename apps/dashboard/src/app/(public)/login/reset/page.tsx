import { headers } from "next/headers"
import { buildTenantHref } from "@halaalvest/tenant-url"
import { resolveTenantUrlContextFromHeaders } from "@halaalvest/tenant-url/next/server"
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import { cn } from "@halaalvest/ui/lib/utils"
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
  const devResetUrl =
    typeof params.devResetUrl === "string" ? params.devResetUrl : null
  const requestAction = buildTenantHref(
    tenantUrlContext,
    "/auth/password-reset/request",
    tenantUrlConfig
  )
  const loginHref = buildTenantHref(tenantUrlContext, "/login", tenantUrlConfig)

  return (
    <main className="flex min-h-svh items-center justify-center bg-public-canvas px-4 py-10">
      <section className="w-full max-w-md rounded-[2rem] border border-border/70 bg-background/94 p-6 shadow-[0_24px_80px_rgba(88,52,24,0.08)] backdrop-blur sm:p-8">
        <div className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Password reset
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Set a new password
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Enter your account email and we will send a link to set your
            workspace password.
          </p>
        </div>

        {sent ? (
          <div className="mt-6 rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-950">
            If an account exists for this cooperative, a password reset link has
            been queued for that email.
          </div>
        ) : null}

        {devResetUrl ? (
          <a
            className={cn(
              buttonVariants({ size: "lg", variant: "outline" }),
              "mt-4 w-full"
            )}
            href={devResetUrl}
          >
            Open dev reset link
          </a>
        ) : null}

        <form action={requestAction} method="post" className="mt-6 space-y-4">
          <label className="grid gap-2 text-sm text-foreground">
            <span>Email</span>
            <Input
              type="email"
              name="email"
              placeholder="name@cooperative.com"
              required
              className="h-11"
            />
          </label>

          <Button type="submit" size="lg" className="w-full">
            Send reset link
          </Button>
        </form>

        <a
          className={cn(
            buttonVariants({ size: "lg", variant: "ghost" }),
            "mt-3 w-full"
          )}
          href={loginHref}
        >
          Back to login
        </a>
      </section>
    </main>
  )
}
