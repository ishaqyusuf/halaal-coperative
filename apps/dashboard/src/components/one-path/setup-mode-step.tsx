"use client"

import { useState, useTransition } from "react"
import type {
  TenantMigrationSetupMode,
  TenantMigrationSetupSettings,
} from "@halaalvest/db"
import { useNotifications } from "@halaalvest/notifications-react"
import { useTenantRouter } from "@halaalvest/tenant-url/next"
import { Badge } from "@halaalvest/ui/components/badge"
import { Button } from "@halaalvest/ui/components/button"
import {
  RadioGroup,
  RadioGroupItem,
} from "@halaalvest/ui/components/radio-group"
import { Spinner } from "@halaalvest/ui/components/spinner"
import { cn } from "@halaalvest/ui/lib/utils"
import { FinanceStartDateForm } from "@/components/forms/tenant-finance-forms"
import { OnePathStep } from "@/components/one-path/one-path-step"
import { updateTenantMigrationSetupAction } from "@/lib/dashboard-actions"
import { navigateWithFreshWizardState } from "@/lib/getting-started/navigate-with-fresh-state"
import { getInitialSetupMode } from "@/lib/getting-started/setup-mode-selection"

export const setupModeCards = [
  {
    description:
      "Enter each member's current savings, shares and anything they still owe. Old records stay where they are.",
    label: "Start from today's balances",
    mode: "brought_forward",
    needs: "Each member's balances as of today",
  },
  {
    description:
      "Enter every month since the cooperative started, so statements show the whole record.",
    label: "Rebuild our full history",
    mode: "historical_backfill",
    needs: "Every member's monthly records since you started",
  },
] satisfies Array<{
  description: string
  label: string
  mode: TenantMigrationSetupMode
  needs: string
}>

export type SetupModeRecommendationReason = {
  members: number
  years: number
}

export function formatSetupModeRecommendationReason(
  reason: SetupModeRecommendationReason
) {
  const years = Math.max(0, Math.round(reason.years))

  return `We suggest this because you have about ${reason.members.toLocaleString("en")} members and ${years} ${years === 1 ? "year" : "years"} of records.`
}

const setupModeFormId = "one-path-setup-mode-form"

// Step 5, Where records start. Continue saves the mode, then moves on. The
// start-date field only appears for tenants created before sign-up asked it.
export function SetupModeStep({
  migrationSetup,
  modeLocked,
  nextHref,
  recommendationReason,
  recommendedMigrationSetupMode,
  tenantStartDate,
}: {
  migrationSetup: TenantMigrationSetupSettings
  modeLocked: boolean
  nextHref: string
  recommendationReason: SetupModeRecommendationReason | null
  recommendedMigrationSetupMode: TenantMigrationSetupMode | null
  tenantStartDate: string | null
}) {
  const router = useTenantRouter()
  const { showError } = useNotifications()
  const needsStartDate = !tenantStartDate
  const recommended = tenantStartDate ? recommendedMigrationSetupMode : null
  // Until the admin picks an option, follow the recommendation (which can
  // appear after the start date is saved on this step).
  const [pickedMode, setMode] = useState<TenantMigrationSetupMode | null>(null)
  const mode =
    pickedMode ?? getInitialSetupMode({ migrationSetup, recommended })
  const [isPending, startTransition] = useTransition()

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.set("mode", mode)
        await updateTenantMigrationSetupAction(formData)
        navigateWithFreshWizardState(router, nextHref)
      } catch (error) {
        showError(
          "Could not save where records start",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <OnePathStep
      aside={
        <p>
          This decides how you enter what members already have. Starting from
          today is quicker; rebuilding history lets statements show every month.
        </p>
      }
      lede="Choose how you'll enter the records your members already have."
      primary={
        <Button
          className="h-11 sm:h-10"
          disabled={isPending || needsStartDate}
          form={setupModeFormId}
          type="submit"
        >
          {isPending ? <Spinner data-icon="inline-start" /> : null}
          Continue
        </Button>
      }
      stepKey="setup-mode"
      title="Where should your records start?"
    >
      <div className="flex flex-col gap-5">
        {needsStartDate ? (
          <div className="flex flex-col gap-2 border border-border/70 bg-muted/20 p-4">
            <p className="text-sm font-medium">
              When did the cooperative start?
            </p>
            <p className="text-sm text-muted-foreground">
              Your first month of records. Shares and savings are counted from
              here.
            </p>
            <FinanceStartDateForm
              defaultStartDate={tenantStartDate}
              preserveDraftKey="getting-started:start-date"
            />
          </div>
        ) : null}

        <form
          className="flex flex-col gap-4"
          id={setupModeFormId}
          onSubmit={onSubmit}
        >
          <RadioGroup
            aria-label="Where records start"
            className="grid gap-3 @xl:grid-cols-2"
            disabled={modeLocked}
            onValueChange={(value) =>
              setMode(value as TenantMigrationSetupMode)
            }
            value={mode}
          >
            {setupModeCards.map((card) => {
              const selected = mode === card.mode

              return (
                <label
                  className={cn(
                    "flex cursor-pointer flex-col gap-3 border p-4 transition-colors has-[[data-disabled]]:cursor-not-allowed",
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border/70 bg-muted/20 hover:bg-muted/40"
                  )}
                  key={card.mode}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-base font-semibold">
                      {card.label}
                    </span>
                    <RadioGroupItem value={card.mode} />
                  </div>
                  {recommended === card.mode ? (
                    <Badge
                      className="h-auto w-fit max-w-full whitespace-normal"
                      variant="secondary"
                    >
                      Recommended for you
                    </Badge>
                  ) : null}
                  <span className="text-sm text-muted-foreground">
                    {card.description}
                  </span>
                  <span className="text-sm">
                    <span className="font-medium">You&apos;ll need:</span>{" "}
                    {card.needs}
                  </span>
                </label>
              )
            })}
          </RadioGroup>

          {recommended && recommendationReason ? (
            <p className="text-sm text-muted-foreground">
              {formatSetupModeRecommendationReason(recommendationReason)}
            </p>
          ) : null}

          <p className="border-l-2 border-primary/40 pl-3 text-sm text-muted-foreground">
            {modeLocked
              ? "Member records have been added, so this stays fixed and every statement is consistent."
              : "You can switch until you add your first member. After that it stays fixed, so every statement is consistent."}
          </p>
        </form>
      </div>
    </OnePathStep>
  )
}
