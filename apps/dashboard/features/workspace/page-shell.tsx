import { cn } from "@halaal-vest/ui/lib/utils"
import { DashboardPageHeader, DashboardSectionCard } from "@/components/dashboard/primitives"

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
  return <DashboardPageHeader actions={action} description={description} title={title} />
}

export function WorkspacePageShell({
  children,
  description,
  eyebrow,
  title,
}: {
  children: React.ReactNode
  description: string
  eyebrow: string
  title: string
}) {
  return (
    <DashboardPageShell>
      <DashboardPageHeader badge={eyebrow} description={description} eyebrow="Workspace" title={title} />
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
  return (
    <DashboardSectionCard className="border-dashed bg-background/80 p-8 text-center">
      <h3 className="text-xl font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{body}</p>
    </DashboardSectionCard>
  )
}
