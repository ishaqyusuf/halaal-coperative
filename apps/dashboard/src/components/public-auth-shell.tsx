import type { ReactNode } from "react"
import { HalaalvestLogo } from "@halaalvest/ui/components/brand-logo"
import { cn } from "@halaalvest/ui/lib/utils"

// One plain column for every public sign-in and joining page: logo bar,
// the cooperative's name, one heading, at most one short line, then the form.
export function PublicAuthShell({
  children,
  cooperativeName,
  description,
  footer,
  headerAction,
  title,
  width = "narrow",
}: {
  children: ReactNode
  cooperativeName?: string | null
  description?: ReactNode
  footer?: ReactNode
  headerAction?: ReactNode
  title: ReactNode
  width?: "narrow" | "wide"
}) {
  return (
    <main className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <HalaalvestLogo
            markClassName="size-8"
            wordmarkClassName="text-lg tracking-normal"
          />
          {headerAction}
        </div>
      </header>

      <div className="flex flex-1 justify-center px-4 pt-8 pb-12 sm:px-6 sm:pt-14">
        <div
          className={cn("w-full", width === "wide" ? "max-w-xl" : "max-w-md")}
        >
          {cooperativeName ? (
            <p className="text-base font-semibold text-primary">
              {cooperativeName}
            </p>
          ) : null}
          <h1 className="mt-2 text-3xl text-balance sm:text-4xl">{title}</h1>
          {description ? (
            <div className="mt-3 text-lg leading-relaxed text-muted-foreground">
              {description}
            </div>
          ) : null}

          <div className="mt-8">{children}</div>

          {footer ? (
            <div className="mt-8 text-lg text-foreground">{footer}</div>
          ) : null}
        </div>
      </div>
    </main>
  )
}
