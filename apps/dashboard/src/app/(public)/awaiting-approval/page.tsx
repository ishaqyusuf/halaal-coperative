import { headers } from "next/headers"
import { buildTenantHref } from "@halaalvest/tenant-url"
import { resolveTenantUrlContextFromHeaders } from "@halaalvest/tenant-url/next/server"
import { buttonVariants } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import { ResendMemberVerificationForm } from "@/components/public-auth-forms"
import { PublicAuthShell } from "@/components/public-auth-shell"
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
  const title =
    request.status === "pending_email_verification"
      ? "Verify your email to continue"
      : "Your membership is awaiting approval"
  const description =
    request.status === "pending_email_verification"
      ? "We created your account, but you still need to confirm your email address before the cooperative can review your signup."
      : "Your account is signed in successfully, but cooperative staff still need to review and approve your membership details before dashboard access is enabled."

  return (
    <PublicAuthShell
      badge="Membership status"
      description={description}
      title={title}
    >
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Membership status
        </p>
        <h2 className="mt-2 text-2xl leading-tight font-semibold text-foreground">
          {title}
        </h2>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          {description}
        </p>

        <div className="mt-8 grid gap-3 rounded-md border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
          <p><span className="font-medium text-foreground">Name:</span> {request.fullName}</p>
          <p><span className="font-medium text-foreground">Email:</span> {request.email}</p>
          <p><span className="font-medium text-foreground">Cooperative number:</span> {request.memberNumber}</p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {request.status === "pending_email_verification" ? (
            <ResendMemberVerificationForm
              action={resendMemberVerificationAction}
            />
          ) : null}
          <a
            className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
            href={logoutHref}
          >
            Sign out
          </a>
        </div>
      </div>
    </PublicAuthShell>
  )
}
