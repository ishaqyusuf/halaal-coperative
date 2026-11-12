import { Badge } from "@halaalvest/ui/components/badge"
import { Button } from "@halaalvest/ui/components/button"
import { WorkspaceEmptyState } from "@/components/dashboard"
import {
  formatAccessAmount,
  formatAccessDate,
  formatBillingMonth,
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

export function MobileInvoiceList({
  disabled,
  invoices,
  action,
}: {
  disabled: boolean
  invoices: MobileAccessInvoice[]
  action: {
    label: string
    when?: (invoice: MobileAccessInvoice) => boolean
    run: (invoice: MobileAccessInvoice) => void
  }
}) {
  if (invoices.length === 0) {
    return (
      <WorkspaceEmptyState
        title="No invoices yet"
        body="Invoices appear when member charges become billable at month-end."
      />
    )
  }

  return (
    <ul className="divide-y divide-border border-y border-border">
      {invoices.map((invoice) => {
        const period = formatBillingMonth(invoice.period)
        const title = invoice.tenantName
          ? `${invoice.tenantName} · ${period}`
          : period

        return (
          <li
            className="grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center"
            key={invoice.id}
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium break-words">{title}</p>
                {invoice.tenantClassification === "qa" ? (
                  <Badge variant="outline">QA</Badge>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {invoice.itemCount}{" "}
                {invoice.itemCount === 1 ? "member charge" : "member charges"}
                {" · "}Issued {formatAccessDate(invoice.issuedAt)}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm tabular-nums">
                  {formatAccessAmount(
                    invoice.totalAmount,
                    invoice.currencyCode
                  )}
                </p>
                <Badge
                  variant={invoice.status === "paid" ? "secondary" : "outline"}
                >
                  {invoice.status === "paid" ? "Paid" : "Awaiting remittance"}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {invoice.paidAt
                  ? `Paid ${formatAccessDate(invoice.paidAt)}`
                  : `Due ${formatAccessDate(invoice.dueAt)}`}
              </p>
              {invoice.paymentReference ? (
                <p className="mt-1 text-xs break-words text-muted-foreground">
                  Reference {invoice.paymentReference}
                </p>
              ) : null}
              {!invoice.accrualPostedAt ||
              (invoice.status === "paid" && !invoice.remittancePostedAt) ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Cooperative ledger posting pending
                </p>
              ) : null}
            </div>
            {!action.when || action.when(invoice) ? (
              <div>
                <Button
                  aria-label={`${action.label} for ${title}`}
                  disabled={disabled}
                  onClick={() => action.run(invoice)}
                  type="button"
                  variant="outline"
                >
                  {action.label}
                </Button>
              </div>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
