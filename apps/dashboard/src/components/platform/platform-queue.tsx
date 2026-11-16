"use client"

import { Button } from "@halaalvest/ui/components/button"
import { ChevronRight } from "lucide-react"
import type { ReactNode } from "react"
import { WorkspaceEmptyState } from "@/components/dashboard"

export type PlatformQueueRow = {
  badge: ReactNode
  /** Short facts shown as columns on desktop and lines on phones. */
  cells: { label: string; value: ReactNode }[]
  id: string
  subtitle?: string | null
  title: string
}

/**
 * A platform queue: a table on desktop, tap-to-open rows on phones. A row
 * always opens the record's own sheet; there are no row menus.
 */
export function PlatformQueue({
  columns,
  empty,
  error,
  hasMore,
  loading,
  loadingMore,
  onLoadMore,
  onOpen,
  onRetry,
  rows,
}: {
  columns: string[]
  empty: { body: string; title: string }
  error: string | null
  hasMore: boolean
  loading: boolean
  loadingMore: boolean
  onLoadMore: () => void
  onOpen: (id: string) => void
  onRetry: () => void
  rows: PlatformQueueRow[]
}) {
  if (loading) {
    return (
      <p className="py-8 text-lg text-muted-foreground" role="status">
        Loading…
      </p>
    )
  }

  if (error && rows.length === 0) {
    return (
      <div className="grid justify-items-start gap-3 py-6" role="alert">
        <p className="text-lg">{error}</p>
        <Button
          size="touch"
          className="px-5 text-base"
          onClick={onRetry}
          variant="outline"
        >
          Try again
        </Button>
      </div>
    )
  }

  if (rows.length === 0) {
    return <WorkspaceEmptyState body={empty.body} title={empty.title} />
  }

  return (
    <div className="grid gap-4">
      <div className="hidden overflow-hidden rounded-xl border border-border bg-background md:block">
        <table className="w-full text-left text-base">
          <thead className="border-b border-border bg-muted/50 text-sm text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <th className="px-4 py-3 font-medium" key={column} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr
                className="cursor-pointer hover:bg-muted/40"
                key={row.id}
                onClick={() => onOpen(row.id)}
              >
                <td className="px-4 py-4">
                  <button
                    className="grid text-left focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
                    onClick={(event) => {
                      event.stopPropagation()
                      onOpen(row.id)
                    }}
                    type="button"
                  >
                    <span className="font-semibold text-foreground">
                      {row.title}
                    </span>
                    {row.subtitle ? (
                      <span className="[overflow-wrap:anywhere] text-muted-foreground">
                        {row.subtitle}
                      </span>
                    ) : null}
                  </button>
                </td>
                <td className="px-4 py-4">{row.badge}</td>
                {row.cells.map((cell) => (
                  <td className="px-4 py-4 text-foreground" key={cell.label}>
                    {cell.value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border border-y border-border md:hidden">
        {rows.map((row) => (
          <li key={row.id}>
            <button
              className="flex min-h-[72px] w-full items-center gap-3 py-4 text-left focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
              onClick={() => onOpen(row.id)}
              type="button"
            >
              <span className="grid min-w-0 flex-1 gap-1">
                <span className="truncate text-lg font-semibold text-foreground">
                  {row.title}
                </span>
                {row.subtitle ? (
                  <span className="truncate text-base text-muted-foreground">
                    {row.subtitle}
                  </span>
                ) : null}
                <span className="mt-1">{row.badge}</span>
                {row.cells.map((cell) => (
                  <span
                    className="text-base text-muted-foreground"
                    key={cell.label}
                  >
                    {cell.label}:{" "}
                    <span className="text-foreground">{cell.value}</span>
                  </span>
                ))}
              </span>
              <ChevronRight
                aria-hidden="true"
                className="size-5 shrink-0 text-muted-foreground"
              />
            </button>
          </li>
        ))}
      </ul>

      {error ? (
        <p className="text-base text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {hasMore ? (
        <Button
          size="touch"
          className="justify-self-start px-5 text-base"
          disabled={loadingMore}
          onClick={onLoadMore}
          variant="outline"
        >
          {loadingMore ? "Loading…" : "Show more"}
        </Button>
      ) : null}
    </div>
  )
}
