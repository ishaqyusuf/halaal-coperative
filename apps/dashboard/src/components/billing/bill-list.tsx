import { Button } from "@halaalvest/ui/components/button"
import { ChevronRightIcon } from "lucide-react"
import {
  formatAccessAmount,
  formatAccessDate,
  formatAccessDay,
} from "@/components/mobile-access/format"

export type PlatformBillRow = {
  id: string
  period: string
  periodLabel: string
  totalAmount: number
  currencyCode: string
  status: "issued" | "paid" | "no_charge"
  dueAt: Date | string
  paidAt: Date | string | null
  accrualPostedAt: Date | string | null
  remittancePostedAt: Date | string | null
  fundingSource: { type: "charge" | "business"; name: string } | null
  tenantName?: string
  tenantClassification?: "live" | "qa"
}

export function billStatusText(bill: PlatformBillRow) {
  if (bill.status === "no_charge") return "Nothing to pay"
  if (bill.status === "paid")
    return bill.paidAt ? `Paid ${formatAccessDate(bill.paidAt)}` : "Paid"
  return `To pay by ${formatAccessDay(bill.dueAt)}`
}

export function fundingSourceText(
  source: PlatformBillRow["fundingSource"]
): string | null {
  if (!source) return null
  return `From ${source.type === "charge" ? "the charge" : "the business"} ${source.name}`
}

/** One line per bill. On phones it stacks; amounts stay right-aligned. */
export function BillList({
  bills,
  onOpen,
  action,
}: {
  bills: PlatformBillRow[]
  /** Opens the bill when the whole row is the target (cooperative view). */
  onOpen?: (bill: PlatformBillRow) => void
  /** A separate button on the row (platform view). */
  action?: {
    label: string
    when: (bill: PlatformBillRow) => boolean
    run: (bill: PlatformBillRow) => void
  }
}) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {bills.map((bill) => {
        const title = bill.tenantName ?? `${bill.periodLabel} bill`
        const source = fundingSourceText(bill.fundingSource)
        const body = (
          <>
            <span className="grid min-w-0 flex-1 gap-0.5 text-left">
              <span className="text-base font-medium break-words">
                {title}
                {bill.tenantClassification === "qa" ? " (QA)" : null}
              </span>
              <span className="text-sm text-muted-foreground">
                {bill.tenantName ? `${bill.periodLabel} · ` : null}
                <span
                  className={
                    bill.status === "issued" ? "text-foreground" : undefined
                  }
                >
                  {billStatusText(bill)}
                </span>
                {source ? ` · ${source}` : null}
              </span>
              {bill.tenantName &&
              (!bill.accrualPostedAt ||
                (bill.status === "paid" && !bill.remittancePostedAt)) ? (
                <span className="text-sm text-muted-foreground">
                  Not in the cooperative&apos;s accounts yet
                </span>
              ) : null}
            </span>
            <span className="shrink-0 text-base font-semibold tabular-nums">
              {formatAccessAmount(bill.totalAmount, bill.currencyCode)}
            </span>
          </>
        )

        if (onOpen) {
          return (
            <li key={bill.id}>
              <button
                aria-label={`Open ${bill.periodLabel} bill`}
                className="flex min-h-14 w-full items-center gap-3 py-3 text-left outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onOpen(bill)}
                type="button"
              >
                {body}
                <ChevronRightIcon
                  aria-hidden
                  className="size-5 shrink-0 text-muted-foreground"
                />
              </button>
            </li>
          )
        }

        return (
          <li
            className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center"
            key={bill.id}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">{body}</div>
            {action?.when(bill) ? (
              <Button
                size="touch"
                aria-label={`${action.label}: ${title}, ${bill.periodLabel}`}
                className="shrink-0 text-base"
                onClick={() => action.run(bill)}
                type="button"
                variant="outline"
              >
                {action.label}
              </Button>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
