import { headers } from "next/headers"
import { buildTenantHref } from "@halaalvest/tenant-url"
import { resolveTenantUrlContextFromHeaders } from "@halaalvest/tenant-url/next/server"
import { buttonVariants } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import { ResendMemberVerificationForm } from "@/components/public-auth-forms"
import { PublicAuthNotice } from "@/components/public-auth-notice"
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

  const logoutHref = buildTenantHref(
    tenantUrlContext,
    "/auth/logout",
    tenantUrlConfig
  )
  const needsEmail = request.status === "pending_email_verification"
  const tenantName = context.tenant?.name ?? "The cooperative"

  return (
    <PublicAuthShell
      cooperativeName={context.tenant?.name}
      title={needsEmail ? "Confirm your email" : "Waiting for approval"}
    >
      <div className="grid gap-6">
        <PublicAuthNotice tone={needsEmail ? "info" : "success"}>
          {needsEmail ? (
            <>
              Open the link we sent to <strong>{request.email}</strong>. Then{" "}
              {tenantName} can review your request.
            </>
          ) : (
            <>
              {tenantName} is checking your details. We will email you when you
              can sign in.
            </>
          )}
        </PublicAuthNotice>

        <dl className="grid gap-4 text-lg">
          {[
            ["Name", request.fullName],
            ["Email", request.email],
            ["Member number", request.memberNumber],
          ].map(([label, value]) => (
            <div className="grid gap-0.5" key={label}>
              <dt className="text-base text-muted-foreground">{label}</dt>
              <dd className="font-semibold break-words">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="grid gap-3">
          {needsEmail ? (
            <ResendMemberVerificationForm
              action={resendMemberVerificationAction}
            />
          ) : null}
          <a
            className={cn(
              buttonVariants({ size: "lg", variant: "outline" }),
              "w-full"
            )}
            href={logoutHref}
          >
            Sign out
          </a>
        </div>
      </div>
    </PublicAuthShell>
  )
}
