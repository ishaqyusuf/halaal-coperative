import Link from "next/link"
import { Badge } from "@halaalvest/ui/components/badge"

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
    <main className="web-readable min-h-svh bg-background">
      <section className="mx-auto flex min-h-svh w-full max-w-7xl flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b pb-5">
          <Link
            href="/"
            className="text-sm font-semibold tracking-tight text-foreground"
          >
            Halaalvest
          </Link>
          <Link
            href="/"
            className="text-sm text-muted-foreground transition hover:text-foreground"
          >
            Back to site
          </Link>
        </header>

        <div className="grid flex-1 gap-8 lg:grid-cols-[0.78fr_1fr] lg:items-start">
          <aside className="flex flex-col border bg-card p-6 text-card-foreground lg:sticky lg:top-8 lg:p-8">
            <div className="flex flex-col gap-5">
              <Badge variant="outline">{eyebrow}</Badge>
              <div className="flex flex-col gap-4">
                <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                  {title}
                </h1>
                <p className="max-w-xl text-sm leading-7 text-muted-foreground">
                  {description}
                </p>
              </div>
            </div>
          </aside>

          <section className="min-w-0 lg:py-8">{children}</section>
        </div>
      </section>
    </main>
  )
}
