import type { Metadata } from "next"
import {
  OperationProfileSettingsUnavailableView,
  OperationProfileSettingsView,
} from "@/components/operation-profile-settings-view"
import { loadOperationProfileSettingsParams } from "@/hooks/use-operation-profile-settings-params"
import { loadOperationProfileSettingsPage } from "@/lib/settings/load-operation-profile-settings-page"

export const metadata: Metadata = {
  title: "Operation profile | Halaalvest",
}

export default async function OperationProfileSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await loadOperationProfileSettingsParams(await searchParams)
  const state = await loadOperationProfileSettingsPage()

  if (state.status === "unavailable") {
    return (
      <OperationProfileSettingsUnavailableView
        body={state.body}
        description={state.description}
        title={state.title}
      />
    )
  }

  return (
    <OperationProfileSettingsView
      policy={state.profile.policy}
      reviewedAt={state.profile.reviewedAt}
      services={state.profile.services}
    />
  )
}
