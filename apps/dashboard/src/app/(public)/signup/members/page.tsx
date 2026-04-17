import { buttonVariants } from "@halaal-vest/ui/components/button"
import { cn } from "@halaal-vest/ui/lib/utils"
import { MemberSignupForm } from "@/components/onboarding/member-signup-form"
import { resolveMemberSignupGate } from "@/lib/member-signup-access"
import { getDashboardServerContext } from "@/lib/server-context"
import { redirect } from "next/navigation"

export default async function MemberSignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const context = await getDashboardServerContext()
  const params = await searchParams
  const signupToken = typeof params.token === "string" ? params.token : null

  if (context.auth.sessionToken && context.auth.user && context.auth.pendingMemberOnboarding) {
    redirect("/awaiting-approval")
  }

  if (context.auth.sessionToken && context.auth.membership) {
    redirect("/")
  }

  const gate =
    context.tenant && !context.auth.membership
      ? await resolveMemberSignupGate({
          tenantId: context.tenant.id,
          token: signupToken,
        })
      : null

  return (
    <main className="bg-public-canvas min-h-svh px-4 py-10 sm:px-6 lg:px-8">
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
            <a
              className={cn(buttonVariants({ size: "sm", variant: "outline" }), "px-4")}
              href="/login"
            >
              Already have an account?
            </a>
          </div>

          {context.tenant && gate?.access === "granted" ? (
            <div className="mt-8 rounded-[1.5rem] border border-border/70 bg-background/80 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {gate.mode === "link" ? "Staff-issued signup link" : "Signup access"}
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground">
                {gate.mode === "link"
                  ? `This signup link is active for ${gate.link?.name ?? "member onboarding"}${gate.link?.maxSignups ? ` and has ${Math.max(0, gate.link.maxSignups - gate.link.currentSignupCount)} slots remaining.` : "."}`
                  : "This cooperative currently allows public member signup."}
              </p>
              {gate.link?.expiresAt ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Expires on {gate.link.expiresAt.toISOString().slice(0, 10)}.
                </p>
              ) : null}
            </div>
          ) : null}

          {gate?.access === "denied" ? (
            <div className="mt-8 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-medium">Signup is restricted</p>
              <p className="mt-2 leading-6">{gate.message}</p>
            </div>
          ) : null}
        </section>

        {context.tenant && gate?.access === "granted" ? (
          <MemberSignupForm
            signupToken={gate.token}
            tenantName={context.tenant.name}
          />
        ) : (
          <section className="rounded-[2rem] border border-border/70 bg-background/92 p-6 shadow-sm">
            <p className="text-sm leading-7 text-muted-foreground">
              Ask the cooperative office for an in-office signup session or a fresh staff-issued signup link if you need remote access.
            </p>
          </section>
        )}
      </div>
    </main>
  )
}
