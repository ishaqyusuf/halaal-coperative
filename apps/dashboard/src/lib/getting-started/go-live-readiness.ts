import type {
  GoLiveFinancingReadiness,
  GoLiveLoanProductPlan,
  GoLiveOwnerMember,
} from "@halaalvest/db"
import type {
  InitialMigrationSnapshot,
  InitialMigrationStepKey,
} from "@halaalvest/domain"
import { formatCurrency } from "@halaalvest/utils"

/** Every readiness check shown before going live. `finalization` is the go-live itself. */
export type GoLiveReadinessKey = Exclude<InitialMigrationStepKey, "finalization">

export type GoLiveReadinessRow = {
  fixHref: string
  key: GoLiveReadinessKey | "owner_kyc"
  label: string
  ready: boolean
}

/**
 * Extra go-live data beyond the migration snapshot (ADR-20261113). `null`
 * owner means no member record is linked to the signed-in admin yet.
 */
export type GoLiveChecklistData = {
  financing: GoLiveFinancingReadiness
  owner: GoLiveOwnerMember | null
}

const goLiveReadinessChecks = {
  migration_setup_mode: {
    fixHref: "/getting-started?step=setup-mode",
    label: "How you're bringing in records",
  },
  finance_start_date: {
    fixHref: "/getting-started?step=setup-mode",
    label: "Finance start date",
  },
  charge_schedules: {
    fixHref: "/getting-started?step=shares-charges",
    label: "Charges",
  },
  business_profit_pools: {
    fixHref: "/getting-started?step=profit",
    label: "Business profits",
  },
  business_profit_seasons: {
    fixHref: "/getting-started?step=profit-seasons",
    label: "Profit seasons",
  },
  share_capital_plan: {
    fixHref: "/getting-started?step=shares-charges",
    label: "Share plan",
  },
  member_profiles: {
    fixHref: "/onboarding-success",
    label: "Member profiles",
  },
  legacy_loans: {
    fixHref: "/onboarding-success",
    label: "Existing loans",
  },
  member_ledger_backfill: {
    fixHref: "/onboarding-success",
    label: "Member balances",
  },
} satisfies Record<GoLiveReadinessKey, { fixHref: string; label: string }>

/** Query flag the dashboard home reads to show the one-time "is live" banner. */
export const goLiveBannerParam = "live"
export const goLiveSuccessHref = `/?${goLiveBannerParam}=1`

function isGoLiveReadinessKey(
  key: InitialMigrationStepKey
): key is GoLiveReadinessKey {
  return key !== "finalization"
}

/**
 * The owner's own member record must be KYC verified before going live, so
 * they can borrow and guarantee on day one. The fix opens that record's KYC
 * sheet, or step 10 when no record is linked yet.
 */
export function getOwnerKycReadinessRow(
  owner: GoLiveOwnerMember | null
): GoLiveReadinessRow {
  return {
    fixHref: owner
      ? `/members/${encodeURIComponent(owner.id)}?memberDetailSheetType=kyc`
      : "/onboarding-success",
    key: "owner_kyc",
    label: "Your KYC",
    ready: owner?.kycStatus === "verified",
  }
}

/**
 * Rows in snapshot step order. A row is Ready when its key is not in
 * `missingStepKeys`, which is the same rule the review step used before.
 * With checklist data, the owner's KYC row follows the snapshot rows.
 */
export function getGoLiveReadinessRows(
  snapshot: Pick<InitialMigrationSnapshot, "missingStepKeys" | "steps">,
  checklist?: Pick<GoLiveChecklistData, "owner"> | null
): GoLiveReadinessRow[] {
  const missing = new Set(snapshot.missingStepKeys)

  const rows: GoLiveReadinessRow[] = snapshot.steps.flatMap((step) => {
    if (!isGoLiveReadinessKey(step.key)) return []

    return [
      {
        ...goLiveReadinessChecks[step.key],
        key: step.key,
        ready: !missing.has(step.key),
      },
    ]
  })

  return checklist ? [...rows, getOwnerKycReadinessRow(checklist.owner)] : rows
}

/**
 * Today's UI rule: no missing step other than `finalization`, and, when the
 * checklist data is loaded, the owner's KYC is verified. The server does not
 * enforce the KYC row (UI readiness stays stricter than the server).
 */
export function isReadyToGoLive(
  snapshot: Pick<InitialMigrationSnapshot, "missingStepKeys">,
  checklist?: Pick<GoLiveChecklistData, "owner"> | null
) {
  const stepsReady = snapshot.missingStepKeys.every(
    (key) => key === "finalization"
  )

  return checklist
    ? stepsReady && getOwnerKycReadinessRow(checklist.owner).ready
    : stepsReady
}

export const financingSettingsHref = "/settings/finance/loan"

function formatPeriodMonth(periodStart: string) {
  const date = new Date(`${periodStart}T00:00:00.000Z`)

  return Number.isNaN(date.getTime())
    ? periodStart
    : date.toLocaleDateString("en-GB", {
        month: "long",
        timeZone: "UTC",
        year: "numeric",
      })
}

export type GoLiveFinancingProductLine = {
  detail: string
  loanType: GoLiveLoanProductPlan["loanType"]
  name: string
  status: "created_at_go_live" | "ready" | "turned_off" | "name_taken"
}

export type GoLiveFinancingSummary = {
  /** Offer "Open {month} financing now" (pre-ticked). */
  canOpenCycle: boolean
  cycleDetail: string
  cycleLabel: string
  monthLabel: string
  products: GoLiveFinancingProductLine[]
}

/** Copy for the Financing section of the Go live checklist. */
export function getGoLiveFinancingSummary(
  financing: GoLiveFinancingReadiness
): GoLiveFinancingSummary {
  const monthLabel = formatPeriodMonth(financing.cycle.periodStart)
  const products = (["quick", "normal"] as const).map((loanType) => {
    const product = financing.products[loanType]
    const terms = `Up to ${product.termMonths} months, ${product.maxSavingsMultiple}× savings`
    const status: GoLiveFinancingProductLine["status"] = product.exists
      ? product.isActive
        ? "ready"
        : "turned_off"
      : product.willCreate
        ? "created_at_go_live"
        : "name_taken"

    return { detail: terms, loanType, name: product.name, status }
  })
  const { cycle } = financing
  const capacity = formatCurrency(cycle.totalCapacityAmount)
  const reserve = formatCurrency(cycle.reserveBufferAmount)
  const commitments = formatCurrency(cycle.projectedCommitmentAmount)

  if (cycle.status && cycle.status !== "draft") {
    return {
      canOpenCycle: false,
      cycleDetail: `Capacity and allocations for ${monthLabel} are already set.`,
      cycleLabel: `${monthLabel} financing is ${cycle.status}.`,
      monthLabel,
      products,
    }
  }

  if (cycle.canOpenAtGoLive) {
    return {
      canOpenCycle: true,
      cycleDetail: `${capacity} to lend this month from ${commitments} of monthly commitments, after a ${reserve} reserve. You can pause it in Finance settings.`,
      cycleLabel: `Open ${monthLabel} financing now`,
      monthLabel,
      products,
    }
  }

  return {
    canOpenCycle: false,
    cycleDetail:
      cycle.projectedCommitmentAmount > 0
        ? `Your ${reserve} reserve covers all ${commitments} of monthly commitments. Lower it in Finance settings, then open ${monthLabel} financing there.`
        : `Financing capacity comes from members' monthly commitments, and none are set yet. Add them on member records, then open ${monthLabel} financing in Finance settings.`,
    cycleLabel: `${monthLabel} financing can't open yet.`,
    monthLabel,
    products,
  }
}

export function getGoLiveConfirmationLabel(tenantName: string) {
  return `I've checked the balances with our records. Start live operations for ${tenantName}.`
}

/** Where members sign in, e.g. `amanah.halaalvest.com` or `halaalvest.com/amanah`. */
export function formatMemberSignInHost(input: {
  externalBasePath?: string | null
  host: string | null | undefined
}) {
  const host = input.host?.trim()
  if (!host) return null

  const basePath = input.externalBasePath?.replace(/\/+$/, "") ?? ""

  return `${host}${basePath}`
}

export function getGoLiveBannerMessage(input: {
  signInHost: string | null
  tenantName: string
}) {
  return input.signInHost
    ? `${input.tenantName} is live. Members can sign in at ${input.signInHost} with their member code.`
    : `${input.tenantName} is live. Members can sign in with their member code.`
}
