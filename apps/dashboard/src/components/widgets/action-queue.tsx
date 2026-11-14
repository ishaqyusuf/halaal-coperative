"use client"

import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { cn } from "@halaalvest/ui/lib/utils"
import { CircleCheck, ChevronRight } from "lucide-react"
import type { OverviewAttentionItem } from "@/lib/dashboard/overview-attention"

/** The work waiting for this person, as one tappable row per queue. */
export function ActionQueue({ items }: { items: OverviewAttentionItem[] }) {
  return (
    <section
      aria-labelledby="overview-attention-title"
      className="min-w-0 rounded-(--ui-radius-surface) border border-border bg-card p-5"
      id="needs-attention"
    >
      <h2
        className="text-xl font-semibold text-foreground"
        id="overview-attention-title"
      >
        Needs your attention
      </h2>
      {items.length > 0 ? (
        <ul className="mt-3 divide-y divide-border">
          {items.map((item) => (
            <li key={item.key}>
              <Link
                className="group -mx-2 flex min-h-14 items-center gap-4 rounded-(--ui-radius-control) px-2 py-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
                href={item.href}
              >
                <span
                  className={cn(
                    "flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full px-2 text-lg font-semibold tabular-nums",
                    item.urgent
                      ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100"
                      : "bg-muted text-foreground"
                  )}
                >
                  {item.count}
                </span>
                <span className="min-w-0 flex-1 text-base font-medium text-foreground first-letter:uppercase">
                  {item.label}
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 flex items-center gap-3 text-base text-foreground">
          <CircleCheck
            aria-hidden="true"
            className="size-6 shrink-0 text-emerald-600"
          />
          You're all caught up.
        </p>
      )}
    </section>
  )
}
