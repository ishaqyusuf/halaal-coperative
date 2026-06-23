import { cn } from "@halaalvest/ui/lib/utils"

export function DashboardDataTable({
  children,
  className,
  contentClassName,
}: {
  children: React.ReactNode
  className?: string
  contentClassName?: string
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[24px] border border-border/70 bg-card",
        className
      )}
    >
      <div className={contentClassName ?? "overflow-x-auto"}>{children}</div>
    </div>
  )
}

export function DashboardTable({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <table className={cn("w-full min-w-[640px] border-collapse", className)}>
      {children}
    </table>
  )
}

export function DashboardTableHead({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <thead className={cn("bg-muted/35", className)}>
      <tr>{children}</tr>
    </thead>
  )
}

export function DashboardTableHeaderCell({
  align = "left",
  children,
  className,
}: {
  align?: "left" | "right"
  children: React.ReactNode
  className?: string
}) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase",
        align === "right" ? "text-right" : "text-left",
        className
      )}
    >
      {children}
    </th>
  )
}

export function DashboardTableBody({
  children,
}: {
  children: React.ReactNode
}) {
  return <tbody>{children}</tbody>
}

export function DashboardTableRow({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <tr className={cn("border-t border-border/70", className)}>{children}</tr>
  )
}

export function DashboardTableCell({
  align = "left",
  children,
  className,
}: {
  align?: "left" | "right"
  children: React.ReactNode
  className?: string
}) {
  return (
    <td
      className={cn(
        "px-4 py-4 text-sm text-foreground",
        align === "right" ? "text-right" : "text-left",
        className
      )}
    >
      {children}
    </td>
  )
}
