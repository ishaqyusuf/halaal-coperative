import type { ComponentProps } from "react"
import {
  DashboardStatCard,
  WorkspaceEmptyState,
  WorkspacePageShell,
} from "@/components/dashboard"
import { OpenProfileSettingsSheet } from "@/components/open-profile-settings-sheet"
import { ProfileSettingsSheet } from "@/components/sheets/profile-settings-sheet"
import type { ProfileSettingsSection } from "@/lib/settings/load-profile-settings-page"

type ProfileSettingsSheetDefaults = ComponentProps<
  typeof ProfileSettingsSheet
>["defaultValues"]

export function ProfileSettingsUnavailableView({
  body,
  description,
  title,
}: {
  body: string
  description: string
  title: string
}) {
  return (
    <WorkspacePageShell
      description={description}
      eyebrow="Settings"
      title="Cooperative profile"
    >
      <WorkspaceEmptyState body={body} title={title} />
    </WorkspacePageShell>
  )
}

export function ProfileSettingsView({
  canManageProfile,
  currentSizeLabel,
  devMode,
  formDefaultValues,
  locationSummary,
  memberPrefixLabel,
  profileSections,
  tenantName,
}: {
  canManageProfile: boolean
  currentSizeLabel: string
  devMode: boolean
  formDefaultValues: ProfileSettingsSheetDefaults
  locationSummary: string
  memberPrefixLabel: string
  profileSections: ProfileSettingsSection[]
  tenantName: string
}) {
  return (
    <WorkspacePageShell
      actions={canManageProfile ? <OpenProfileSettingsSheet /> : undefined}
      description="Core cooperative identity and onboarding profile details persisted during workspace setup."
      eyebrow="Settings"
      title="Cooperative profile"
    >
      <section className="hidden gap-4 md:grid md:grid-cols-4">
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

      <section
        aria-labelledby="profile-details-title"
        className="space-y-8 md:space-y-10"
      >
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Profile snapshot
          </p>
          <h2
            className="mt-1 text-base font-semibold text-foreground"
            id="profile-details-title"
          >
            Current cooperative details
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Review the information used across the workspace. Administrators can
            update editable details from the page action above.
          </p>
        </div>

        {profileSections.map((section) => (
          <section
            aria-labelledby={`profile-${section.key}-title`}
            data-profile-section={section.key}
            key={section.key}
          >
            <div className="pb-4">
              <h3
                className="text-base font-semibold text-foreground"
                id={`profile-${section.key}-title`}
              >
                {section.title}
              </h3>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                {section.description}
              </p>
            </div>

            <dl className="divide-y divide-border/70 border-y border-border/70">
              {section.fields.map((field) => (
                <div
                  className="grid gap-1 py-4 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] sm:gap-6"
                  data-profile-field={field.label}
                  key={field.label}
                >
                  <dt className="text-sm text-muted-foreground">
                    {field.label}
                  </dt>
                  <dd className="text-sm font-medium break-words text-foreground sm:text-right">
                    {field.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
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
