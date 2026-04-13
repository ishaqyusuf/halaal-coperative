import { Button } from "@halaal-vest/ui/components/button"

const capabilities = [
  {
    eyebrow: "Collections",
    title: "Move contributions, levies, and savings operations out of brittle spreadsheets.",
    body:
      "Give finance teams one place to monitor inflows, member balances, operational charges, and repayment readiness.",
  },
  {
    eyebrow: "Approvals",
    title: "Separate eligibility from liquidity so every loan decision stays clear and auditable.",
    body:
      "Halaal-vest helps cooperatives see who qualifies, what the pool can support, and which approvals still need attention.",
  },
  {
    eyebrow: "Tenant Sites",
    title: "Let each cooperative run a branded public presence without rebuilding core operations.",
    body:
      "Every tenant gets a public-facing site, an internal dashboard, and a shared platform backbone for growth.",
  },
] as const

const operatingRhythm = [
  "Track member onboarding, recurring savings, and internal controls in one workspace.",
  "Run halal cooperative financing with clear approval steps, charge rules, and repayment visibility.",
  "Publish tenant-specific websites while keeping the underlying platform standardized and fast.",
] as const

export function LaunchLanding() {
  return (
    <main className="min-h-svh overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(4,74,61,0.18),_transparent_28%),radial-gradient(circle_at_80%_20%,_rgba(211,168,81,0.20),_transparent_24%),linear-gradient(180deg,_#f3eee4_0%,_#fbfaf7_34%,_#f8f5ef_100%)]">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-8 lg:px-10 lg:py-12">
        <header className="relative overflow-hidden rounded-[2rem] border border-stone-200/80 bg-white/88 p-6 shadow-[0_30px_120px_rgba(27,42,38,0.10)] backdrop-blur lg:p-10">
          <div className="absolute inset-y-0 right-0 hidden w-[34rem] bg-[radial-gradient(circle_at_center,_rgba(4,74,61,0.12),_transparent_60%)] lg:block" />
          <div className="relative grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="max-w-3xl">
              <p className="text-xs font-medium uppercase tracking-[0.26em] text-emerald-900/70">
                Halaal-Vest
              </p>
              <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-[1.02] tracking-tight text-stone-950 sm:text-6xl lg:text-7xl">
                The operating system for modern halal cooperatives.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-stone-600 sm:text-lg">
                Launch member operations, internal approvals, tenant websites, and financial
                visibility from one shared platform designed for multi-tenant cooperative teams.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button className="bg-emerald-900 text-white hover:bg-emerald-800">
                  Book a Platform Walkthrough
                </Button>
                <Button
                  className="border-stone-300 bg-white text-stone-900 hover:bg-stone-50"
                  variant="outline"
                >
                  View the Product Story
                </Button>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {[
                  ["3 surfaces", "Marketing site, tenant dashboard, and tenant public site."],
                  ["Shared backend", "One API backbone for routing, notifications, and workflow logic."],
                  ["Halal-first", "Interest-free cooperative operations with clearer governance."],
                ].map(([label, note]) => (
                  <div key={label} className="rounded-3xl border border-stone-200/80 bg-stone-50/80 p-4">
                    <p className="text-sm font-semibold text-stone-950">{label}</p>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{note}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              <article className="rounded-[1.75rem] border border-emerald-200/70 bg-[linear-gradient(180deg,_rgba(5,80,67,0.95)_0%,_rgba(5,80,67,0.86)_100%)] p-6 text-white shadow-[0_18px_60px_rgba(5,80,67,0.24)]">
                <p className="text-xs uppercase tracking-[0.24em] text-emerald-100/70">
                  Platform Narrative
                </p>
                <p className="mt-3 text-2xl font-semibold tracking-tight">
                  One platform. Many cooperatives. Clearer operations.
                </p>
                <p className="mt-3 text-sm leading-7 text-emerald-50/88">
                  Standardize how savings groups onboard members, track contributions,
                  review loans, and manage internal visibility without flattening each
                  tenant’s identity.
                </p>
              </article>

              <article className="rounded-[1.75rem] border border-amber-200/80 bg-amber-50/90 p-6 shadow-[0_18px_60px_rgba(145,101,24,0.12)]">
                <p className="text-xs uppercase tracking-[0.24em] text-amber-900/70">
                  Operating Rhythm
                </p>
                <div className="mt-4 space-y-3">
                  {operatingRhythm.map((item, index) => (
                    <div key={item} className="flex gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-semibold text-amber-900 shadow-sm">
                        {index + 1}
                      </div>
                      <p className="text-sm leading-6 text-stone-700">{item}</p>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-3">
          {capabilities.map((capability) => (
            <article
              key={capability.eyebrow}
              className="rounded-[1.75rem] border border-stone-200/80 bg-white/86 p-6 shadow-sm"
            >
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-stone-500">
                {capability.eyebrow}
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-950">
                {capability.title}
              </h2>
              <p className="mt-4 text-sm leading-7 text-stone-600">{capability.body}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[1.75rem] border border-stone-200/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.92)_0%,_rgba(246,244,239,0.94)_100%)] p-6 shadow-sm lg:p-8">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-stone-500">
              Why It Matters
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
              Cooperatives need better speed, structure, and trust before they need more software.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-stone-600">
              Halaal-vest is built to reduce operational drift. It brings contribution
              tracking, loan governance, role-aware approvals, and public-facing tenant
              experiences into one clear system so each cooperative can operate with more confidence.
            </p>
          </article>

          <article className="rounded-[1.75rem] border border-stone-900/10 bg-stone-950 p-6 text-white shadow-[0_20px_80px_rgba(15,23,42,0.22)] lg:p-8">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-stone-400">
              Main Landing Page
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Launch-ready narrative, with a built-in pre-launch fallback.
            </h2>
            <p className="mt-4 text-sm leading-7 text-stone-300">
              The web app now supports two top-level states: a real launch landing page
              for go-live and a lighter pre-launch mode controlled through environment configuration.
            </p>
          </article>
        </section>
      </section>
    </main>
  )
}
