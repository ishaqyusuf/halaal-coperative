import Link from "next/link"

export function SignupShell({
  children,
  eyebrow,
  title,
  description,
}: {
  children: React.ReactNode
  description: string
  eyebrow: string
  title: string
}) {
  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top,_rgba(4,74,61,0.14),_transparent_30%),linear-gradient(180deg,_#f7f3ea_0%,_#fcfbf8_40%,_#f5efe4_100%)]">
      <section className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-8 px-6 py-8 lg:px-10 lg:py-12">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold tracking-tight text-stone-950">
            halaal-vest
          </Link>
          <Link href="/" className="text-sm text-stone-600 transition hover:text-stone-950">
            Back to site
          </Link>
        </header>

        <div className="grid flex-1 gap-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
          <section className="rounded-[2rem] border border-stone-200/80 bg-stone-950 p-8 text-white shadow-[0_24px_80px_rgba(15,23,42,0.22)] lg:p-10">
            <p className="text-xs uppercase tracking-[0.28em] text-emerald-200/70">{eyebrow}</p>
            <h1 className="mt-4 max-w-md text-4xl font-semibold tracking-tight sm:text-5xl">
              {title}
            </h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-stone-300">{description}</p>

            <div className="mt-10 space-y-4 text-sm text-stone-200">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                What we ask: a verified primary contact plus a few basic cooperative details.
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                Why we ask it: to open the dashboard, prepare the public site, and route the workspace correctly.
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                What happens next: financial rules and deeper setup continue inside the dashboard after creation.
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-stone-200/80 bg-white/92 p-6 shadow-[0_24px_80px_rgba(88,52,24,0.10)] backdrop-blur lg:p-8">
            {children}
          </section>
        </div>
      </section>
    </main>
  )
}
