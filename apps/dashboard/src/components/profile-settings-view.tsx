import type { ComponentProps } from "react"
import {
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardStatCard,
  WorkspacePageShell,
} from "@/components/dashboard"
import { OpenProfileSettingsSheet } from "@/components/open-profile-settings-sheet"
import { ProfileSettingsSheet } from "@/components/sheets/profile-settings-sheet"

type ProfileSettingsSheetDefaults = ComponentProps<
  typeof ProfileSettingsSheet
>["defaultValues"]

export function ProfileSettingsView({
  canManageProfile,
  currentSizeLabel,
  devMode,
  formDefaultValues,
  locationSummary,
  memberPrefixLabel,
  profileFields,
  tenantName,
}: {
  canManageProfile: boolean
  currentSizeLabel: string
  devMode: boolean
  formDefaultValues: ProfileSettingsSheetDefaults
  locationSummary: string
  memberPrefixLabel: string
  profileFields: Array<[string, string]>
  tenantName: string
}) {
  return (
    <WorkspacePageShell
      description="Core cooperative identity and onboarding profile details persisted during workspace setup."
      eyebrow="Settings"
      title="Cooperative profile"
    >
      <section className="grid gap-4 md:grid-cols-4">
        <DashboardStatCard
          detail="Current persisted cooperative display name."
          label="Cooperative name"
          value={tenantName}
        />
        <DashboardStatCard
          detail="Current recorded cooperative size range."
          label="Current size"
          value={currentSizeLabel}
        />
        <DashboardStatCard
          detail="City, state, and country on the cooperative profile."
          label="Location"
          value={locationSummary}
        />
        <DashboardStatCard
          detail="Optional prefix prepended to member numbers."
          label="Member prefix"
          value={memberPrefixLabel}
        />
      </section>

      {canManageProfile ? (
        <DashboardSectionCard>
          <DashboardSectionHeader
            actions={<OpenProfileSettingsSheet />}
            description="Manage the cooperative’s identity, office location, and onboarding profile from a focused sheet."
            eyebrow="Edit"
            title="Update profile"
          />
          <p className="mt-5 text-sm leading-6 text-muted-foreground">
            Profile changes open in a sheet so this settings page stays focused
            on the current profile snapshot.
          </p>
        </DashboardSectionCard>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        {profileFields.map(([label, value]) => (
          <DashboardSectionCard key={label}>
            <DashboardSectionHeader eyebrow="Profile field" title={label} />
            <p className="mt-5 text-base leading-7 text-foreground">{value}</p>
          </DashboardSectionCard>
        ))}
      </section>

      {canManageProfile ? (
        <ProfileSettingsSheet
          defaultValues={formDefaultValues}
          devMode={devMode}
        />
      ) : null}
    </WorkspacePageShell>
  )
}
