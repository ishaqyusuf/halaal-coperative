"use client"

import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { cn } from "@halaalvest/ui/lib/utils"
import { ChevronRight } from "lucide-react"

export type SummaryCardTone = "default" | "good" | "attention"

type SummaryCardProps = {
  /** Three in a row on phones: smaller number, no detail line below `sm`. */
  compact?: boolean
  /** Short plain line under the number. */
  detail?: string
  label: string
  tone?: SummaryCardTone
  value: string
} & (
  | { href: string; onClick?: never; selected?: never }
  | { href?: never; onClick: () => void; selected?: boolean }
  | { href?: never; onClick?: never; selected?: never }
)

const toneBar: Record<SummaryCardTone, string> = {
  attention: "bg-amber-500",
  default: "bg-border",
  good: "bg-emerald-600",
}

function SummaryCardBody({
  compact = false,
  detail,
  interactive,
  label,
  tone = "default",
  value,
}: Pick<SummaryCardProps, "compact" | "detail" | "label" | "tone" | "value"> & {
  interactive: boolean
}) {
  return (
    <>
      <span className="flex items-center justify-between gap-2 text-base font-medium text-foreground">
        {label}
        {interactive ? (
          <ChevronRight
            aria-hidden="true"
            className={cn(
              "size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5",
              compact && "hidden sm:block"
            )}
          />
        ) : null}
      </span>
      <span
        className={cn(
          "mt-2 block font-[family-name:var(--font-display)] font-semibold text-foreground tabular-nums",
          compact ? "text-2xl sm:text-3xl" : "text-3xl"
        )}
      >
        {value}
      </span>
      {detail ? (
        <span
          className={cn(
            "mt-1 text-base text-muted-foreground",
            compact ? "hidden sm:block" : "block"
          )}
        >
          {detail}
        </span>
      ) : null}
      <span
        aria-hidden="true"
        className={cn(
          "block h-1 w-10 rounded-full",
          compact ? "mt-3 sm:mt-4" : "mt-4",
          toneBar[tone]
        )}
      />
    </>
  )
}

const cardClassName =
  "group flex h-full min-h-[132px] w-full flex-col rounded-(--ui-radius-surface) border border-border bg-card p-5 text-left"
const compactClassName = "min-h-0 p-3 sm:min-h-[132px] sm:p-5"
const interactiveClassName =
  "transition-colors hover:border-foreground/30 hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring"

/**
 * One number with a label. A card with `href` opens the matching list; one
 * with `onClick` filters the list on the same page.
 */
export function SummaryCard(props: SummaryCardProps) {
  const body = (
    <SummaryCardBody
      compact={props.compact}
      detail={props.detail}
      interactive={Boolean(props.href || props.onClick)}
      label={props.label}
      tone={props.tone}
      value={props.value}
    />
  )

  if (props.href) {
    return (
      <Link
        className={cn(
          cardClassName,
          interactiveClassName,
          props.compact && compactClassName
        )}
        href={props.href}
      >
        {body}
      </Link>
    )
  }

  if (props.onClick) {
    return (
      <button
        aria-pressed={props.selected ?? false}
        className={cn(
          cardClassName,
          interactiveClassName,
          props.compact && compactClassName,
          props.selected && "border-primary ring-1 ring-primary"
        )}
        onClick={props.onClick}
        type="button"
      >
        {body}
      </button>
    )
  }

  return (
    <div className={cn(cardClassName, props.compact && compactClassName)}>
      {body}
    </div>
  )
}

export function SummaryCardSkeleton() {
  return (
    <div className={cn(cardClassName, "animate-pulse")}>
      <span className="h-5 w-32 rounded bg-muted" />
      <span className="mt-3 h-8 w-40 rounded bg-muted" />
      <span className="mt-2 h-5 w-48 rounded bg-muted" />
    </div>
  )
}
