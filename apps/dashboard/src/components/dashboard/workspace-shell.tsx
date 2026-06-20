import { cn } from "@halaalvest/ui/lib/utils"
import { DashboardEmptyState } from "./empty-state"
import { DashboardPageHeader } from "./header"

export function DashboardPageShell({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <section className={cn("flex flex-col gap-6", className)}>{children}</section>
}

export function DashboardPageTitle({
  action,
  description,
  title,
}: {
  action?: React.ReactNode
  description?: string
  title: string
}) {
  return (
    <DashboardPageHeader
      actions={action}
      description={description}
      title={title}
    />
  )
}

export function WorkspacePageShell({
  actions,
  children,
  description,
  eyebrow,
  title,
}: {
  actions?: React.ReactNode
  children: React.ReactNode
  description: string
  eyebrow: string
  title: string
}) {
  return (
    <DashboardPageShell>
      <DashboardPageHeader
        actions={actions}
        badge={eyebrow}
        description={description}
        eyebrow="Workspace"
        title={title}
      />
      {children}
    </DashboardPageShell>
  )
}

export function WorkspaceEmptyState({
  body,
  title,
}: {
  body: string
  title: string
}) {
  return <DashboardEmptyState body={body} title={title} />
}
