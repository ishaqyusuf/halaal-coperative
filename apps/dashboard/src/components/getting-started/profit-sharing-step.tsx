"use client"

import { useCallback, useRef, useTransition } from "react"
import { useTenantRouter } from "@halaalvest/tenant-url/next"
import { useNotifications } from "@halaalvest/notifications-react"
import type {
  TenantBusinessProfitPolicySettings,
  TenantMigrationSetupSettings,
} from "@halaalvest/db"
import { Button } from "@halaalvest/ui/components/button"
import { Separator } from "@halaalvest/ui/components/separator"
import { ShareBusinessForm } from "@/components/forms/tenant-finance-forms"
import {
  ProfitPolicyFields,
  useProfitPolicyDraft,
} from "@/components/getting-started/profit-policy-fields"
import { OnePathStep } from "@/components/one-path/one-path-step"
import type {
  GettingStartedDividendPeriodRow,
  GettingStartedShareBusinessRow,
} from "@/lib/getting-started/getting-started-page-types"
import { navigateWithFreshWizardState } from "@/lib/getting-started/navigate-with-fresh-state"
import {
  prepareOnePathSaves,
  runOnePathSaves,
  type OnePathSavePreparer,
} from "@/lib/getting-started/one-path-finance"

const noBusinessChanges: OnePathSavePreparer = () => async () => {}

// One Path step 8. One primary action validates the profit policy and the
// businesses, then saves the policy, then the business changes, then moves on
// (to "Review profit seasons" when the coordinator routes there).
export function ProfitSharingStep({
  backHref,
  businessPolicy,
  dividendPeriods,
  migrationSetup,
  quickFillEnabled,
  redirectTo,
  shareBusinesses,
  tenantStartDate,
}: {
  backHref?: string | null
  businessPolicy: TenantBusinessProfitPolicySettings
  dividendPeriods: GettingStartedDividendPeriodRow[]
  migrationSetup: TenantMigrationSetupSettings
  quickFillEnabled: boolean
  redirectTo: string
  shareBusinesses: GettingStartedShareBusinessRow[]
  tenantStartDate: string | null
}) {
  const router = useTenantRouter()
  const { showError, showSuccess } = useNotifications()
  const [isSaving, startSaving] = useTransition()
  const isBroughtForward = migrationSetup.mode === "brought_forward"
  const policyDraft = useProfitPolicyDraft({ businessPolicy })
  const businessSaveRef = useRef<OnePathSavePreparer | null>(null)
  const setPolicyValue = policyDraft.form.setValue
  const getPolicyValue = policyDraft.form.getValues
  // Historical setup: "no business history" is the same answer as the
  // "No historical business profit" mode, which is what clears the
  // business-profit readiness check on the server. Keep them in step.
  const syncNoBusinessHistory = useCallback(
    (hasNoBusiness: boolean) => {
      if (isBroughtForward) return
      const mode = getPolicyValue("historicalProfitMigrationMode")

      if (hasNoBusiness && mode !== "no_historical_business_profit") {
        setPolicyValue(
          "historicalProfitMigrationMode",
          "no_historical_business_profit"
        )
      } else if (!hasNoBusiness && mode === "no_historical_business_profit") {
        setPolicyValue(
          "historicalProfitMigrationMode",
          "manual_review_required"
        )
      }
    },
    [getPolicyValue, isBroughtForward, setPolicyValue]
  )
  const registerBusinessSave = useCallback(
    (prepare: OnePathSavePreparer | null) => {
      businessSaveRef.current = prepare
    },
    []
  )

  async function continueToNextStep() {
    if (isSaving) {
      return
    }

    const saves = await prepareOnePathSaves([
      policyDraft.prepareSave,
      () => (businessSaveRef.current ?? noBusinessChanges)(),
    ])

    if (!saves) {
      return
    }

    startSaving(async () => {
      try {
        await runOnePathSaves(saves)
        showSuccess("Profit sharing saved", "Your profit policy is set.")
        navigateWithFreshWizardState(router, redirectTo)
      } catch (error) {
        showError(
          "Could not save profit sharing",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <OnePathStep
      aside={
        <div className="space-y-2">
          <p>
            This decides how much of each season&apos;s profit reaches members
            and how much stays with the cooperative.
          </p>
          <p>
            {isBroughtForward
              ? "List only businesses running this season. Older finished seasons are not needed."
              : "List each business and the profit it made, so past profit can be shared fairly."}
          </p>
        </div>
      }
      backHref={backHref}
      lede={
        isBroughtForward
          ? "Set how profit is split and list the businesses running this season."
          : "Set how profit is split and list the businesses that made profit since you started."
      }
      primary={
        <Button
          className="h-11 sm:h-10"
          disabled={isSaving}
          onClick={continueToNextStep}
          type="button"
        >
          {isSaving ? "Saving…" : "Continue"}
        </Button>
      }
      stepKey="profit"
      title="Profit sharing"
    >
      <div aria-busy={isSaving} className="grid gap-8">
        <ProfitPolicyFields
          disabled={isSaving}
          draft={policyDraft}
          isBroughtForward={isBroughtForward}
        />
        <Separator />
        <section aria-labelledby="one-path-businesses" className="grid gap-3">
          <h3
            className="text-base font-medium text-foreground"
            id="one-path-businesses"
          >
            {isBroughtForward
              ? "Which businesses are running this season?"
              : "Which businesses has the cooperative run?"}
          </h3>
          <ShareBusinessForm
            dividendPeriods={dividendPeriods}
            financeStartDate={tenantStartDate}
            initialBusinesses={shareBusinesses}
            onNoBusinessChange={syncNoBusinessHistory}
            preserveDraftKey="getting-started:business-history"
            profitHistoryMode
            quickFillEnabled={quickFillEnabled}
            registerSave={registerBusinessSave}
            setupMode={migrationSetup.mode}
            showSubmitButton={false}
            sourceType="backfill"
          />
        </section>
      </div>
    </OnePathStep>
  )
}
