import type { ReactNode } from "react"
import { cn } from "@halaalvest/ui/lib/utils"
import { DashboardPageShell } from "@/components/dashboard"
import { financeMenuItems } from "@/components/finance-menu"
import { SecondaryMenu } from "@/components/secondary-menu"

/**
 * The Finance setup page frame: section menu, one short line, the body.
 * The top bar carries the page title, so there is no heading here.
 */
export function FinanceSettingsFrame({
  children,
  className,
  intro,
}: {
  children: ReactNode
  className?: string
  intro?: string
}) {
  return (
    <DashboardPageShell>
      <div className={cn("w-full max-w-[820px]", className)}>
        <SecondaryMenu items={financeMenuItems} />
        <div className="mt-2 grid min-w-0 gap-8">
          {intro ? (
            <p className="text-lg text-muted-foreground">{intro}</p>
          ) : null}
          {children}
        </div>
      </div>
    </DashboardPageShell>
  )
}

/** A titled part of a settings page with at most one main action. */
export function FinanceSettingsSection({
  action,
  children,
  title,
}: {
  action?: ReactNode
  children: ReactNode
  title: string
}) {
  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

/** A plain notice line (for example why past records can't change). */
export function FinanceSettingsNotice({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-(--ui-radius-control) border border-border bg-muted/50 px-4 py-3 text-base text-foreground">
      {children}
    </p>
  )
}
