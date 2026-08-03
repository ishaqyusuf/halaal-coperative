import type {
  TenantMigrationSetupMode,
  TenantMigrationSetupSettings,
  TenantOperationProfileReadModel,
} from "@halaalvest/db"
import type { InitialMigrationSnapshot } from "@halaalvest/domain"
import type { GettingStartedStepKey } from "@/hooks/use-getting-started-params"
import type {
  GettingStartedBusinessProfitSeasonRow,
  GettingStartedPageViewProps,
} from "./getting-started-page-types"
import {
  firstOperationProfileStep,
  operationProfileStepHref,
} from "./operation-profile-flow"

const setupStepKeys: GettingStartedStepKey[] = [
  "setup-mode",
  "operation-profile",
  "start-date",
  "charges",
  "shares",
  "profit-policy",
  "business",
  "profit-seasons",
]

function shouldShowProfitSeasonsSetup(props: {
  businessProfitSeasons: GettingStartedBusinessProfitSeasonRow[]
  migrationSetup: TenantMigrationSetupSettings
  migrationSnapshot: InitialMigrationSnapshot
}) {
  if (props.migrationSetup.mode === "brought_forward") {
    const today = new Date().toISOString().slice(0, 10)

    return props.businessProfitSeasons.some(
      (season) =>
        season.periodEnd < today &&
        season.profitEntries.some((entry) => entry.status === "pending")
    )
  }

  return (
    props.migrationSetup.mode === "historical_backfill" ||
    props.migrationSnapshot.missingStepKeys.includes("business_profit_seasons")
  )
}

export function getOrderedGettingStartedStepKeys(
  props: Pick<
    GettingStartedPageViewProps,
    "businessProfitSeasons" | "migrationSetup" | "migrationSnapshot"
  >
) {
  return setupStepKeys.filter(
    (key) => key !== "profit-seasons" || shouldShowProfitSeasonsSetup(props)
  )
}

export function getGettingStartedStepGroups(
  props: Pick<
    GettingStartedPageViewProps,
    "businessProfitSeasons" | "migrationSetup" | "migrationSnapshot"
  >
) {
  const orderedStepKeys = getOrderedGettingStartedStepKeys(props)

  return [
    {
      label: "Foundation",
      steps: orderedStepKeys.filter((key) =>
        ["setup-mode", "operation-profile", "start-date"].includes(key)
      ),
    },
    {
      label:
        props.migrationSetup.mode === "brought_forward"
          ? "Current finance setup"
          : "Financial history",
      steps: orderedStepKeys.filter(
        (key) =>
          !["setup-mode", "operation-profile", "start-date"].includes(key)
      ),
    },
  ] satisfies Array<{ label: string; steps: GettingStartedStepKey[] }>
}

export function isGettingStartedStepComplete(
  key: GettingStartedStepKey,
  snapshot: InitialMigrationSnapshot,
  migrationSetup?: TenantMigrationSetupSettings,
  operationProfile?: TenantOperationProfileReadModel
) {
  const missing = new Set(snapshot.missingStepKeys)

  if (key === "start-date") return !missing.has("finance_start_date")
  if (key === "setup-mode") return Boolean(migrationSetup?.id)
  if (key === "operation-profile") {
    return Boolean(operationProfile?.reviewedAt)
  }
  if (key === "charges") return !missing.has("charge_schedules")
  if (key === "shares") return true
  if (key === "profit-policy") return true
  if (key === "business") {
    return (
      migrationSetup?.mode === "brought_forward" ||
      !missing.has("business_profit_pools")
    )
  }
  if (key === "profit-seasons") {
    return (
      migrationSetup?.mode === "brought_forward" ||
      !missing.has("business_profit_seasons")
    )
  }
  if (key === "admin-member") {
    return (
      !missing.has("member_profiles") &&
      !missing.has("legacy_loans") &&
      !missing.has("member_ledger_backfill")
    )
  }

  return !missing.has("finalization")
}

export function getGettingStartedStepMeta(
  key: GettingStartedStepKey,
  migrationMode: TenantMigrationSetupMode
) {
  const isBroughtForward = migrationMode === "brought_forward"
  const meta = {
    "admin-member": {
      description: isBroughtForward
        ? "Capture the current opening position for the registered admin, then repeat it for every member."
        : "Complete historical backfill for the registered admin, then repeat it for every member.",
      label: isBroughtForward
        ? "Member opening positions"
        : "Member onboarding",
    },
    business: {
      description: isBroughtForward
        ? "Record businesses participating in the current profit-sharing season."
        : "Record historical business pools, profits, and expenses.",
      label: isBroughtForward
        ? "Current-season businesses"
        : "Business and profits",
    },
    "profit-seasons": {
      description:
        "Review generated dividend seasons, confirm deductions, and prepare profit entries for member migration.",
      label: "Dividend sharing review",
    },
    charges: {
      description: isBroughtForward
        ? "Set the active charges members will pay from the opening date onward."
        : "Set cooperative charges and their dated history for member backfill.",
      label: isBroughtForward ? "Current charges" : "Charges and history",
    },
    review: {
      description:
        "Review every setup gate and finalize the one-time migration into live operations.",
      label: "Review and go live",
    },
    shares: {
      description: isBroughtForward
        ? "Set the cooperative's current share model and active terms."
        : "Define share capital history when it should affect member ledgers.",
      label: isBroughtForward ? "Current share model" : "Shares and history",
    },
    "profit-policy": {
      description: isBroughtForward
        ? "Set the rules for the current and future profit-sharing seasons."
        : "Set the dividend season used by historical and future allocations.",
      label: isBroughtForward
        ? "Current profit-sharing policy"
        : "Profit-sharing season",
    },
    "start-date": {
      description:
        "Anchor historical finance so every charge, share, loan, and contribution is dated against the same start month.",
      label: "Cooperative start date",
    },
    "setup-mode": {
      description:
        "Choose whether this cooperative will rebuild history or carry current balances forward.",
      label: "Setup mode",
    },
    "operation-profile": {
      description:
        "Confirm how members request commitments, receipts, procurement, Foodstuff Purchase, support, and payroll collections.",
      label: "Operation profile",
    },
  } satisfies Record<
    GettingStartedStepKey,
    { description: string; label: string }
  >

  return meta[key]
}

export function formatGettingStartedDate(value: string | null) {
  if (!value) return "Not set"

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00.000Z`))
}

export function getGettingStartedStepHref(key: GettingStartedStepKey) {
  if (key === "operation-profile") {
    return operationProfileStepHref(firstOperationProfileStep)
  }

  if (key === "admin-member") {
    return "/onboarding-success"
  }

  return `?step=${key}`
}
