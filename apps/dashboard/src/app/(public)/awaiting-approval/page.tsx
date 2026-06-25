import { headers } from "next/headers"
import { buildTenantHref } from "@halaalvest/tenant-url"
import { resolveTenantUrlContextFromHeaders } from "@halaalvest/tenant-url/next/server"
import { Button } from "@halaalvest/ui/components/button"
import { resendMemberVerificationAction } from "@/lib/public-actions"
import { getDashboardServerContext } from "@/lib/server-context"
import { tenantRedirect } from "@/utils/tenant-redirect"
import { getDashboardTenantUrlConfig } from "@/utils/tenant-url-config"

export default async function AwaitingApprovalPage() {
  const headerStore = await headers()
  const tenantUrlConfig = getDashboardTenantUrlConfig()
  const tenantUrlContext = resolveTenantUrlContextFromHeaders({
    config: tenantUrlConfig,
    headers: headerStore,
  })
  const context = await getDashboardServerContext()

  if (!context.auth.sessionToken || !context.auth.user) {
    return tenantRedirect("/login")
  }

  if (context.auth.membership) {
    return tenantRedirect("/")
  }

  const request = context.auth.pendingMemberOnboarding

  if (!request) {
    return tenantRedirect("/login?error=invalid-account")
  }
  const logoutHref = buildTenantHref(tenantUrlContext, "/auth/logout", tenantUrlConfig)

  return (
    <main className="bg-waiting-canvas min-h-svh px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl rounded-[2rem] border border-border/70 bg-card p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Membership status</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground">
          {request.status === "pending_email_verification"
            ? "Verify your email to continue"
            : "Your membership is awaiting approval"}
        </h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          {request.status === "pending_email_verification"
            ? "We created your account, but you still need to confirm your email address before the cooperative can review your signup."
            : "Your account is signed in successfully, but cooperative staff still need to review and approve your membership details before dashboard access is enabled."}
        </p>

        <div className="mt-8 grid gap-3 rounded-[1.5rem] border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
          <p><span className="font-medium text-foreground">Name:</span> {request.fullName}</p>
          <p><span className="font-medium text-foreground">Email:</span> {request.email}</p>
          <p><span className="font-medium text-foreground">Cooperative number:</span> {request.memberNumber}</p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {request.status === "pending_email_verification" ? (
            <form action={resendMemberVerificationAction}>
              <Button type="submit" size="lg">Resend verification email</Button>
            </form>
          ) : null}
          <a className="inline-flex h-8 items-center justify-center rounded-md border border-border px-4 text-xs font-medium text-foreground transition hover:bg-input/50" href={logoutHref}>
            Sign out
          </a>
        </div>
      </div>
    </main>
  )
}
