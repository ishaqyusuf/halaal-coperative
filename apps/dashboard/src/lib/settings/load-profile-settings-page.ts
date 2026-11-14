import {
  defaultCooperativeCountry,
  formatCooperativeSizeRangeLabel,
  resolveCooperativeSizeRange,
} from "@halaalvest/domain"
import type { SettingsFact } from "@/components/workspace-settings/settings-page"
import {
  canShowQuickFill,
  getDashboardServerContext,
} from "@/lib/server-context"
import { hasAnyRole, workspaceAdminRoles } from "@/lib/workspace-access"
import { formatDayMonthYear } from "@/utils/format"

export type ProfileSettingsSection = {
  facts: SettingsFact[]
  key: "cooperative" | "office"
  title: string
}

type ProfileSettingsReadyState = {
  canManageProfile: boolean
  devMode: boolean
  formDefaultValues: {
    city: string
    country: string
    currentSize: string
    memberNumberPrefix: string
    name: string
    officeAddress: string
    startDate: string
    state: string
    timezone: string
  }
  profileSections: ProfileSettingsSection[]
  status: "ready"
}

type ProfileSettingsUnavailableState = {
  body: string
  status: "unavailable"
  title: string
}

export type ProfileSettingsPageState =
  | ProfileSettingsReadyState
  | ProfileSettingsUnavailableState

const notAdded = "Not added"

function fact(label: string, value: string | null | undefined): SettingsFact {
  return value ? { label, value } : { label, missing: true, value: notAdded }
}

export async function loadProfileSettingsPage(): Promise<ProfileSettingsPageState> {
  const context = await getDashboardServerContext()
  const tenant = context.tenant

  if (!tenant) {
    return {
      body: "Open your cooperative's dashboard to see its details.",
      status: "unavailable",
      title: "No cooperative open",
    }
  }

  const currentSizeRange = resolveCooperativeSizeRange(tenant.currentSize)
  const stateValue = tenant.state ?? tenant.region ?? null

  return {
    // Matches the sidebar rule for this page and the API save check.
    canManageProfile: hasAnyRole(
      context.auth.membership?.role,
      workspaceAdminRoles
    ),
    devMode: canShowQuickFill(context),
    formDefaultValues: {
      city: tenant.city ?? "",
      country: tenant.country ?? defaultCooperativeCountry,
      currentSize: currentSizeRange ? String(currentSizeRange.value) : "",
      memberNumberPrefix: tenant.memberNumberPrefix ?? "",
      name: tenant.name,
      officeAddress: tenant.officeAddress ?? "",
      startDate: tenant.startDate ?? "",
      state: stateValue ?? "",
      timezone: tenant.timezone,
    },
    profileSections: [
      {
        facts: [
          fact("Name", tenant.name),
          fact(
            "Number of members",
            formatCooperativeSizeRangeLabel(tenant.currentSize, "")
          ),
          fact(
            "Member numbers start with",
            tenant.memberNumberPrefix?.trim() || null
          ),
          fact("Records start on", formatDayMonthYear(tenant.startDate)),
          fact("Time zone", tenant.timezone.replace(/_/g, " ")),
        ],
        key: "cooperative",
        title: "Your cooperative",
      },
      {
        facts: [
          fact("Address", tenant.officeAddress),
          fact("Town or city", tenant.city),
          fact("State", stateValue),
          fact("Country", tenant.country),
        ],
        key: "office",
        title: "Office",
      },
    ],
    status: "ready",
  }
}
