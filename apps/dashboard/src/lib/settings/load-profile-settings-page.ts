import {
  defaultCooperativeCountry,
  formatCooperativeSizeRangeLabel,
  resolveCooperativeSizeRange,
} from "@halaalvest/domain"
import {
  canShowQuickFill,
  getDashboardServerContext,
} from "@/lib/server-context"
import { hasAnyRole, workspaceConfigurationRoles } from "@/lib/workspace-access"

export type ProfileSettingsField = {
  label: string
  value: string
}

export type ProfileSettingsSection = {
  description: string
  fields: ProfileSettingsField[]
  key: "identity" | "location" | "regional"
  title: string
}

type ProfileSettingsReadyState = {
  canManageProfile: boolean
  currentSizeLabel: string
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
  locationSummary: string
  memberPrefixLabel: string
  profileSections: ProfileSettingsSection[]
  status: "ready"
  tenantName: string
}

type ProfileSettingsUnavailableState = {
  body: string
  description: string
  status: "unavailable"
  title: string
}

export type ProfileSettingsPageState =
  | ProfileSettingsReadyState
  | ProfileSettingsUnavailableState

export async function loadProfileSettingsPage(): Promise<ProfileSettingsPageState> {
  const context = await getDashboardServerContext()
  const tenant = context.tenant

  if (!tenant) {
    return {
      body: "Open a cooperative workspace before reviewing its identity and office details.",
      description:
        "Cooperative identity, location, and regional settings are available from a cooperative workspace.",
      status: "unavailable",
      title: "Choose a cooperative workspace first.",
    }
  }

  const currentSizeRange = resolveCooperativeSizeRange(tenant.currentSize)
  const currentSizeLabel = formatCooperativeSizeRangeLabel(
    tenant.currentSize,
    "Not captured"
  )
  const currentSizeDetailLabel = formatCooperativeSizeRangeLabel(
    tenant.currentSize,
    "Not captured yet"
  )
  const stateValue = tenant.state ?? tenant.region ?? null
  const countryValue = tenant.country ?? null
  const locationSummary =
    [tenant.city, stateValue, countryValue].filter(Boolean).join(", ") ||
    "Not captured"
  const notCaptured = "Not captured yet"

  return {
    canManageProfile: hasAnyRole(
      context.auth.membership?.role,
      workspaceConfigurationRoles
    ),
    currentSizeLabel,
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
    locationSummary,
    memberPrefixLabel: tenant.memberNumberPrefix ?? "Not set",
    profileSections: [
      {
        description:
          "The cooperative identity used across member records, statements, and workspace communication.",
        fields: [
          { label: "Cooperative name", value: tenant.name },
          { label: "Current size", value: currentSizeDetailLabel },
          {
            label: "Member prefix",
            value: tenant.memberNumberPrefix ?? notCaptured,
          },
          {
            label: "Finance start date",
            value: tenant.startDate ?? notCaptured,
          },
        ],
        key: "identity",
        title: "Identity",
      },
      {
        description:
          "The primary office address used to identify where the cooperative operates.",
        fields: [
          {
            label: "Office address",
            value: tenant.officeAddress ?? notCaptured,
          },
          { label: "City", value: tenant.city ?? notCaptured },
          { label: "State", value: stateValue ?? notCaptured },
          { label: "Country", value: countryValue ?? notCaptured },
        ],
        key: "location",
        title: "Office location",
      },
      {
        description:
          "Regional settings used when the workspace displays and records dates and times.",
        fields: [{ label: "Timezone", value: tenant.timezone }],
        key: "regional",
        title: "Regional settings",
      },
    ],
    status: "ready",
    tenantName: tenant.name,
  }
}
