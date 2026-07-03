import { Badge } from "@halaalvest/ui/components/badge"
import { HalaalvestLogo } from "@halaalvest/ui/components/brand-logo"
import { buttonVariants } from "@halaalvest/ui/components/button"
import Link from "next/link"
import { PricingSection } from "./pricing-section"

const proofMetrics = [
  { label: "Finance posture", value: "Ledger-aware" },
  { label: "Member entry", value: "Approval-led" },
  { label: "Workspace setup", value: "Guided" },
] as const

const operatingPillars = [
  {
    label: "Financial command center",
    body: "Track contributions, charges, repayments, and member balances from one ledger-aware operating surface.",
  },
  {
    label: "Interest-free approval governance",
    body: "Separate eligibility, liquidity, approval, and repayment follow-up so financing decisions stay principled and reviewable.",
  },
  {
    label: "Cooperative rollout",
    body: "Launch each cooperative with its own public presence, signup path, roles, and workspace on shared infrastructure.",
  },
] as const

const workflowRows = [
  [
    "01",
    "Public signup",
    "Primary contact starts a verified cooperative setup.",
  ],
  [
    "02",
    "Cooperative workspace",
    "Domain, dashboard, and onboarding context are prepared together.",
  ],
  [
    "03",
    "Finance operations",
    "Admins move into contributions, charges, reports, and approvals.",
  ],
  [
    "04",
    "Member trust",
    "Public identity and internal records stay aligned as the cooperative grows.",
  ],
] as const

const productSignals = [
  ["Monthly records", "Staged", "Review before posting"],
  ["Signup", "Controlled", "Admin approval required"],
  ["Onboarding", "Guided", "Setup before operations"],
] as const

export function LaunchLanding({ signupHref }: { signupHref: string }) {
  return (
    <main
      id="top"
      className="web-readable min-h-svh bg-background text-foreground"
    >
      <header className="border-b border-border bg-background/95">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          <Link aria-label="Halaalvest home" href="#top">
            <HalaalvestLogo
              markClassName="size-9"
              wordmarkClassName="text-sm"
            />
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <Link
              className="transition-colors hover:text-foreground"
              href="#platform"
            >
              Platform
            </Link>
            <Link
              className="transition-colors hover:text-foreground"
              href="#workflow"
            >
              Workflow
            </Link>
            <Link
              className="transition-colors hover:text-foreground"
              href="#pricing"
            >
              Pricing
            </Link>
            <Link
              className="transition-colors hover:text-foreground"
              href="#proof"
            >
              Proof
            </Link>
          </nav>

          <Link
            className={buttonVariants({
              className: "h-9 rounded-md px-4 text-sm",
            })}
            href={signupHref}
          >
            Start signup
          </Link>
        </div>
      </header>

      <section className="border-b border-border">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-14 sm:px-6 sm:py-18 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:py-20">
          <div className="flex max-w-3xl flex-col justify-center gap-7">
            <Badge variant="outline" className="h-6 w-fit rounded-md px-2.5">
              Cooperative finance infrastructure
            </Badge>

            <div className="space-y-5">
              <h1 className="max-w-4xl font-heading text-5xl leading-[1.02] font-semibold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                Halaalvest
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                A premium cooperative management platform for interest-free
                savings and financing, staged monthly contributions,
                approval-controlled member signup, charges, and trustworthy
                member records.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                className={buttonVariants({
                  className: "h-11 rounded-md px-5 text-sm",
                  size: "lg",
                })}
                href={signupHref}
              >
                Start cooperative setup
              </Link>
              <Link
                className={buttonVariants({
                  className: "h-11 rounded-md px-5 text-sm",
                  size: "lg",
                  variant: "outline",
                })}
                href="#platform"
              >
                View platform
              </Link>
            </div>

            <div className="grid border-y border-border sm:grid-cols-3">
              {proofMetrics.map((metric) => (
                <div
                  className="border-b border-border py-4 last:border-r-0 sm:border-r sm:border-b-0 sm:px-4 first:sm:pl-0"
                  key={metric.label}
                >
                  <p className="text-2xl font-semibold tracking-tight">
                    {metric.value}
                  </p>
                  <p className="mt-1 text-xs font-medium text-muted-foreground">
                    {metric.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <section
            aria-label="Halaalvest platform preview"
            className="border border-border bg-card"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Cooperative HQ</p>
                <p className="text-xs text-muted-foreground">
                  Finance and governance overview
                </p>
              </div>
              <Badge variant="secondary" className="rounded-md">
                Live workspace
              </Badge>
            </div>

            <div className="grid gap-px bg-border sm:grid-cols-3">
              {productSignals.map(([label, value, status]) => (
                <article className="bg-card p-4" key={label}>
                  <p className="text-xs font-medium text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-3 text-2xl font-semibold tracking-tight">
                    {value}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{status}</p>
                </article>
              ))}
            </div>

            <div className="grid gap-5 p-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="border border-border bg-background p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Approval queue</p>
                  <span className="text-xs text-muted-foreground">Today</span>
                </div>
                <div className="mt-5 space-y-3">
                  {[
                    "Member finance review",
                    "Liquidity check",
                    "Dual sign-off",
                  ].map((item, index) => (
                    <div
                      className="flex items-center justify-between border border-border bg-card px-3 py-2"
                      key={item}
                    >
                      <span className="text-sm">{item}</span>
                      <span className="text-xs text-muted-foreground">
                        0{index + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-border bg-background p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Ledger movement</p>
                  <span className="text-xs text-muted-foreground">30 days</span>
                </div>
                <div className="mt-6 flex h-40 items-end gap-2 border-b border-l border-border px-3">
                  {[42, 58, 51, 72, 64, 86, 76, 92, 88, 98].map((height) => (
                    <span
                      aria-hidden="true"
                      className="w-full bg-foreground"
                      key={height}
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section id="platform" className="border-b border-border bg-card">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-14 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8 lg:py-18">
          <div>
            <Badge variant="outline" className="h-6 rounded-md px-2.5">
              Platform
            </Badge>
            <h2 className="mt-5 max-w-md font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              Built for leadership, finance teams, and member trust.
            </h2>
          </div>

          <div className="grid gap-px overflow-hidden border border-border bg-border md:grid-cols-3">
            {operatingPillars.map((pillar) => (
              <article className="bg-card p-6" key={pillar.label}>
                <p className="text-sm font-semibold">{pillar.label}</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {pillar.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="border-b border-border">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-14 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-18">
          <div className="max-w-xl">
            <Badge variant="secondary" className="h-6 rounded-md px-2.5">
              Operating workflow
            </Badge>
            <h2 className="mt-5 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              The first screen leads into the real operating flow.
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Public trust, cooperative identity, onboarding, and back-office
              controls are presented as one connected system.
            </p>
          </div>

          <div className="border border-border">
            {workflowRows.map(([number, title, body]) => (
              <article
                className="grid gap-4 border-b border-border p-5 last:border-b-0 sm:grid-cols-[4rem_1fr]"
                key={number}
              >
                <p className="text-sm font-semibold text-muted-foreground">
                  {number}
                </p>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {body}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <PricingSection signupHref={signupHref} />

      <section id="proof" className="bg-foreground text-background">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-14 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-end lg:px-8 lg:py-16">
          <div className="max-w-2xl">
            <p className="text-xs font-medium tracking-[0.24em] text-background/60 uppercase">
              Ready for market
            </p>
            <h2 className="mt-4 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              A public surface with the restraint of finance software and the
              clarity of a premium SaaS company.
            </h2>
            <p className="mt-4 text-sm leading-7 text-background/70">
              Route visitors into cooperative signup, workspace login, or the
              guided first-run setup without filler content or disconnected
              claims.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              className={buttonVariants({
                className:
                  "h-11 rounded-md bg-background px-5 text-sm text-foreground hover:bg-background/90",
                size: "lg",
              })}
              href={signupHref}
            >
              Start signup
            </Link>
            <Link
              className={buttonVariants({
                className:
                  "h-11 rounded-md border-background/30 bg-transparent px-5 text-sm text-background hover:bg-background/10 hover:text-background",
                size: "lg",
                variant: "outline",
              })}
              href="#top"
            >
              Back to top
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-5 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>halaalvest</p>
          <p>Interest-free cooperative operations platform</p>
        </div>
      </footer>
    </main>
  )
}
