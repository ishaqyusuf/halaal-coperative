"use client"

import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { Badge } from "@halaalvest/ui/components/badge"
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import { formatCurrency } from "@halaalvest/utils"
import { ChevronRight } from "lucide-react"
import type { BusinessDetail } from "@/components/business/form-context"
import {
  RequestFacts,
  RequestSection,
} from "@/components/requests/request-facts"
import { RequestFormActions } from "@/components/requests/request-field"
import { useBusinessParams } from "@/hooks/use-business-params"
import {
  formatBusinessDates,
  getBusinessStatusWord,
  getProfitEntryWord,
} from "@/lib/business/business-words"
import { memberStateToneClassNames } from "@/lib/members/member-status-words"
import { formatDayMonthYear } from "@/utils/format"

/** A business: how it is doing, its profit so far, and what you can do. */
export function BusinessDetails({
  business,
  canRecordProfit,
  isLocked,
}: {
  business: BusinessDetail
  canRecordProfit: boolean
  isLocked: boolean
}) {
  const { setParams } = useBusinessParams()
  const status = getBusinessStatusWord(business.status)

  return (
    <div className="grid gap-6" data-business-details>
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className={memberStateToneClassNames[status.tone]}
            variant="outline"
          >
            {status.label}
          </Badge>
          <span className="text-base text-muted-foreground">
            {formatBusinessDates(business.startDate, business.endDate)}
          </span>
        </div>
        {business.notes ? (
          <p className="text-base text-foreground">{business.notes}</p>
        ) : null}
      </div>

      <RequestFacts
        items={[
          { label: "Money put in", value: formatCurrency(business.capitalAmount) },
          { label: "Profit so far", value: formatCurrency(business.profitTotal) },
          {
            label: "Shared with members",
            value: formatCurrency(business.sharedTotal),
          },
          {
            label: "Waiting to share",
            value: formatCurrency(
              Math.max(business.profitTotal - business.sharedTotal, 0)
            ),
          },
        ]}
      />

      <RequestFormActions>
        <Button
          disabled={isLocked || !canRecordProfit}
          onClick={() =>
            void setParams({
              businessId: business.id,
              businessType: "profit",
              profitEntryId: null,
            })
          }
          type="button"
        >
          Record profit
        </Button>
        <Button
          disabled={isLocked}
          onClick={() =>
            void setParams({
              businessId: business.id,
              businessType: "edit",
              profitEntryId: null,
            })
          }
          type="button"
          variant="outline"
        >
          Edit business
        </Button>
      </RequestFormActions>

      <RequestSection title="Profit">
        {business.profitEntries.length ? (
          <ul className="divide-y divide-border border-y border-border">
            {business.profitEntries.map((entry) => {
              const word = getProfitEntryWord(entry)
              const canChange =
                !isLocked &&
                canRecordProfit &&
                !entry.isShared &&
                entry.sourceType === "manual" &&
                (entry.status === "draft" || entry.status === "pending")
              const isHistory = entry.sourceType !== "manual"
              const body = (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-base font-semibold text-foreground">
                        {formatDayMonthYear(entry.profitDate)}
                      </span>
                      <Badge
                        className={memberStateToneClassNames[word.tone]}
                        variant="outline"
                      >
                        {word.label}
                      </Badge>
                    </span>
                    <span className="mt-1 block text-base text-muted-foreground">
                      {entry.expenseAmount > 0
                        ? `Made ${formatCurrency(entry.profitAmount)}, costs ${formatCurrency(entry.expenseAmount)}`
                        : `Made ${formatCurrency(entry.profitAmount)}`}
                      {entry.season ? ` · ${entry.season.name}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-lg font-semibold tabular-nums">
                    {formatCurrency(entry.allocatableProfitAmount)}
                  </span>
                </>
              )

              if (canChange) {
                return (
                  <li key={entry.id}>
                    <button
                      aria-label={`Change profit of ${formatDayMonthYear(entry.profitDate)}`}
                      className="flex min-h-11 w-full items-center gap-3 py-4 text-left hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                      onClick={() =>
                        void setParams({
                          businessId: business.id,
                          businessType: "editProfit",
                          profitEntryId: entry.id,
                        })
                      }
                      type="button"
                    >
                      {body}
                      <ChevronRight
                        aria-hidden="true"
                        className="size-5 shrink-0 text-muted-foreground"
                      />
                    </button>
                  </li>
                )
              }

              return (
                <li className="grid gap-2 py-4" key={entry.id}>
                  <div className="flex items-center gap-3">{body}</div>
                  {isHistory && !isLocked ? (
                    <Link
                      className={buttonVariants({
                        className: "h-11 w-fit text-base",
                        variant: "outline",
                      })}
                      href={`/settings/finance/business/profits/${entry.id}/migration`}
                    >
                      Open past profit sheet
                    </Link>
                  ) : null}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-base text-muted-foreground">
            No profit recorded yet.
          </p>
        )}
      </RequestSection>
    </div>
  )
}
