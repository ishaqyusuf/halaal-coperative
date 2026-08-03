import type { Metadata } from "next"
import {
  ProfileSettingsUnavailableView,
  ProfileSettingsView,
} from "@/components/profile-settings-view"
import { loadProfileSettingsParams } from "@/hooks/use-profile-settings-params"
import { loadProfileSettingsPage } from "@/lib/settings/load-profile-settings-page"

export const metadata: Metadata = {
  title: "Cooperative profile | Halaalvest",
}

export default async function CooperativeProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await loadProfileSettingsParams(await searchParams)
  const data = await loadProfileSettingsPage()

  if (data.status === "unavailable") {
    return <ProfileSettingsUnavailableView {...data} />
  }

  return <ProfileSettingsView {...data} />
}
