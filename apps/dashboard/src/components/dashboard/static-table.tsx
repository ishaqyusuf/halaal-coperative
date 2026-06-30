import type { ReactNode } from "react"
import { cn } from "@halaalvest/ui/lib/utils"

export type TableColumn<TItem> = {
  align?: "left" | "right"
  key: string
  label: string
  render: (item: TItem) => ReactNode
}

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

function StaticSkeletonCell({
  className,
  type = "text",
}: {
  className?: string
  type?: "text" | "badge"
}) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-full bg-muted/60",
        type === "badge" ? "h-6 w-20" : "h-4 w-24",
        className
      )}
    />
  )
}

export function TableSkeleton<TItem>({
  columns,
  rowCount = 8,
}: {
  columns: Array<TableColumn<TItem>>
  rowCount?: number
}) {
  return (
    <DashboardDataTable>
      <DashboardTable>
        <DashboardTableHead>
          {columns.map((column) => (
            <DashboardTableHeaderCell key={column.key} align={column.align}>
              {column.label}
            </DashboardTableHeaderCell>
          ))}
        </DashboardTableHead>
        <DashboardTableBody>
          {Array.from({ length: rowCount }).map((_, index) => (
            <DashboardTableRow key={index}>
              {columns.map((column) => (
                <DashboardTableCell key={column.key} align={column.align}>
                  <StaticSkeletonCell
                    type={column.align === "right" ? "badge" : "text"}
                  />
                </DashboardTableCell>
              ))}
            </DashboardTableRow>
          ))}
        </DashboardTableBody>
      </DashboardTable>
    </DashboardDataTable>
  )
}

export function TableEmptyState({
  body,
  title,
}: {
  body: string
  title: string
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-border/70 bg-card px-6 py-10 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  )
}

export function TableNoResults({ body }: { body: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-border/70 bg-card px-6 py-10 text-center">
      <p className="text-sm font-medium text-foreground">No matching rows</p>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  )
}
