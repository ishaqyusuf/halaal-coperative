import Link from "next/link"
import { Badge } from "@halaalvest/ui/components/badge"
import { Separator } from "@halaalvest/ui/components/separator"

const setupPath = [
  {
    label: "Verify contact",
    text: "Confirm the primary admin before workspace creation.",
  },
  {
    label: "Create workspace",
    text: "Save the cooperative profile and first password.",
  },
  {
    label: "Open setup",
    text: "Move into charges, shares, members, loans, and commitments.",
  },
]

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
    <main className="min-h-svh bg-background">
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
          <aside className="flex flex-col gap-8 border bg-card p-6 text-card-foreground lg:sticky lg:top-8 lg:min-h-[calc(100svh-7rem)] lg:p-8">
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

            <Separator />

            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Setup path
              </p>
              {setupPath.map((step, index) => (
                <div
                  className="grid grid-cols-[2rem_1fr] gap-3 border bg-muted/35 p-3"
                  key={step.label}
                >
                  <div className="flex size-8 items-center justify-center border bg-background text-xs font-medium">
                    {index + 1}
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium text-foreground">
                      {step.label}
                    </p>
                    <p className="text-xs leading-5 text-muted-foreground">
                      {step.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto border bg-muted/35 p-4">
              <p className="text-sm font-medium text-foreground">
                Built for governed cooperative operations.
              </p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Signup only opens the workspace. Live finance work continues in
                the guided dashboard setup after verification.
              </p>
            </div>
          </aside>

          <section className="min-w-0 lg:py-8">{children}</section>
        </div>
      </section>
    </main>
  )
}
