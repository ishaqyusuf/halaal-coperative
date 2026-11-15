import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import type { TenantMigrationSetupSettings } from "@halaalvest/db"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@halaalvest/ui/components/alert"
import { Badge } from "@halaalvest/ui/components/badge"
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@halaalvest/ui/components/tooltip"
import { cn } from "@halaalvest/ui/lib/utils"
import { formatCurrency } from "@halaalvest/utils"
import { BusinessProfitSeasonDeductionFields } from "@/components/business-profit-season-deduction-popover"
import { WorkspaceEmptyState } from "@/components/dashboard"
import { OnePathStep } from "@/components/one-path/one-path-step"
import { saveBusinessProfitSeasonReviewAction } from "@/lib/dashboard-actions"
import type { GettingStartedBusinessProfitSeasonRow } from "@/lib/getting-started/getting-started-page-types"
import { profitSeasonStatusLabels } from "@/lib/getting-started/one-path-finance"

const profitSeasonsReviewFormId = "profit-seasons-review-form"

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`))
}

// The conditional follow-on of One Path step 8. It keeps the existing season
// rules: confirming saves every season's deduction through
// `saveBusinessProfitSeasonReviewAction`, which links each business profit to
// its season and then redirects to `redirectTo`.
export function ProfitSeasonsReviewStep({
  backHref,
  businessProfitSeasons,
  migrationSetup,
  quickFillEnabled = false,
  redirectTo,
}: {
  backHref?: string | null
  businessProfitSeasons: GettingStartedBusinessProfitSeasonRow[]
  migrationSetup: TenantMigrationSetupSettings
  quickFillEnabled?: boolean
  redirectTo: string
}) {
  const isBroughtForward = migrationSetup.mode === "brought_forward"
  const pendingCount = businessProfitSeasons.filter(
    (season) => season.status === "pending" || season.status === "draft"
  ).length
  const hasSeasons = businessProfitSeasons.length > 0

  return (
    <OnePathStep
      aside={
        <p>
          A season groups the profit your businesses made in one sharing period.
          Any season deduction comes off before members get their share.
        </p>
      }
      backHref={backHref}
      lede={
        isBroughtForward
          ? "Check past profit that hasn't been shared with members yet."
          : "Check each profit-sharing season before members are added."
      }
      primary={
        hasSeasons ? (
          <Button
            className="h-11"
            form={profitSeasonsReviewFormId}
            type="submit"
          >
            Confirm seasons
          </Button>
        ) : (
          <Link className={cn(buttonVariants(), "h-11")} href={redirectTo}>
            Continue
          </Link>
        )
      }
      stepKey="profit"
      title="Review profit seasons"
    >
      {hasSeasons ? (
        <ProfitSeasonsReviewForm
          businessProfitSeasons={businessProfitSeasons}
          pendingCount={pendingCount}
          quickFillEnabled={quickFillEnabled}
          redirectTo={redirectTo}
        />
      ) : (
        <WorkspaceEmptyState
          body={
            isBroughtForward
              ? "There is no past profit waiting to be shared, so you can continue."
              : "Add business profit in the previous step, or tick that you have no business history."
          }
          title="No profit seasons to review."
        />
      )}
    </OnePathStep>
  )
}

function ProfitSeasonsReviewForm({
  businessProfitSeasons,
  pendingCount,
  quickFillEnabled,
  redirectTo,
}: {
  businessProfitSeasons: GettingStartedBusinessProfitSeasonRow[]
  pendingCount: number
  quickFillEnabled: boolean
  redirectTo: string
}) {
  return (
    <form
      action={saveBusinessProfitSeasonReviewAction}
      className="@container grid gap-4"
      id={profitSeasonsReviewFormId}
    >
      <input name="redirectTo" type="hidden" value={redirectTo} />
      {pendingCount > 0 ? (
        <Alert>
          <AlertTitle>
            {pendingCount === 1
              ? "1 season needs review"
              : `${pendingCount} seasons need review`}
          </AlertTitle>
          <AlertDescription>
            Confirming links each business profit to its season, ready to be
            shared with members.
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-3">
        {businessProfitSeasons.map((season) => {
          const maxSeasonDeduction = Math.max(
            0,
            season.grossProfitAmount - season.entryDeductionAmount
          )
          const visibleBusinessNames = season.businessNames.slice(0, 1)
          const hiddenBusinessCount =
            season.businessNames.length - visibleBusinessNames.length

          return (
            <div
              className="grid gap-3 border-t border-border/70 pt-3 @md:grid-cols-2 @4xl:grid-cols-[minmax(0,1.4fr)_7rem_7rem_8rem_8rem_7rem] @4xl:items-start"
              key={season.key}
            >
              <div>
                <input name="seasonKey" type="hidden" value={season.key} />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          className="text-left font-medium underline-offset-4 hover:underline"
                          type="button"
                        />
                      }
                    >
                      {season.label}
                    </TooltipTrigger>
                    <TooltipContent
                      align="start"
                      className="grid max-w-[460px] gap-2 rounded-sm border border-border bg-popover p-3 text-popover-foreground shadow-xl [&>*:last-child]:bg-popover [&>*:last-child]:fill-popover"
                      side="right"
                      sideOffset={12}
                    >
                      <div className="border-b border-border/70 pb-2">
                        <p className="text-sm font-semibold">
                          Profit in this season
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {season.label}
                        </p>
                      </div>
                      <div className="grid gap-2">
                        {season.profitEntries.map((entry) => (
                          <div
                            className="grid gap-1 border-b border-border/70 pb-2 last:border-b-0 last:pb-0"
                            key={`${season.key}-${entry.businessName}-${entry.profitDate}`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-medium">
                                {entry.businessName}
                              </span>
                              <span className="tabular-nums">
                                {formatCurrency(entry.profitAmount)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3 text-muted-foreground">
                              <span>{formatDate(entry.profitDate)}</span>
                              <span>
                                deduction{" "}
                                {formatCurrency(entry.deductionAmount)}
                              </span>
                            </div>
                            {entry.reason ? (
                              <p className="text-muted-foreground">
                                {entry.reason}
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div className="mt-1 flex flex-wrap gap-1">
                  {visibleBusinessNames.map((businessName) => (
                    <Badge
                      key={`${season.key}-${businessName}`}
                      variant="secondary"
                    >
                      {businessName}
                    </Badge>
                  ))}
                  {hiddenBusinessCount > 0 ? (
                    <Badge variant="outline">+{hiddenBusinessCount}</Badge>
                  ) : null}
                </div>
              </div>
              <div className="sm:text-right">
                <p className="text-xs font-medium text-muted-foreground">
                  Profit
                </p>
                <p className="mt-1 text-sm">
                  {formatCurrency(season.grossProfitAmount)}
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-xs font-medium text-muted-foreground">
                  Deductions
                </p>
                <p className="mt-1 text-sm">
                  {formatCurrency(season.entryDeductionAmount)}
                </p>
              </div>
              <BusinessProfitSeasonDeductionFields
                initialAmount={season.deductionAmount}
                initialReason={season.deductionReason}
                maxAmount={maxSeasonDeduction}
                preserveDraftKey={`getting-started:profit-seasons:${season.key}`}
                quickFillEnabled={quickFillEnabled}
                seasonKey={season.key}
              />
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Status
                </p>
                <Badge
                  variant={
                    season.status === "pending" || season.status === "draft"
                      ? "secondary"
                      : "default"
                  }
                >
                  {profitSeasonStatusLabels[season.status]}
                </Badge>
              </div>
            </div>
          )
        })}
      </div>
    </form>
  )
}
