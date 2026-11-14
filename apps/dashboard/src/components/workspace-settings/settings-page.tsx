import type { ReactNode } from "react"
import { cn } from "@halaalvest/ui/lib/utils"
import { DashboardPageShell } from "@/components/dashboard"

/**
 * A plain workspace settings page: one short line, at most one main action,
 * then the sections. The top bar carries the page title, so there is no
 * heading here.
 */
export function SettingsPage({
  action,
  children,
  className,
  intro,
}: {
  action?: ReactNode
  children: ReactNode
  className?: string
  intro?: string
}) {
  return (
    <DashboardPageShell>
      <div className={cn("grid w-full max-w-[820px] min-w-0 gap-8", className)}>
        {intro || action ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {intro ? (
              <p className="text-lg text-muted-foreground">{intro}</p>
            ) : null}
            {action ? <div className="shrink-0">{action}</div> : null}
          </div>
        ) : null}
        {children}
      </div>
    </DashboardPageShell>
  )
}

/** A titled part of a settings page with at most one action. */
export function SettingsSection({
  action,
  children,
  description,
  title,
}: {
  action?: ReactNode
  children: ReactNode
  description?: string
  title: string
}) {
  return (
    <section className="grid min-w-0 gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          {description ? (
            <p className="mt-1 text-base text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export type SettingsFact = {
  label: string
  /** Shown in muted text when the value is missing. */
  missing?: boolean
  value: ReactNode
}

/** Label and value rows; the label sits above the value on phones. */
export function SettingsFacts({ facts }: { facts: SettingsFact[] }) {
  return (
    <dl className="divide-y divide-border border-y border-border">
      {facts.map((fact) => (
        <div
          className="grid gap-1 px-1 py-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:gap-6 sm:px-3"
          data-settings-fact={fact.label}
          key={fact.label}
        >
          <dt className="text-base text-muted-foreground">{fact.label}</dt>
          <dd
            className={cn(
              "text-lg [overflow-wrap:anywhere]",
              fact.missing ? "text-muted-foreground" : "text-foreground"
            )}
          >
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** A plain notice line. */
export function SettingsNotice({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-(--ui-radius-control) border border-border bg-muted/50 px-4 py-3 text-base text-foreground">
      {children}
    </p>
  )
}

/** A short "something is missing" line for an empty or unavailable page. */
export function SettingsEmpty({
  body,
  title,
}: {
  body?: string
  title: string
}) {
  return (
    <div className="rounded-(--ui-radius-control) border border-border px-4 py-6 sm:px-6">
      <p className="text-lg font-semibold text-foreground">{title}</p>
      {body ? (
        <p className="mt-1 text-base text-muted-foreground">{body}</p>
      ) : null}
    </div>
  )
}
