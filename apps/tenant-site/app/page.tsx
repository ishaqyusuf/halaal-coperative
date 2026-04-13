import { sampleDashboardSnapshot } from "@amanah/domain"
import { Button } from "@amanah/ui/components/button"
import { formatCurrency } from "@amanah/utils"

export default function Page() {
  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top,_rgba(196,123,33,0.12),_transparent_38%),linear-gradient(180deg,_#fffaf3_0%,_#ffffff_55%,_#f8f1e7_100%)]">
      <section className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12 lg:px-10 lg:py-16">
        <div className="max-w-3xl">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-[0.24em]">
            Tenant Public Site
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Public-facing cooperative website for each tenant.
          </h1>
          <p className="text-muted-foreground mt-5 text-base leading-7">
            This app mirrors the `plot-keys` `tenant-site` role: every cooperative can
            publish its own web presence while reusing shared domain and notification
            patterns from the monorepo.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-3xl border border-border/60 bg-background/90 p-5 shadow-sm">
            <p className="text-muted-foreground text-xs uppercase tracking-[0.22em]">
              Cooperative
            </p>
            <p className="mt-3 text-xl font-semibold">{sampleDashboardSnapshot.tenantName}</p>
          </article>
          <article className="rounded-3xl border border-border/60 bg-background/90 p-5 shadow-sm">
            <p className="text-muted-foreground text-xs uppercase tracking-[0.22em]">
              Members
            </p>
            <p className="mt-3 text-xl font-semibold">{sampleDashboardSnapshot.memberCount}</p>
          </article>
          <article className="rounded-3xl border border-border/60 bg-background/90 p-5 shadow-sm">
            <p className="text-muted-foreground text-xs uppercase tracking-[0.22em]">
              Available pool
            </p>
            <p className="mt-3 text-xl font-semibold">
              {formatCurrency(sampleDashboardSnapshot.availablePool)}
            </p>
          </article>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button>Become a Member</Button>
          <Button variant="outline">Sign In</Button>
        </div>
      </section>
    </main>
  )
}
