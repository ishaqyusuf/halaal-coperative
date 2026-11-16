"use client"

import { Button } from "@halaalvest/ui/components/button"
import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { formatCurrency } from "@halaalvest/utils"
import { ContributionSheetHeader } from "@/components/contribution-sheet-header"
import { useContributionsQuery } from "@/components/tables/contributions/use-contributions-query"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useContributionParams } from "@/hooks/use-contribution-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

const channelLabels: Record<string, string> = {
  cash: "Cash",
  manual: "Entered by staff",
  payroll: "Payroll",
  transfer: "Bank transfer",
}

const statusLabels: Record<string, string> = {
  failed: "Failed",
  pending: "Waiting",
  posted: "Posted",
  reversed: "Reversed",
}

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date))
}

function money(value: { toString(): string } | number | string | null) {
  return value === null ? null : formatCurrency(Number(value))
}

/**
 * A contributions ledger entry, opened by clicking its row (WP15).
 *
 * It reads the row from the ledger query the table already loaded, so
 * opening it costs no request. A link to an entry that is not on the loaded
 * pages (for example after the filters changed) says so instead.
 */
export function ContributionDetailSheet() {
  const { contributionSheetType, selectedContributionId, setParams } =
    useContributionParams()
  const { rows } = useContributionsQuery()
  const isOpen = contributionSheetType === "details"
  const entry = isOpen
    ? rows.find((row) => row.id === selectedContributionId)
    : undefined

  const close = () =>
    void setParams({
      contributionSheetType: null,
      selectedContributionId: null,
    })

  const details = entry
    ? [
        { label: "Savings", value: money(entry.amount) },
        {
          label: "Committed",
          value: money(entry.committedAmount) ?? "Not linked",
        },
        {
          label: "Extra savings",
          value: money(entry.extraSavingsAmount ?? 0),
        },
        { label: "Posted", value: formatDate(entry.postedAt) },
        { label: "Status", value: statusLabels[entry.status] ?? entry.status },
        {
          label: "Paid by",
          value: channelLabels[entry.channel] ?? entry.channel,
        },
        { label: "For", value: entry.periodLabel },
        { label: "Monthly amount", value: entry.contributionPlan?.name },
        { label: "Reference", value: entry.reference },
        { label: "Note", value: entry.notes },
      ].filter((item) => item.value)
    : []

  return (
    <WorkflowPresentation
      config={getWorkflowPresentation("contribution", "details")}
      mobileFullScreen
      onOpenChange={(open) => {
        if (!open) close()
      }}
      open={isOpen}
    >
      <ContributionSheetHeader />
      <div className="grid gap-6 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
        {entry ? (
          <>
            <div className="grid gap-1">
              <p className="text-base font-medium text-foreground">
                {entry.member?.fullName ?? "Unknown member"}
              </p>
              <p className="text-sm text-muted-foreground">
                {entry.member?.memberNumber ?? "No member number"}
              </p>
            </div>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm">
              {details.map((item) => (
                <div className="contents" key={item.label}>
                  <dt className="text-muted-foreground">{item.label}</dt>
                  <dd className="text-right [overflow-wrap:anywhere] text-foreground tabular-nums">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
            {entry.member?.id ? (
              <Button
                size="touch"
                className="w-full sm:h-9 sm:w-auto sm:justify-self-start"
                nativeButton={false}
                render={<Link href={`/members/${entry.member.id}`} />}
                variant="outline"
              >
                Open member
              </Button>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            This payment is not in the list you are looking at. Close this and
            search for the member to find it.
          </p>
        )}
      </div>
    </WorkflowPresentation>
  )
}
