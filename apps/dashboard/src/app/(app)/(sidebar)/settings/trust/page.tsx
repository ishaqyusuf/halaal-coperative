import {
  TrustSettingsUnavailableView,
  TrustSettingsView,
} from "@/components/trust-settings-view"
import { loadTrustSettingsParams } from "@/hooks/use-trust-settings-params"
import { loadTrustReadinessPageData } from "@/lib/settings/load-trust-readiness-page"

export default async function TrustReadinessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  loadTrustSettingsParams(await searchParams)
  const data = await loadTrustReadinessPageData()

  if (!data.canViewTrustReadiness) {
    return <TrustSettingsUnavailableView />
  }

  return (
    <TrustSettingsView
      data={data}
      defaultValues={{
        backupRetentionNote: data.trustProfile.backupRetentionNote ?? "",
        dataProcessingUrl: data.trustProfile.dataProcessingUrl ?? "",
        incidentContactEmail: data.trustProfile.incidentContactEmail ?? "",
        incidentContactName: data.trustProfile.incidentContactName ?? "",
        legalTermsUrl: data.trustProfile.legalTermsUrl ?? "",
        privacyPolicyUrl: data.trustProfile.privacyPolicyUrl ?? "",
        recoveryPointObjective: data.trustProfile.recoveryPointObjective ?? "",
        recoveryTimeObjective: data.trustProfile.recoveryTimeObjective ?? "",
      }}
    />
  )
}
