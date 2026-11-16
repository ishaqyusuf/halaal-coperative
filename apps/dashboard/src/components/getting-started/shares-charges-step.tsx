"use client"

import { useTransition } from "react"
import { useTenantRouter } from "@halaalvest/tenant-url/next"
import { useNotifications } from "@halaalvest/notifications-react"
import type {
  TenantMigrationSetupSettings,
  TenantSharePolicySettings,
} from "@halaalvest/db"
import { Button } from "@halaalvest/ui/components/button"
import { Separator } from "@halaalvest/ui/components/separator"
import { useChargeDefinitionRows } from "@/components/forms/tenant-finance-forms"
import { ChargesListFields } from "@/components/getting-started/charges-list-fields"
import {
  ShareModelFields,
  useShareModelDraft,
} from "@/components/getting-started/share-model-fields"
import { OnePathStep } from "@/components/one-path/one-path-step"
import type {
  GettingStartedChargeDefinitionRow,
  GettingStartedShareStructureVersionRow,
} from "@/lib/getting-started/getting-started-page-types"
import { navigateWithFreshWizardState } from "@/lib/getting-started/navigate-with-fresh-state"
import {
  prepareOnePathSaves,
  resolveDefaultEffectiveFrom,
  runOnePathSaves,
} from "@/lib/getting-started/one-path-finance"

// One Path step 7. One Continue validates both halves, then saves the share
// policy, the monthly share history and the charges in that order, then
// moves on.
export function SharesChargesStep({
  backHref,
  chargeDefinitions,
  migrationSetup,
  quickFillEnabled,
  redirectTo,
  sharePolicy,
  shareStructureVersions,
  tenantStartDate,
}: {
  backHref?: string | null
  chargeDefinitions: GettingStartedChargeDefinitionRow[]
  migrationSetup: TenantMigrationSetupSettings
  quickFillEnabled: boolean
  redirectTo: string
  sharePolicy: TenantSharePolicySettings
  shareStructureVersions: GettingStartedShareStructureVersionRow[]
  tenantStartDate: string | null
}) {
  const router = useTenantRouter()
  const { showError, showSuccess } = useNotifications()
  const [isSaving, startSaving] = useTransition()
  const isBroughtForward = migrationSetup.mode === "brought_forward"
  const today = new Date().toISOString().slice(0, 10)
  // Brought-forward setup records terms from the setup date (today); a
  // historical setup records them from the cooperative start date.
  const defaultEffectiveFrom = isBroughtForward
    ? resolveDefaultEffectiveFrom({ financeStartDate: tenantStartDate, today })
    : (tenantStartDate ?? today)
  const shareDraft = useShareModelDraft({
    defaultEffectiveFrom,
    financeStartDate: tenantStartDate,
    sharePolicy,
    shareStructureVersions,
  })
  const chargeDraft = useChargeDefinitionRows({
    financeStartDate: tenantStartDate,
    initialDefinitions: chargeDefinitions,
    preserveDraftKey: "getting-started:charges",
  })
  const isBusy = isSaving || chargeDraft.isPending

  async function continueToNextStep() {
    if (isBusy) {
      return
    }

    const saves = await prepareOnePathSaves([
      shareDraft.prepareSave,
      () =>
        chargeDraft.prepareChargeSave({
          defaultEffectiveFrom: isBroughtForward ? defaultEffectiveFrom : null,
        }),
    ])

    if (!saves) {
      return
    }

    startSaving(async () => {
      try {
        await runOnePathSaves(saves)
        showSuccess("Shares and charges saved", "Moving to profit sharing.")
        navigateWithFreshWizardState(router, redirectTo, {
          refreshDestination: false,
        })
      } catch (error) {
        showError(
          "Could not save shares and charges",
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
            Each member&apos;s monthly payment is split into charges and share
            capital, so we need both before adding members.
          </p>
          <p>
            Every charge needs at least one group it applies to. You can add or
            change charges later in Settings.
          </p>
        </div>
      }
      backHref={backHref}
      lede={
        isBroughtForward
          ? "Tell us how members hold shares and what they pay from today. Older changes aren't needed."
          : "Tell us how members hold shares and what they pay, including changes since you started."
      }
      primary={
        <Button
          size="touch"
          disabled={isBusy}
          onClick={continueToNextStep}
          type="button"
        >
          {isSaving ? "Saving…" : "Continue"}
        </Button>
      }
      stepKey="shares-charges"
      title="Shares and charges"
    >
      <div aria-busy={isBusy} className="grid gap-8">
        <ShareModelFields
          defaultEffectiveFrom={defaultEffectiveFrom}
          disabled={isBusy}
          draft={shareDraft}
          financeStartDate={tenantStartDate}
          quickFillEnabled={quickFillEnabled}
        />
        <Separator />
        <ChargesListFields
          defaultEffectiveFrom={defaultEffectiveFrom}
          disabled={isBusy}
          draft={chargeDraft}
          financeStartDate={tenantStartDate}
          isBroughtForward={isBroughtForward}
          quickFillEnabled={quickFillEnabled}
        />
      </div>
    </OnePathStep>
  )
}
