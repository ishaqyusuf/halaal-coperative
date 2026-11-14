import { Badge } from "@halaalvest/ui/components/badge"
import { cn } from "@halaalvest/ui/lib/utils"
import type { ReactNode } from "react"
import type { LoanWordTone } from "@/lib/loans/loan-words"

const toneClassNames: Record<LoanWordTone, string> = {
  attention: "border-amber-200 bg-amber-50 text-amber-900",
  bad: "border-red-200 bg-red-50 text-red-800",
  default: "border-border bg-muted text-foreground",
  good: "border-emerald-200 bg-emerald-50 text-emerald-800",
}

/** One plain status word (see `lib/loans/loan-words.ts`). */
export function LoanStatusWord({
  className,
  word,
}: {
  className?: string
  word: { label: string; tone: LoanWordTone }
}) {
  return (
    <Badge
      className={cn("h-7 px-2.5 text-sm", toneClassNames[word.tone], className)}
      variant="outline"
    >
      {word.label}
    </Badge>
  )
}

/** Label/value rows for loan sheets and dialogs: large, plain, no grid. */
export function LoanFacts({
  className,
  rows,
}: {
  className?: string
  rows: Array<{ label: string; value: ReactNode } | null | false | undefined>
}) {
  return (
    <dl className={cn("divide-y divide-border border-y border-border", className)}>
      {rows.filter(Boolean).map((row) => {
        const { label, value } = row as { label: string; value: ReactNode }

        return (
          <div
            className="flex items-baseline justify-between gap-4 py-3 text-base"
            key={label}
          >
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="min-w-0 text-right font-medium break-words text-foreground">
              {value}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}
