import {
  normalizeQaAcceleratorEnvironment,
  normalizeQaDomain,
  type QaAcceleratorEnvironment,
} from "./qa-accelerator"
import {
  SUBSCRIPTION_PLAN_CODES,
  SUBSCRIPTION_PLAN_DEFINITIONS,
  type SubscriptionPlanCode,
} from "./subscriptions"

export const PRODUCTION_QA_HARNESS_CONTRACT_VERSION = 1 as const

export const PRODUCTION_QA_HARNESS_ROLES = [
  "tenant_admin",
  "finance_officer",
  "operations_officer",
  "member",
] as const

export const PRODUCTION_QA_HARNESS_STATES = [
  "healthy",
  "empty",
  "stale",
  "overdue",
  "blocked",
  "at_capacity",
  "kyc_incomplete",
  "pending_review",
  "published_profit",
] as const

export const PRODUCTION_QA_HARNESS_PRODUCT_AREAS = [
  "activation_auth",
  "role_switching",
  "subscription",
  "member_reads",
  "requests",
  "receipts",
  "support",
  "admin_reviews",
  "contributions",
  "charges",
  "financing_execution",
  "service_fulfillment",
  "reports",
  "push_deep_links",
  "revocation",
  "shares_profit",
] as const

export const PRODUCTION_QA_HARNESS_SERVICE_KEYS = [
  "payment_receipts",
  "procurement",
  "food_purchase",
  "support_cases",
  "collection_sources",
  "collection_source_batch_posting",
] as const

export const PRODUCTION_QA_HARNESS_ACCESS_MODES = [
  "disabled",
  "office_only",
  "member_self_service",
  "read_only",
] as const

export type ProductionQaHarnessRole =
  (typeof PRODUCTION_QA_HARNESS_ROLES)[number]
export type ProductionQaHarnessState =
  (typeof PRODUCTION_QA_HARNESS_STATES)[number]
export type ProductionQaHarnessProductArea =
  (typeof PRODUCTION_QA_HARNESS_PRODUCT_AREAS)[number]
export type ProductionQaHarnessServiceKey =
  (typeof PRODUCTION_QA_HARNESS_SERVICE_KEYS)[number]
export type ProductionQaHarnessAccessMode =
  (typeof PRODUCTION_QA_HARNESS_ACCESS_MODES)[number]
export type ProductionQaHarnessOperationProfile =
  | "restricted"
  | "office_led"
  | "member_self_service"
  | "read_only"

export const PRODUCTION_QA_HARNESS_OPERATION_PROFILES = {
  restricted: {
    collection_source_batch_posting: "disabled",
    collection_sources: "disabled",
    food_purchase: "disabled",
    payment_receipts: "office_only",
    procurement: "disabled",
    support_cases: "read_only",
  },
  office_led: {
    collection_source_batch_posting: "office_only",
    collection_sources: "office_only",
    food_purchase: "office_only",
    payment_receipts: "office_only",
    procurement: "office_only",
    support_cases: "member_self_service",
  },
  member_self_service: {
    collection_source_batch_posting: "office_only",
    collection_sources: "office_only",
    food_purchase: "member_self_service",
    payment_receipts: "member_self_service",
    procurement: "member_self_service",
    support_cases: "member_self_service",
  },
  read_only: {
    collection_source_batch_posting: "read_only",
    collection_sources: "read_only",
    food_purchase: "read_only",
    payment_receipts: "read_only",
    procurement: "read_only",
    support_cases: "read_only",
  },
} as const satisfies Record<
  ProductionQaHarnessOperationProfile,
  Record<ProductionQaHarnessServiceKey, ProductionQaHarnessAccessMode>
>

type ProductionQaHarnessScenarioDefinition = {
  activeAddonCodes: readonly string[]
  cooperativeCodePrefix: string
  key: string
  label: string
  operationProfile: ProductionQaHarnessOperationProfile
  planCode: SubscriptionPlanCode
  productAreas: readonly ProductionQaHarnessProductArea[]
  state: ProductionQaHarnessState
}

const PRODUCTION_QA_HARNESS_SCENARIOS = [
  {
    activeAddonCodes: [],
    cooperativeCodePrefix: "QFB",
    key: "free-beta-empty",
    label: "Free Beta Empty",
    operationProfile: "restricted",
    planCode: "free_beta",
    productAreas: ["activation_auth", "subscription", "member_reads"],
    state: "empty",
  },
  {
    activeAddonCodes: ["member_login"],
    cooperativeCodePrefix: "QSH",
    key: "starter-healthy",
    label: "Starter Healthy",
    operationProfile: "office_led",
    planCode: "starter",
    productAreas: [
      "activation_auth",
      "role_switching",
      "subscription",
      "member_reads",
      "contributions",
      "charges",
      "push_deep_links",
      "revocation",
    ],
    state: "healthy",
  },
  {
    activeAddonCodes: [],
    cooperativeCodePrefix: "QSR",
    key: "standard-review",
    label: "Standard Pending Review",
    operationProfile: "member_self_service",
    planCode: "standard",
    productAreas: [
      "requests",
      "receipts",
      "support",
      "admin_reviews",
      "service_fulfillment",
    ],
    state: "pending_review",
  },
  {
    activeAddonCodes: [],
    cooperativeCodePrefix: "QGO",
    key: "growth-overdue",
    label: "Growth Overdue",
    operationProfile: "member_self_service",
    planCode: "growth",
    productAreas: ["financing_execution", "reports"],
    state: "overdue",
  },
  {
    activeAddonCodes: [],
    cooperativeCodePrefix: "QEP",
    key: "enterprise-profit",
    label: "Enterprise Published Profit",
    operationProfile: "office_led",
    planCode: "enterprise",
    productAreas: ["shares_profit", "reports"],
    state: "published_profit",
  },
  {
    activeAddonCodes: [],
    cooperativeCodePrefix: "QSC",
    key: "starter-capacity",
    label: "Starter At Capacity",
    operationProfile: "office_led",
    planCode: "starter",
    productAreas: ["subscription", "member_reads"],
    state: "at_capacity",
  },
  {
    activeAddonCodes: [],
    cooperativeCodePrefix: "QSK",
    key: "standard-kyc",
    label: "Standard KYC Incomplete",
    operationProfile: "member_self_service",
    planCode: "standard",
    productAreas: ["activation_auth", "requests", "financing_execution"],
    state: "kyc_incomplete",
  },
  {
    activeAddonCodes: [],
    cooperativeCodePrefix: "QGB",
    key: "growth-blocked",
    label: "Growth Blocked",
    operationProfile: "restricted",
    planCode: "growth",
    productAreas: ["service_fulfillment", "push_deep_links", "revocation"],
    state: "blocked",
  },
  {
    activeAddonCodes: [],
    cooperativeCodePrefix: "QES",
    key: "enterprise-stale",
    label: "Enterprise Stale",
    operationProfile: "read_only",
    planCode: "enterprise",
    productAreas: ["reports", "push_deep_links"],
    state: "stale",
  },
] as const satisfies readonly ProductionQaHarnessScenarioDefinition[]

const ROLE_LABELS = {
  finance_officer: "Finance Officer",
  member: "Member",
  operations_officer: "Operations Officer",
  tenant_admin: "Tenant Admin",
} as const satisfies Record<ProductionQaHarnessRole, string>

const ROLE_ACCOUNT_IDENTIFIERS = {
  finance_officer: "0102",
  member: "0104",
  operations_officer: "0103",
  tenant_admin: "0101",
} as const satisfies Record<ProductionQaHarnessRole, string>

export type ProductionQaHarnessIdentityPlan = {
  cooperativeNumber: string
  email: string
  fullName: string
  memberNumber: string | null
  role: ProductionQaHarnessRole
  secondaryRoles: readonly ProductionQaHarnessRole[]
}

export type ProductionQaHarnessScenarioPlan = {
  activeAddonCodes: string[]
  cooperativeCodePrefix: string
  identities: ProductionQaHarnessIdentityPlan[]
  key: string
  memberNumberPrefix: string
  name: string
  operationProfile: ProductionQaHarnessOperationProfile
  planCode: SubscriptionPlanCode
  productAreas: ProductionQaHarnessProductArea[]
  serviceModes: Record<
    ProductionQaHarnessServiceKey,
    ProductionQaHarnessAccessMode
  >
  slug: string
  state: ProductionQaHarnessState
}

export type ProductionQaHarnessPlan = {
  contractVersion: typeof PRODUCTION_QA_HARNESS_CONTRACT_VERSION
  environment: "local" | "development" | "preview"
  generatedAt: string
  qaDomain: string
  remainingGaps: readonly string[]
  runId: string
  scenarios: ProductionQaHarnessScenarioPlan[]
}

export function createProductionQaHarnessPlan(input: {
  environment: QaAcceleratorEnvironment | string
  now?: Date
  qaDomain: string
  runId: string
}): ProductionQaHarnessPlan {
  const environment = normalizeQaAcceleratorEnvironment(input.environment)
  if (
    environment !== "local" &&
    environment !== "development" &&
    environment !== "preview"
  ) {
    throw new Error(
      "The production-contract QA harness is available only in local, development, or preview environments."
    )
  }

  const qaDomain = normalizeQaDomain(input.qaDomain)
  if (!qaDomain.endsWith(".test") || qaDomain.split(".").length < 2) {
    throw new Error("An exact .test QA Domain is required.")
  }

  const runId = input.runId.trim().toLowerCase()
  if (!/^[a-z0-9][a-z0-9-]{0,31}$/.test(runId)) {
    throw new Error(
      "QA harness run id must use 1-32 lowercase letters, numbers, or hyphens."
    )
  }

  const scenarios = PRODUCTION_QA_HARNESS_SCENARIOS.map((scenario) => {
    const memberNumberPrefix = `${scenario.cooperativeCodePrefix}-`
    const identities = PRODUCTION_QA_HARNESS_ROLES.map((role) => {
      const isRoleSwitchIdentity =
        scenario.key === "starter-healthy" && role === "tenant_admin"
      return {
        cooperativeNumber: `${scenario.cooperativeCodePrefix}-${ROLE_ACCOUNT_IDENTIFIERS[role]}`,
        email: `qa-${scenario.key}-${role.replaceAll("_", "-")}@${qaDomain}`,
        fullName: `QA ONLY — ${scenario.label} ${ROLE_LABELS[role]}`,
        memberNumber:
          role === "member"
            ? `${memberNumberPrefix}0001`
            : isRoleSwitchIdentity
              ? `${memberNumberPrefix}0002`
              : null,
        role,
        secondaryRoles: isRoleSwitchIdentity ? (["member"] as const) : [],
      }
    })

    return {
      activeAddonCodes: [...scenario.activeAddonCodes],
      cooperativeCodePrefix: scenario.cooperativeCodePrefix,
      identities,
      key: scenario.key,
      memberNumberPrefix,
      name: `QA ONLY — ${scenario.label} Cooperative`,
      operationProfile: scenario.operationProfile,
      planCode: scenario.planCode,
      productAreas: [...scenario.productAreas],
      serviceModes: {
        ...PRODUCTION_QA_HARNESS_OPERATION_PROFILES[scenario.operationProfile],
      },
      slug: `qa-harness-v1-${scenario.key}`,
      state: scenario.state,
    }
  })

  const plan = {
    contractVersion: PRODUCTION_QA_HARNESS_CONTRACT_VERSION,
    environment,
    generatedAt: (input.now ?? new Date()).toISOString(),
    qaDomain,
    remainingGaps: [
      "Authorized production-contract positive and negative journeys",
      "QA-routed invitation delivery and persistence evidence",
      "Visual checkpoints and native-device evidence",
    ],
    runId,
    scenarios,
  } satisfies ProductionQaHarnessPlan

  assertProductionQaHarnessPlan(plan)
  return plan
}

export function assertProductionQaHarnessPlan(
  plan: ProductionQaHarnessPlan
): void {
  if (plan.contractVersion !== PRODUCTION_QA_HARNESS_CONTRACT_VERSION) {
    throw new Error("Unsupported production-contract QA harness version.")
  }
  if (!plan.qaDomain.endsWith(".test")) {
    throw new Error("QA harness tenants must use an exact .test source domain.")
  }

  assertRequiredCoverage(
    "subscription plans",
    plan.scenarios.map(({ planCode }) => planCode),
    SUBSCRIPTION_PLAN_CODES
  )
  assertRequiredCoverage(
    "scenario states",
    plan.scenarios.map(({ state }) => state),
    PRODUCTION_QA_HARNESS_STATES
  )
  assertRequiredCoverage(
    "Operation Profiles",
    plan.scenarios.map(({ operationProfile }) => operationProfile),
    Object.keys(PRODUCTION_QA_HARNESS_OPERATION_PROFILES)
  )
  assertRequiredCoverage(
    "product areas",
    plan.scenarios.flatMap(({ productAreas }) => productAreas),
    PRODUCTION_QA_HARNESS_PRODUCT_AREAS
  )

  const slugs = new Set<string>()
  const prefixes = new Set<string>()
  const emails = new Set<string>()
  const cooperativeNumbers = new Set<string>()

  for (const scenario of plan.scenarios) {
    if (!scenario.name.startsWith("QA ONLY — ")) {
      throw new Error(`Scenario ${scenario.key} is not visibly QA classified.`)
    }
    if (slugs.has(scenario.slug)) {
      throw new Error(`Duplicate QA harness slug: ${scenario.slug}.`)
    }
    if (prefixes.has(scenario.cooperativeCodePrefix)) {
      throw new Error(
        `Duplicate QA harness cooperative prefix: ${scenario.cooperativeCodePrefix}.`
      )
    }
    slugs.add(scenario.slug)
    prefixes.add(scenario.cooperativeCodePrefix)

    if (
      new Set(scenario.activeAddonCodes).size !==
      scenario.activeAddonCodes.length
    ) {
      throw new Error(
        `Scenario ${scenario.key} contains duplicate active add-ons.`
      )
    }
    const availableAddonCodes = new Set(
      SUBSCRIPTION_PLAN_DEFINITIONS[scenario.planCode].availableAddonCodes
    )
    for (const addonCode of scenario.activeAddonCodes) {
      if (!availableAddonCodes.has(addonCode)) {
        throw new Error(
          `Scenario ${scenario.key} contains add-on ${addonCode} outside plan ${scenario.planCode}.`
        )
      }
    }

    assertRequiredCoverage(
      `${scenario.key} roles`,
      scenario.identities.map(({ role }) => role),
      PRODUCTION_QA_HARNESS_ROLES
    )
    for (const identity of scenario.identities) {
      if (!identity.email.endsWith(`@${plan.qaDomain}`)) {
        throw new Error(
          `Scenario ${scenario.key} contains an identity outside its QA Domain.`
        )
      }
      if (!identity.fullName.startsWith("QA ONLY — ")) {
        throw new Error(
          `Scenario ${scenario.key} contains an identity without a QA label.`
        )
      }
      if (!/^[A-Z]{3,5}-\d{4}$/.test(identity.cooperativeNumber)) {
        throw new Error(
          `Scenario ${scenario.key} contains an invalid cooperative number.`
        )
      }
      if (emails.has(identity.email)) {
        throw new Error(`Duplicate QA harness email: ${identity.email}.`)
      }
      if (cooperativeNumbers.has(identity.cooperativeNumber)) {
        throw new Error(
          `Duplicate QA harness cooperative number: ${identity.cooperativeNumber}.`
        )
      }
      if (
        identity.secondaryRoles.includes(identity.role) ||
        new Set(identity.secondaryRoles).size !== identity.secondaryRoles.length
      ) {
        throw new Error(
          `Scenario ${scenario.key} contains invalid secondary roles for ${identity.role}.`
        )
      }
      if (
        (identity.role === "member" ||
          identity.secondaryRoles.includes("member")) !==
        Boolean(identity.memberNumber)
      ) {
        throw new Error(
          `Scenario ${scenario.key} has inconsistent member identity planning.`
        )
      }
      emails.add(identity.email)
      cooperativeNumbers.add(identity.cooperativeNumber)
    }
  }
}

export type ProductionQaHarnessExecutionResult = {
  errorCode?:
    | "live_tenant_collision"
    | "qa_domain_mismatch"
    | "identifier_collision"
    | "database_unavailable"
    | "provision_failed"
  scenarioKey: string
  status: "planned" | "provisioned" | "failed" | "cleaned"
  tenantId?: string
}

export type ProductionQaHarnessStateFacts = {
  activeMemberCount: number
  activeMemberLimit: number | null
  hasKycIncompleteMember: boolean
  hasOverdueSchedule: boolean
  hasPendingReview: boolean
  hasPublishedProfit: boolean
  hasStaleRecord: boolean
  hasVerifiedActiveMember: boolean
  productRecordCount: number
  subscriptionStatus: string | null
  tenantStatus: string | null
}

export type ProductionQaHarnessStateMaterialization = {
  evidenceCode: string
  materialized: boolean
  state: ProductionQaHarnessState
}

export function evaluateProductionQaHarnessStateMaterialization(input: {
  facts: ProductionQaHarnessStateFacts
  state: ProductionQaHarnessState
}): ProductionQaHarnessStateMaterialization {
  const { facts, state } = input
  const tenantIsActive = facts.tenantStatus === "active"
  const evaluations = {
    at_capacity: {
      evidenceCode: "active_member_limit_reached",
      materialized:
        tenantIsActive &&
        facts.activeMemberLimit !== null &&
        facts.activeMemberLimit > 0 &&
        facts.activeMemberCount >= facts.activeMemberLimit,
    },
    blocked: {
      evidenceCode: "subscription_suspended",
      materialized: tenantIsActive && facts.subscriptionStatus === "suspended",
    },
    empty: {
      evidenceCode: "no_core_product_records",
      materialized: tenantIsActive && facts.productRecordCount === 0,
    },
    healthy: {
      evidenceCode: "active_verified_member",
      materialized:
        tenantIsActive &&
        ["active", "enterprise", "free_beta", "manual", "trialing"].includes(
          facts.subscriptionStatus ?? ""
        ) &&
        facts.hasVerifiedActiveMember,
    },
    kyc_incomplete: {
      evidenceCode: "active_member_kyc_incomplete",
      materialized: tenantIsActive && facts.hasKycIncompleteMember,
    },
    overdue: {
      evidenceCode: "overdue_repayment_schedule",
      materialized: tenantIsActive && facts.hasOverdueSchedule,
    },
    pending_review: {
      evidenceCode: "pending_product_review",
      materialized: tenantIsActive && facts.hasPendingReview,
    },
    published_profit: {
      evidenceCode: "published_dividend_period",
      materialized: tenantIsActive && facts.hasPublishedProfit,
    },
    stale: {
      evidenceCode: "stale_expected_state_record",
      materialized: tenantIsActive && facts.hasStaleRecord,
    },
  } as const satisfies Record<
    ProductionQaHarnessState,
    { evidenceCode: string; materialized: boolean }
  >

  return { state, ...evaluations[state] }
}

export function createProductionQaHarnessEvidenceReport(input: {
  generatedAt?: Date
  plan: ProductionQaHarnessPlan
  results: readonly ProductionQaHarnessExecutionResult[]
}) {
  const statuses = {
    cleaned: 0,
    failed: 0,
    planned: 0,
    provisioned: 0,
  }
  for (const result of input.results) statuses[result.status] += 1

  const lines = [
    "# Production-contract QA harness evidence",
    "",
    `- Contract: v${input.plan.contractVersion}`,
    `- Environment: ${input.plan.environment}`,
    `- QA Domain: ${input.plan.qaDomain}`,
    `- Run: ${input.plan.runId}`,
    `- Generated: ${(input.generatedAt ?? new Date(input.plan.generatedAt)).toISOString()}`,
    `- Results: ${statuses.provisioned} provisioned, ${statuses.planned} planned, ${statuses.cleaned} cleaned, ${statuses.failed} failed`,
    "",
    "## Scenario matrix",
    "",
    "| Scenario | Plan | Operation Profile | State | Result |",
    "| --- | --- | --- | --- | --- |",
  ]

  const resultsByScenario = new Map(
    input.results.map((result) => [result.scenarioKey, result])
  )
  for (const scenario of input.plan.scenarios) {
    const result = resultsByScenario.get(scenario.key)
    const resultLabel = result
      ? `${result.status}${result.errorCode ? ` (${result.errorCode})` : ""}`
      : "not run"
    lines.push(
      `| ${scenario.key} | ${scenario.planCode} | ${scenario.operationProfile} | ${scenario.state} | ${resultLabel} |`
    )
  }

  lines.push("", "## Remaining acceptance gaps", "")
  for (const gap of input.plan.remainingGaps) lines.push(`- ${gap}`)
  lines.push(
    "",
    "No password, OTP, tester credential, bearer token, provider credential, or raw production data is included in this report."
  )

  return lines.join("\n")
}

function assertRequiredCoverage(
  label: string,
  actual: readonly string[],
  required: readonly string[]
) {
  const actualSet = new Set(actual)
  const missing = required.filter((entry) => !actualSet.has(entry))
  if (missing.length > 0) {
    throw new Error(`QA harness is missing ${label}: ${missing.join(", ")}.`)
  }
}
