import { Badge } from "@halaal-vest/ui/components/badge"
import { buttonVariants } from "@halaal-vest/ui/components/button"
import { Separator } from "@halaal-vest/ui/components/separator"
import Link from "next/link"

const outcomes = [
  {
    label: "Shared financial visibility",
    note: "Contribution activity, levies, balances, and repayment readiness stay readable across the cooperative.",
  },
  {
    label: "Governed halal workflows",
    note: "Eligibility, liquidity, approvals, and repayment follow-up are handled as separate operational steps.",
  },
  {
    label: "Tenant identity without chaos",
    note: "Each cooperative gets its own public presence and workspace while the platform stays standardized underneath.",
  },
] as const

const experiencePillars = [
  "Guide a primary contact from signup into workspace creation without exposing internal setup complexity.",
  "Give operators one rhythm for onboarding, contributions, approvals, notifications, and reporting.",
  "Keep the cooperative's public presence polished while back-office controls stay role-aware and auditable.",
] as const

const journey = [
  {
    kicker: "Step 01",
    title: "Public signup begins with one trusted contact.",
    body: "The first interaction is intentionally light: verify the primary contact, collect the cooperative basics, and prepare the tenant workspace.",
  },
  {
    kicker: "Step 02",
    title: "The platform creates both the workspace and the public surface.",
    body: "The dashboard, tenant hostname, and onboarding follow-up are treated as one connected system instead of separate tools.",
  },
  {
    kicker: "Step 03",
    title: "Operators take over from a calmer, governed environment.",
    body: "Once inside, finance and admin teams can move from setup into day-to-day cooperative operations with clearer structure.",
  },
] as const

const proofPoints = [
  [
    "One public flow",
    "Signup, verification, and onboarding are already wired into the web surface.",
  ],
  [
    "One tenant host",
    "Each cooperative can present a branded public face and protected workspace from the same host model.",
  ],
  [
    "One operational backbone",
    "Shared API, notifications, and domain rules reduce drift as more cooperatives come online.",
  ],
] as const

export function LaunchLanding() {
  return (
    <main
      id="top"
      className="min-h-svh overflow-hidden bg-[linear-gradient(180deg,var(--color-background)_0%,color-mix(in_oklab,var(--color-secondary)_40%,white)_48%,var(--color-background)_100%)]"
    >
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--color-primary)_22%,transparent)_0%,transparent_56%),radial-gradient(circle_at_top_right,color-mix(in_oklab,var(--color-chart-1)_34%,transparent)_0%,transparent_44%),linear-gradient(180deg,color-mix(in_oklab,var(--color-card)_84%,transparent)_0%,transparent_100%)]" />
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-6 py-6 lg:px-10 lg:py-8">
          <header className="flex items-center justify-between rounded-full border border-border/80 bg-background/80 px-4 py-3 backdrop-blur sm:px-5">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                H
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold tracking-tight text-foreground">
                  halaal-vest
                </span>
                <span className="text-[0.7rem] tracking-[0.24em] text-muted-foreground uppercase">
                  Cooperative platform
                </span>
              </div>
            </div>

            <nav className="hidden items-center gap-2 md:flex">
              <Link
                className={buttonVariants({
                  className: "rounded-full px-4",
                  variant: "ghost",
                })}
                href="#journey"
              >
                Journey
              </Link>
              <Link
                className={buttonVariants({
                  className: "rounded-full px-4",
                  variant: "ghost",
                })}
                href="#model"
              >
                Model
              </Link>
              <Link
                className={buttonVariants({
                  className: "rounded-full px-4",
                  size: "lg",
                })}
                href="/signup"
              >
                Start signup
              </Link>
            </nav>
          </header>

          <section className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
            <div className="flex max-w-3xl flex-col gap-8">
              <div className="flex flex-col gap-5">
                <Badge variant="secondary" className="w-fit">
                  Launch-ready public homepage
                </Badge>
                <div className="flex flex-col gap-5">
                  <h1 className="max-w-4xl font-heading text-5xl leading-[0.96] font-semibold tracking-[-0.04em] text-foreground sm:text-6xl lg:text-7xl">
                    A cleaner, calmer way to run modern halal cooperatives.
                  </h1>
                  <p className="max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                    halaal-vest turns signup, tenant identity, internal
                    approvals, and financial operations into one connected
                    operating surface, so growth feels intentional instead of
                    improvised.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  className={buttonVariants({
                    className:
                      "rounded-full px-5 shadow-[0_14px_40px_color-mix(in_oklab,var(--color-primary)_20%,transparent)]",
                    size: "lg",
                  })}
                  href="/signup"
                >
                  Start signup
                </Link>
                <Link
                  className={buttonVariants({
                    className: "rounded-full px-5",
                    size: "lg",
                    variant: "outline",
                  })}
                  href="#model"
                >
                  Explore the product story
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {proofPoints.map(([label, note]) => (
                  <article
                    key={label}
                    className="rounded-[1.5rem] border border-border/80 bg-card/80 p-4 shadow-[0_18px_60px_color-mix(in_oklab,var(--color-foreground)_6%,transparent)] backdrop-blur"
                  >
                    <p className="text-sm font-semibold text-card-foreground">
                      {label}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {note}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 -z-10 rounded-[2rem] bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--color-chart-1)_22%,transparent)_0%,transparent_54%),radial-gradient(circle_at_bottom_right,color-mix(in_oklab,var(--color-primary)_18%,transparent)_0%,transparent_58%)] blur-2xl" />
              <section className="grid gap-4 rounded-[2rem] border border-border/80 bg-card/90 p-5 shadow-[0_30px_100px_color-mix(in_oklab,var(--color-foreground)_10%,transparent)] backdrop-blur sm:p-6">
                <article className="rounded-[1.6rem] bg-[linear-gradient(160deg,color-mix(in_oklab,var(--color-primary)_88%,black)_0%,color-mix(in_oklab,var(--color-primary)_62%,var(--color-chart-2))_100%)] p-6 text-primary-foreground">
                  <p className="text-[0.7rem] tracking-[0.28em] text-primary-foreground/70 uppercase">
                    Operating promise
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                    Governance, visibility, and tenant identity in one flow.
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-primary-foreground/80">
                    The homepage is not just a brochure surface. It becomes the
                    front door to a structured cooperative setup experience and
                    a more dependable internal operating rhythm.
                  </p>
                </article>

                <div className="grid gap-3 sm:grid-cols-[0.92fr_1.08fr]">
                  <article className="rounded-[1.4rem] border border-border/80 bg-background/88 p-5">
                    <p className="text-[0.7rem] tracking-[0.24em] text-muted-foreground uppercase">
                      What teams feel
                    </p>
                    <div className="mt-4 flex flex-col gap-3">
                      <div className="rounded-2xl bg-secondary p-3 text-sm text-secondary-foreground">
                        Less spreadsheet drift
                      </div>
                      <div className="rounded-2xl bg-secondary p-3 text-sm text-secondary-foreground">
                        Clearer approval steps
                      </div>
                      <div className="rounded-2xl bg-secondary p-3 text-sm text-secondary-foreground">
                        Stronger public trust
                      </div>
                    </div>
                  </article>

                  <article className="rounded-[1.4rem] border border-border/80 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-background)_80%,white)_0%,color-mix(in_oklab,var(--color-secondary)_55%,white)_100%)] p-5">
                    <p className="text-[0.7rem] tracking-[0.24em] text-muted-foreground uppercase">
                      Product rhythm
                    </p>
                    <div className="mt-4 flex flex-col gap-4">
                      {experiencePillars.map((item, index) => (
                        <div key={item} className="flex gap-3">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary">
                            0{index + 1}
                          </div>
                          <p className="text-sm leading-6 text-foreground/80">
                            {item}
                          </p>
                        </div>
                      ))}
                    </div>
                  </article>
                </div>
              </section>
            </div>
          </section>
        </div>
      </section>

      <section
        id="model"
        className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8 lg:px-10 lg:py-10"
      >
        <div className="grid gap-4 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
          <div className="flex flex-col gap-3">
            <Badge variant="outline" className="w-fit">
              Operating model
            </Badge>
            <h2 className="max-w-xl font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Built for cooperatives that want structure without losing their
              identity.
            </h2>
          </div>
          <p className="max-w-3xl text-base leading-8 text-muted-foreground">
            The platform is designed around a simple idea: public trust,
            internal control, and financial clarity should reinforce each other.
            The homepage introduces that story, then hands the visitor directly
            into a guided signup experience.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {outcomes.map((outcome) => (
            <article
              key={outcome.label}
              className="rounded-[1.75rem] border border-border/80 bg-card p-6 shadow-[0_18px_50px_color-mix(in_oklab,var(--color-foreground)_5%,transparent)]"
            >
              <p className="text-xs font-medium tracking-[0.24em] text-muted-foreground uppercase">
                {outcome.label}
              </p>
              <p className="mt-4 text-base leading-7 text-card-foreground">
                {outcome.note}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="journey"
        className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8 lg:px-10 lg:py-10"
      >
        <Separator />
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
          <div className="flex flex-col gap-3">
            <Badge variant="outline" className="w-fit">
              One connected journey
            </Badge>
            <h2 className="max-w-md font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              The homepage should feel like the first step of the product, not a
              detached marketing layer.
            </h2>
          </div>

          <div className="grid gap-4">
            {journey.map((item) => (
              <article
                key={item.kicker}
                className="rounded-[1.75rem] border border-border/80 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-card)_88%,white)_0%,color-mix(in_oklab,var(--color-secondary)_36%,white)_100%)] p-6"
              >
                <p className="text-xs font-medium tracking-[0.26em] text-muted-foreground uppercase">
                  {item.kicker}
                </p>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight text-card-foreground">
                  {item.title}
                </h3>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8 lg:px-10 lg:py-10">
        <Separator />
        <div className="grid gap-4 lg:grid-cols-[1.12fr_0.88fr]">
          <article className="rounded-[2rem] border border-border/80 bg-card p-6 shadow-[0_24px_80px_color-mix(in_oklab,var(--color-foreground)_6%,transparent)] lg:p-8">
            <Badge variant="secondary">Why it lands differently</Badge>
            <h2 className="mt-4 max-w-2xl font-heading text-3xl font-semibold tracking-tight text-card-foreground sm:text-4xl">
              Most cooperative software starts from forms and tables. This one
              starts from trust.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">
              A cooperative’s public impression, signup path, and internal
              operations are part of the same experience. When those pieces
              align, adoption feels smoother for leadership and more credible
              for members.
            </p>
          </article>

          <article className="rounded-[2rem] border border-primary/15 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-primary)_92%,black)_0%,color-mix(in_oklab,var(--color-primary)_72%,var(--color-chart-3))_100%)] p-6 text-primary-foreground shadow-[0_24px_80px_color-mix(in_oklab,var(--color-primary)_24%,transparent)] lg:p-8">
            <p className="text-xs font-medium tracking-[0.26em] text-primary-foreground/70 uppercase">
              Ready for rollout
            </p>
            <p className="mt-4 text-2xl font-semibold tracking-tight">
              Turn the homepage on when you want the public story live. Turn it
              off and route visitors straight to signup.
            </p>
            <p className="mt-4 text-sm leading-7 text-primary-foreground/80">
              The new `SHOW_HOME_PAGE` env makes the public entry reversible
              without changing routes or removing the marketing surface from the
              codebase.
            </p>
          </article>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 pt-8 pb-12 lg:px-10 lg:pt-10 lg:pb-16">
        <div className="rounded-[2rem] border border-border/80 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-card)_90%,white)_0%,color-mix(in_oklab,var(--color-secondary)_46%,white)_100%)] p-6 shadow-[0_24px_80px_color-mix(in_oklab,var(--color-foreground)_6%,transparent)] lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="flex max-w-2xl flex-col gap-3">
              <Badge variant="outline" className="w-fit">
                Start here
              </Badge>
              <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Open the cooperative setup flow from a homepage that already
                feels production-ready.
              </h2>
              <p className="text-base leading-8 text-muted-foreground">
                Visitors can move from story to action immediately, while
                operators keep the option to hide the homepage and route traffic
                directly into signup when needed.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                className={buttonVariants({
                  className: "rounded-full px-5",
                  size: "lg",
                })}
                href="/signup"
              >
                Start signup
              </Link>
              <Link
                className={buttonVariants({
                  className: "rounded-full px-5",
                  size: "lg",
                  variant: "outline",
                })}
                href="#top"
              >
                Back to top
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
