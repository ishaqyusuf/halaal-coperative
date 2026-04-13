import { Button } from "@amanah/ui/components/button"

const pillars = [
  "Multi-tenant cooperative operations",
  "Interest-free savings and loan workflows",
  "Public tenant sites plus secure internal dashboards",
]

export default function Page() {
  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top,_rgba(28,95,83,0.15),_transparent_40%),linear-gradient(180deg,_#f5faf8_0%,_#ffffff_48%,_#eef5f1_100%)]">
      <section className="mx-auto flex min-h-svh max-w-6xl flex-col justify-center gap-10 px-6 py-12 lg:px-10">
        <div className="max-w-3xl">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-[0.24em]">
            Cooperative SaaS Web
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Marketing surface for the cooperative SaaS.
          </h1>
          <p className="text-muted-foreground mt-5 max-w-2xl text-base leading-7">
            This app is intentionally scoped like `plot-keys` `website`: it owns the
            public SaaS narrative, product positioning, and top-of-funnel experience.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {pillars.map((pillar) => (
            <article
              key={pillar}
              className="rounded-3xl border border-border/60 bg-background/90 p-5 shadow-sm"
            >
              <p className="text-sm font-medium leading-6">{pillar}</p>
            </article>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button>Request Early Access</Button>
          <Button variant="outline">Explore Tenant Dashboard</Button>
        </div>
      </section>
    </main>
  )
}
