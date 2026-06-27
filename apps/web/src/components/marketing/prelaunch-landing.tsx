import { Badge } from "@halaalvest/ui/components/badge"
import { buttonVariants } from "@halaalvest/ui/components/button"
import { Separator } from "@halaalvest/ui/components/separator"
import Link from "next/link"

const pillars = [
  {
    label: "Member capital",
    description:
      "Contribution tracking, balances, charges, and statements designed for cooperative finance teams.",
  },
  {
    label: "Halal lending",
    description:
      "Interest-free loan workflows with eligibility checks, liquidity awareness, and accountable approvals.",
  },
  {
    label: "Tenant rollout",
    description:
      "Public signup, branded cooperative surfaces, and protected workspaces on one shared platform.",
  },
] as const

const readiness = [
  ["Built for", "Governed funds"],
  ["Designed for", "Audit-ready ops"],
  ["Launch path", "Guided signup"],
] as const

const contactTeamHref =
  "mailto:hello@halaalvest.com?subject=halaalvest%20product%20inquiry&body=Hello%20halaalvest%20team%2C%0A%0AI%27d%20like%20to%20learn%20more%20about%20the%20platform.%0A%0AName%3A%0AOrganization%3A%0APhone%3A%0A%0AThanks."

export function PrelaunchLanding({ signupHref }: { signupHref: string }) {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          <Link className="flex items-center gap-3" href="/">
            <span className="flex size-8 items-center justify-center rounded-md bg-foreground text-xs font-semibold text-background">
              H
            </span>
            <span className="text-sm font-semibold tracking-tight">
              halaalvest
            </span>
          </Link>
          <Badge variant="outline" className="h-6 rounded-md px-2.5">
            Private launch
          </Badge>
        </div>
      </header>

      <section className="border-b border-border">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-14 sm:px-6 sm:py-18 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="h-6 rounded-md px-2.5">
              Cooperative finance infrastructure
            </Badge>
            <h1 className="mt-6 max-w-4xl font-heading text-5xl leading-[1.02] font-semibold tracking-tight sm:text-6xl lg:text-7xl">
              A cleaner operating backbone for halal cooperatives.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              Halaalvest is building the public signup, tenant workspace, and
              governed finance layer cooperative teams need before serious
              growth arrives.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className={buttonVariants({
                  className: "h-11 rounded-md px-5 text-sm",
                  size: "lg",
                })}
                href={signupHref}
              >
                Join early access
              </Link>
              <Link
                className={buttonVariants({
                  className: "h-11 rounded-md px-5 text-sm",
                  size: "lg",
                  variant: "outline",
                })}
                href={contactTeamHref}
              >
                Contact team
              </Link>
            </div>
          </div>

          <aside className="border border-border bg-card">
            <div className="border-b border-border p-5">
              <p className="text-sm font-semibold">Launch readiness</p>
              <p className="mt-1 text-sm text-muted-foreground">
                A premium front door for cooperative operators.
              </p>
            </div>
            <div className="grid gap-px bg-border">
              {readiness.map(([label, value]) => (
                <div
                  className="flex items-center justify-between bg-card p-5"
                  key={label}
                >
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-lg font-semibold tracking-tight">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="border-b border-border bg-card">
        <div className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-6 lg:px-8 lg:py-18">
          <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
            <div>
              <p className="text-xs font-medium tracking-[0.24em] text-muted-foreground uppercase">
                What is coming
              </p>
              <h2 className="mt-4 max-w-md font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                Finance-grade structure without making the cooperative feel
                generic.
              </h2>
            </div>

            <div className="grid gap-px overflow-hidden border border-border bg-border md:grid-cols-3">
              {pillars.map((pillar) => (
                <article className="bg-card p-6" key={pillar.label}>
                  <p className="text-sm font-semibold">{pillar.label}</p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {pillar.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-14 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8 lg:py-16">
          <div className="max-w-xl">
            <h2 className="font-heading text-3xl font-semibold tracking-tight">
              Start with the cooperative setup flow.
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Early access teams can move directly into signup while the public
              launch story stays clean and credible.
            </p>
          </div>
          <Link
            className={buttonVariants({
              className: "h-11 rounded-md px-5 text-sm",
              size: "lg",
            })}
            href={signupHref}
          >
            Start signup
          </Link>
        </div>
      </section>

      <Separator />

      <footer>
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-5 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>halaalvest</p>
          <p>Halal cooperative operations platform</p>
        </div>
      </footer>
    </main>
  )
}
