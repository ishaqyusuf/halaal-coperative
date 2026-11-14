import { Button } from "@halaalvest/ui/components/button"
import { ChevronRightIcon } from "lucide-react"
import {
  formatAccessAmount,
  formatAccessDate,
  formatAccessDay,
  formatBillingMonth,
  plural,
} from "./format"

export type MobileAccessInvoice = {
  id: string
  period: string
  totalAmount: number
  currencyCode: string
  status: "issued" | "paid"
  issuedAt: Date | string
  dueAt: Date | string
  paidAt: Date | string | null
  paymentReference: string | null
  accrualPostedAt: Date | string | null
  remittancePostedAt: Date | string | null
  itemCount: number
  tenantName?: string
  tenantClassification?: "live" | "qa"
}

export function invoiceStatusText(invoice: MobileAccessInvoice) {
  return invoice.status === "paid"
    ? invoice.paidAt
      ? `Paid ${formatAccessDate(invoice.paidAt)}`
      : "Paid"
    : `To pay by ${formatAccessDay(invoice.dueAt)}`
}

/** One line per bill. On phones it stacks; amounts stay right-aligned. */
export function MobileInvoiceList({
  invoices,
  onOpen,
  action,
}: {
  invoices: MobileAccessInvoice[]
  /** Opens the bill when the whole row is the target (cooperative view). */
  onOpen?: (invoice: MobileAccessInvoice) => void
  /** A separate button on the row (platform view). */
  action?: {
    label: string
    when: (invoice: MobileAccessInvoice) => boolean
    run: (invoice: MobileAccessInvoice) => void
  }
}) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {invoices.map((invoice) => {
        const month = formatBillingMonth(invoice.period)
        const title = invoice.tenantName
          ? `${invoice.tenantName}`
          : `${month} bill`
        const body = (
          <>
            <span className="grid min-w-0 flex-1 gap-0.5 text-left">
              <span className="text-base font-medium break-words">
                {title}
                {invoice.tenantClassification === "qa" ? " (QA)" : null}
              </span>
              <span className="text-sm text-muted-foreground">
                {invoice.tenantName ? `${month} · ` : null}
                {plural(invoice.itemCount, "member")}
                {" · "}
                <span
                  className={
                    invoice.status === "paid" ? undefined : "text-foreground"
                  }
                >
                  {invoiceStatusText(invoice)}
                </span>
              </span>
              {invoice.tenantName &&
              (!invoice.accrualPostedAt ||
                (invoice.status === "paid" && !invoice.remittancePostedAt)) ? (
                <span className="text-sm text-muted-foreground">
                  Not in the cooperative&apos;s accounts yet
                </span>
              ) : null}
            </span>
            <span className="shrink-0 text-base font-semibold tabular-nums">
              {formatAccessAmount(invoice.totalAmount, invoice.currencyCode)}
            </span>
          </>
        )

        if (onOpen) {
          return (
            <li key={invoice.id}>
              <button
                aria-label={`Open ${month} bill`}
                className="flex min-h-14 w-full items-center gap-3 py-3 text-left outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onOpen(invoice)}
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
            key={invoice.id}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">{body}</div>
            {action?.when(invoice) ? (
              <Button
                aria-label={`${action.label}: ${title}, ${month}`}
                className="h-11 shrink-0 text-base"
                onClick={() => action.run(invoice)}
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
