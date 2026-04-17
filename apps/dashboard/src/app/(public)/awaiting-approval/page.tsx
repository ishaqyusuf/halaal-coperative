import { redirect } from "next/navigation"
import { Button } from "@halaal-vest/ui/components/button"
import { resendMemberVerificationAction } from "@/lib/public-actions"
import { getDashboardServerContext } from "@/lib/server-context"

export default async function AwaitingApprovalPage() {
  const context = await getDashboardServerContext()

  if (!context.auth.sessionToken || !context.auth.user) {
    redirect("/login")
  }

  if (context.auth.membership) {
    redirect("/")
  }

  const request = context.auth.pendingMemberOnboarding

  if (!request) {
    redirect("/login?error=invalid-account")
  }

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
          <a className="inline-flex h-8 items-center justify-center rounded-md border border-border px-4 text-xs font-medium text-foreground transition hover:bg-input/50" href="/auth/logout">
            Sign out
          </a>
        </div>
      </div>
    </main>
  )
}
