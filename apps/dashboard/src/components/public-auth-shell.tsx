import type { ReactNode } from "react"
import { Badge } from "@halaalvest/ui/components/badge"
import { HalaalvestLogo } from "@halaalvest/ui/components/brand-logo"
import { cn } from "@halaalvest/ui/lib/utils"

export function PublicAuthShell({
  badge,
  children,
  className,
  contentClassName,
  description,
  footer,
  panel,
  title,
}: {
  badge: string
  children: ReactNode
  className?: string
  contentClassName?: string
  description: string
  footer?: ReactNode
  panel?: ReactNode
  title: string
}) {
  return (
    <main className="relative flex min-h-svh bg-public-canvas text-foreground">
      <nav className="pointer-events-none fixed inset-x-0 top-0 z-50 w-full">
        <div className="flex items-center px-4 py-3 sm:px-6">
          <div className="pointer-events-auto">
            <HalaalvestLogo
              markClassName="size-8"
              wordmarkClassName="text-base tracking-normal"
            />
          </div>
        </div>
      </nav>

      <section className="hidden w-1/2 border-r border-border bg-background/45 p-8 lg:flex">
        <div className="flex w-full flex-col justify-center">
          <div className="max-w-md">
            <Badge variant="outline">{badge}</Badge>
            <h1 className="mt-4 text-3xl leading-tight font-semibold">
              {title}
            </h1>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
          {panel ? (
            <div className="mt-8 border border-border bg-background/70 p-4 text-sm">
              {panel}
            </div>
          ) : null}
        </div>
      </section>

      <section className="flex w-full flex-col justify-center px-4 py-20 sm:px-6 lg:w-1/2 lg:px-12">
        <div className={cn("mx-auto w-full max-w-md", contentClassName)}>
          <div className="mb-6 lg:hidden">
            <div className="flex items-center justify-between gap-4">
              <HalaalvestLogo
                markClassName="size-8"
                wordmarkClassName="text-base tracking-normal"
              />
              <Badge variant="outline">{badge}</Badge>
            </div>
            <h1 className="mt-6 text-2xl leading-tight font-semibold">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>

          <div
            className={cn(
              "border border-border bg-background p-5 shadow-sm sm:p-6",
              className
            )}
          >
            {children}
          </div>

          {footer ? (
            <div className="mt-4 text-center text-xs leading-5 text-muted-foreground">
              {footer}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  )
}
