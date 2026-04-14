import { Badge } from "@halaal-vest/ui/components/badge"
import { Button, buttonVariants } from "@halaal-vest/ui/components/button"
import { Separator } from "@halaal-vest/ui/components/separator"
import Link from "next/link"

const pillars = [
  {
    label: "Savings & Contributions",
    description:
      "Track member deposits, recurring contributions, and cooperative balances with ledger-backed precision.",
  },
  {
    label: "Halal Loan Governance",
    description:
      "Interest-free loan workflows with eligibility rules, dual approval, and repayment schedules.",
  },
  {
    label: "Multi-Tenant Operations",
    description:
      "Each cooperative gets its own dashboard, public site, and policy configuration on shared infrastructure.",
  },
] as const

const contactTeamHref =
  "mailto:hello@halaal-vest.com?subject=halaal-vest%20product%20inquiry&body=Hello%20halaal-vest%20team%2C%0A%0AI%27d%20like%20to%20learn%20more%20about%20the%20platform.%0A%0AName%3A%0AOrganization%3A%0APhone%3A%0A%0AThanks."

export function PrelaunchLanding() {
  return (
    <main className="min-h-svh bg-background">
      {/* Nav */}
      <nav className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <span className="text-xs font-bold text-primary-foreground">H</span>
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">
            halaal-vest
          </span>
        </div>
        <Badge variant="outline" className="text-muted-foreground">
          Coming Soon
        </Badge>
      </nav>

      <Separator />

      {/* Hero */}
      <section className="mx-auto w-full max-w-5xl px-6 pt-20 pb-16 lg:pt-28 lg:pb-20">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="mb-6">
            Pre-Launch
          </Badge>

          <h1 className="font-heading text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            The operating backbone for halal cooperatives
          </h1>

          <p className="mx-auto mt-6 max-w-lg text-base leading-7 text-muted-foreground">
            One platform for member savings, interest-free lending, financial transparency,
            and tenant-branded cooperative sites.
          </p>

          <div className="mt-10 flex items-center justify-center gap-3">
            <Link
              className={buttonVariants({
                size: "lg",
                className: "px-5",
              })}
              href="/signup"
            >
              Start Signup
            </Link>
            <Link
              className={buttonVariants({
                variant: "outline",
                size: "lg",
                className: "px-5",
              })}
              href={contactTeamHref}
            >
              Talk to Us
            </Link>
          </div>
        </div>
      </section>

      <Separator className="mx-auto max-w-5xl" />

      {/* Pillars */}
      <section className="mx-auto w-full max-w-5xl px-6 py-16 lg:py-20">
        <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          What We Are Building
        </p>

        <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
          {pillars.map((pillar) => (
            <div key={pillar.label} className="bg-card p-6">
              <p className="text-sm font-semibold text-card-foreground">{pillar.label}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <Separator className="mx-auto max-w-5xl" />

      {/* Signal */}
      <section className="mx-auto w-full max-w-5xl px-6 py-16 lg:py-20">
        <div className="mx-auto grid max-w-3xl gap-12 sm:grid-cols-2 sm:gap-16">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              For Cooperative Teams
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
              Replace spreadsheets with real financial infrastructure.
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Halaal-vest gives finance officers, admins, and members a shared workspace
              with role-aware access, audit trails, and double-entry accounting out of the box.
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Halal-First Design
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
              Interest-free lending with clear governance.
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Loan eligibility is separated from pool liquidity. Approval workflows support
              configurable dual sign-off. Every transaction posts to the cooperative ledger.
            </p>
          </div>
        </div>
      </section>

      <Separator className="mx-auto max-w-5xl" />

      {/* Footer CTA */}
      <section className="mx-auto w-full max-w-5xl px-6 py-16 lg:py-20">
        <div className="mx-auto max-w-md text-center">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Get notified when we launch
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Join the early access list for priority onboarding.
          </p>
          <div className="mt-6">
            <Link
              className={buttonVariants({ size: "lg", className: "px-6" })}
              href="/signup"
            >
              Start Signup
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
          <p className="text-xs text-muted-foreground">halaal-vest</p>
          <p className="text-xs text-muted-foreground">
            Halal cooperative operations platform
          </p>
        </div>
      </footer>
    </main>
  )
}
