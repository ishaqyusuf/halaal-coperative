import type { ComponentProps } from "react"
import { OpenProfileSettingsSheet } from "@/components/open-profile-settings-sheet"
import { ProfileSettingsSheet } from "@/components/sheets/profile-settings-sheet"
import {
  SettingsEmpty,
  SettingsFacts,
  SettingsPage,
  SettingsSection,
} from "@/components/workspace-settings/settings-page"
import type { ProfileSettingsSection } from "@/lib/settings/load-profile-settings-page"

type ProfileSettingsSheetDefaults = ComponentProps<
  typeof ProfileSettingsSheet
>["defaultValues"]

export function ProfileSettingsUnavailableView({
  body,
  title,
}: {
  body: string
  title: string
}) {
  return (
    <SettingsPage>
      <SettingsEmpty body={body} title={title} />
    </SettingsPage>
  )
}

export function ProfileSettingsView({
  canManageProfile,
  devMode,
  formDefaultValues,
  profileSections,
}: {
  canManageProfile: boolean
  devMode: boolean
  formDefaultValues: ProfileSettingsSheetDefaults
  profileSections: ProfileSettingsSection[]
}) {
  return (
    <SettingsPage
      action={canManageProfile ? <OpenProfileSettingsSheet /> : undefined}
      intro="Your cooperative's name and office, as members see them."
    >
      {profileSections.map((section) => (
        <div data-profile-section={section.key} key={section.key}>
          <SettingsSection title={section.title}>
            <SettingsFacts facts={section.facts} />
          </SettingsSection>
        </div>
      ))}

      {canManageProfile ? (
        <ProfileSettingsSheet
          defaultValues={formDefaultValues}
          devMode={devMode}
        />
      ) : null}
    </SettingsPage>
  )
}
