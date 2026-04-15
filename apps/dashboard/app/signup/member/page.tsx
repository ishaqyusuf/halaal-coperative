import { redirect } from "next/navigation"
import { MemberSignupForm } from "@/features/member-onboarding/components/member-signup-form"
import { getDashboardServerContext } from "@/lib/server-context"

export default async function MemberSignupPage() {
  const context = await getDashboardServerContext()

  if (context.auth.sessionToken && context.auth.user && context.auth.pendingMemberOnboarding) {
    redirect("/awaiting-approval")
  }

  if (context.auth.sessionToken && context.auth.membership) {
    redirect("/")
  }

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top,_rgba(17,94,89,0.12),_transparent_28%),linear-gradient(180deg,_rgba(250,250,249,0.96)_0%,_rgba(255,255,255,1)_38%,_rgba(245,245,244,1)_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <section className="rounded-[2rem] border border-border/70 bg-card px-6 py-8 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Membership signup</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">
            Join {context.tenant?.name ?? "this cooperative"} with your own dashboard access.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
            Create your member account, verify your email, and wait for cooperative approval. Once approved, you will sign in with the same credentials and see your personal member dashboard.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a className="inline-flex h-8 items-center justify-center rounded-md border border-border px-4 text-xs font-medium text-foreground transition hover:bg-input/50" href="/login">
              Already have an account?
            </a>
          </div>
        </section>

        <MemberSignupForm tenantName={context.tenant?.name ?? "this cooperative"} />
      </div>
    </main>
  )
}
