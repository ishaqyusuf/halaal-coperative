import { buttonVariants } from "@halaal-vest/ui/components/button"
import Link from "next/link"

const releaseSignals = [
  "Tenant dashboards for cooperative operations",
  "Public tenant sites with shared platform routing",
  "Halal-first savings, charges, and approval workflows",
] as const

const earlyAccessHref =
  "mailto:hello@halaal-vest.com?subject=Join%20the%20halaal-vest%20early%20access%20list&body=Hello%2C%0A%0AI%27d%20like%20to%20join%20the%20halaal-vest%20early%20access%20list.%0A%0AName%3A%0AOrganization%3A%0APhone%3A%0A%0AThanks."

const contactTeamHref =
  "mailto:hello@halaal-vest.com?subject=halaal-vest%20product%20inquiry&body=Hello%20halaal-vest%20team%2C%0A%0AI%27d%20like%20to%20learn%20more%20about%20the%20platform.%0A%0AName%3A%0AOrganization%3A%0APhone%3A%0A%0AThanks."

export function PrelaunchLanding() {
  return (
    <main className="min-h-svh overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(6,70,58,0.16),_transparent_28%),linear-gradient(180deg,_#f6f5ef_0%,_#fbfaf8_48%,_#f0ede4_100%)]">
      <section className="mx-auto flex min-h-svh w-full max-w-6xl flex-col justify-center gap-8 px-6 py-12 lg:px-10">
        <div className="rounded-[2rem] border border-stone-200/80 bg-white/90 p-7 shadow-[0_30px_100px_rgba(31,41,55,0.08)] backdrop-blur lg:p-10">
          <p className="text-xs font-medium uppercase tracking-[0.26em] text-emerald-900/70">
            Pre-Launch
          </p>
          <h1 className="mt-4 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tight text-stone-950 sm:text-6xl">
            Halaal-vest is getting ready to power the next generation of cooperative operations.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-stone-600">
            We are preparing the public launch experience now. Join the waitlist to get first
            access when tenant onboarding, internal dashboards, and public cooperative sites go live.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              className={buttonVariants({
                className: "bg-emerald-900 text-white hover:bg-emerald-800",
              })}
              href={earlyAccessHref}
            >
              Join the Early Access List
            </Link>
            <Link
              className={buttonVariants({
                className: "border-stone-300 bg-white text-stone-900 hover:bg-stone-50",
                variant: "outline",
              })}
              href={contactTeamHref}
            >
              Contact the Team
            </Link>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {releaseSignals.map((signal) => (
              <div
                key={signal}
                className="rounded-3xl border border-stone-200/80 bg-stone-50/90 p-4"
              >
                <p className="text-sm font-medium leading-6 text-stone-800">{signal}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
