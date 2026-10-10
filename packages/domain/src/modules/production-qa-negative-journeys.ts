import {
  type ProductionQaHarnessPlan,
  type ProductionQaHarnessRole,
} from "./production-qa-harness"
import type { ProductionQaJourneySurface } from "./production-qa-journeys"

export const PRODUCTION_QA_NEGATIVE_JOURNEY_CONTRACT_VERSION = 1 as const

export const PRODUCTION_QA_NEGATIVE_CATEGORIES = [
  "offline_write_blocking",
  "stale_state_rejection",
  "entitlement_limits",
  "operation_profile_modes",
  "role_boundaries",
  "cross_tenant_denial",
  "duplicate_command_idempotency",
] as const

export type ProductionQaNegativeCategory =
  (typeof PRODUCTION_QA_NEGATIVE_CATEGORIES)[number]

export const PRODUCTION_QA_NEGATIVE_EXPECTATIONS = [
  "SUCCESS",
  "TRANSPORT_SUPPRESSED",
  "CONFLICT",
  "PERMISSION_DENIED",
  "PRECONDITION_FAILED",
  "NOT_FOUND",
  "IDEMPOTENT_REPLAY",
] as const

export type ProductionQaNegativeExpectation =
  (typeof PRODUCTION_QA_NEGATIVE_EXPECTATIONS)[number]

export type ProductionQaNegativeJourneyStep = {
  contract: string
  evidence: string
  expectation: ProductionQaNegativeExpectation
  invocation: "invoke" | "suppress"
  key: string
  operation: "mutation" | "query" | "visual"
  surface: ProductionQaJourneySurface
}

export type ProductionQaNegativeJourneyDefinition = {
  category: ProductionQaNegativeCategory
  fixturePrerequisites: readonly string[]
  key: string
  role: ProductionQaHarnessRole
  scenarioKey: string
  steps: readonly ProductionQaNegativeJourneyStep[]
}

export type ProductionQaNegativeJourneyPlanItem =
  ProductionQaNegativeJourneyDefinition & {
    cooperativeNumber: string
    email: string
    tenantSlug: string
  }

function apiStep(input: {
  contract: string
  evidence: string
  expectation: ProductionQaNegativeExpectation
  invocation?: "invoke" | "suppress"
  key: string
  operation: "mutation" | "query"
}): ProductionQaNegativeJourneyStep {
  return { ...input, invocation: input.invocation ?? "invoke", surface: "api" }
}

function androidStep(input: {
  contract: string
  evidence: string
  expectation: ProductionQaNegativeExpectation
  key: string
}): ProductionQaNegativeJourneyStep {
  return {
    ...input,
    invocation: "invoke",
    operation: "visual",
    surface: "android",
  }
}

export const PRODUCTION_QA_NEGATIVE_JOURNEYS = [
  {
    category: "offline_write_blocking",
    fixturePrerequisites: ["network_transport_probe"],
    key: "offline-procurement-write",
    role: "member",
    scenarioKey: "starter-healthy",
    steps: [
      apiStep({
        contract: "mobile.member.procurement.createRequest",
        evidence:
          "The client records zero transport calls and creates no optimistic request while offline.",
        expectation: "TRANSPORT_SUPPRESSED",
        invocation: "suppress",
        key: "suppress-request",
        operation: "mutation",
      }),
      androidStep({
        contract: "member/procurement-offline-write",
        evidence:
          "Android preserves existing history and shows the bounded reconnect action without opening review.",
        expectation: "TRANSPORT_SUPPRESSED",
        key: "android-offline",
      }),
    ],
  },
  {
    category: "stale_state_rejection",
    fixturePrerequisites: ["stale_operation_profile_version"],
    key: "stale-operation-profile-command",
    role: "tenant_admin",
    scenarioKey: "enterprise-stale",
    steps: [
      apiStep({
        contract: "mobile.admin.operationProfile.updateService",
        evidence:
          "An outdated expected access mode returns CONFLICT and leaves the setting unchanged.",
        expectation: "CONFLICT",
        key: "reject-stale-update",
        operation: "mutation",
      }),
      androidStep({
        contract: "admin/operation-profile-stale",
        evidence:
          "Android keeps the server value, explains the refresh requirement, and offers one recovery action.",
        expectation: "CONFLICT",
        key: "android-stale",
      }),
    ],
  },
  {
    category: "entitlement_limits",
    fixturePrerequisites: ["active_member_capacity_reached"],
    key: "member-capacity-limit",
    role: "tenant_admin",
    scenarioKey: "starter-capacity",
    steps: [
      apiStep({
        contract: "mobile.admin.members.create",
        evidence:
          "Creating another active member is denied by the current subscription capacity.",
        expectation: "PERMISSION_DENIED",
        key: "reject-member-create",
        operation: "mutation",
      }),
      androidStep({
        contract: "admin/members-capacity-limit",
        evidence:
          "Android retains the directory and presents the plan-capacity recovery path without claiming creation.",
        expectation: "PERMISSION_DENIED",
        key: "android-capacity",
      }),
    ],
  },
  {
    category: "operation_profile_modes",
    fixturePrerequisites: ["procurement_read_only"],
    key: "read-only-procurement-command",
    role: "member",
    scenarioKey: "enterprise-stale",
    steps: [
      apiStep({
        contract: "mobile.member.procurement.createRequest",
        evidence:
          "Read-only Operation Profile mode preserves history but rejects member request creation.",
        expectation: "PRECONDITION_FAILED",
        key: "reject-read-only-request",
        operation: "mutation",
      }),
      androidStep({
        contract: "member/procurement-read-only",
        evidence:
          "Android keeps history readable, suppresses the create form, and shows the concise mode reason.",
        expectation: "PRECONDITION_FAILED",
        key: "android-read-only",
      }),
    ],
  },
  {
    category: "role_boundaries",
    fixturePrerequisites: [],
    key: "member-admin-finance-denial",
    role: "member",
    scenarioKey: "starter-healthy",
    steps: [
      apiStep({
        contract: "mobile.admin.finance.overview",
        evidence:
          "A signed Member workspace cannot read the tenant-wide finance queue.",
        expectation: "PERMISSION_DENIED",
        key: "reject-admin-overview",
        operation: "query",
      }),
      androidStep({
        contract: "member/admin-finance-deep-link-denial",
        evidence:
          "Android rejects the staff destination and stays in the Member shell.",
        expectation: "PERMISSION_DENIED",
        key: "android-role-denial",
      }),
    ],
  },
  {
    category: "cross_tenant_denial",
    fixturePrerequisites: ["foreign_project_financing_request"],
    key: "cross-tenant-project-financing-detail",
    role: "finance_officer",
    scenarioKey: "standard-review",
    steps: [
      apiStep({
        contract: "mobile.admin.projectFinancingOperations.detail",
        evidence:
          "A foreign tenant record identifier resolves to no accessible detail.",
        expectation: "NOT_FOUND",
        key: "reject-foreign-detail",
        operation: "query",
      }),
      androidStep({
        contract: "admin/project-financing-cross-tenant-denial",
        evidence:
          "Android shows the bounded unavailable state without rendering foreign record facts.",
        expectation: "NOT_FOUND",
        key: "android-cross-tenant",
      }),
    ],
  },
  {
    category: "duplicate_command_idempotency",
    fixturePrerequisites: ["active_charge_definition"],
    key: "duplicate-charge-command",
    role: "finance_officer",
    scenarioKey: "starter-healthy",
    steps: [
      apiStep({
        contract: "mobile.admin.charges.applyCharge",
        evidence: "The initial command creates one tenant-scoped charge.",
        expectation: "SUCCESS",
        key: "apply-charge",
        operation: "mutation",
      }),
      apiStep({
        contract: "mobile.admin.charges.applyCharge",
        evidence:
          "An exact retry returns the canonical result without a second charge or ledger effect.",
        expectation: "IDEMPOTENT_REPLAY",
        key: "replay-charge",
        operation: "mutation",
      }),
      androidStep({
        contract: "admin/charges-idempotent-retry",
        evidence:
          "Android shows one successful charge result and one ledger row after retry.",
        expectation: "IDEMPOTENT_REPLAY",
        key: "android-idempotency",
      }),
    ],
  },
] as const satisfies readonly ProductionQaNegativeJourneyDefinition[]

export function assertProductionQaNegativeJourneyDefinitions(
  definitions: readonly ProductionQaNegativeJourneyDefinition[] = PRODUCTION_QA_NEGATIVE_JOURNEYS
) {
  const keys = new Set<string>()
  const categories = new Set<ProductionQaNegativeCategory>()

  for (const definition of definitions) {
    if (keys.has(definition.key)) {
      throw new Error(
        `Duplicate production QA negative journey key: ${definition.key}.`
      )
    }
    keys.add(definition.key)
    if (categories.has(definition.category)) {
      throw new Error(
        `Duplicate production QA negative category: ${definition.category}.`
      )
    }
    categories.add(definition.category)
    if (!definition.steps.some(({ surface }) => surface === "android")) {
      throw new Error(
        `Production QA negative journey ${definition.key} has no Android checkpoint.`
      )
    }
    for (const step of definition.steps) {
      if (
        step.invocation === "suppress" &&
        step.expectation !== "TRANSPORT_SUPPRESSED"
      ) {
        throw new Error(
          `Production QA negative journey ${definition.key} suppressed step must expect TRANSPORT_SUPPRESSED.`
        )
      }
      if (
        step.contract.toLowerCase().includes("mock") ||
        step.contract.toLowerCase().includes("importsession")
      ) {
        throw new Error(
          `Production QA negative journey ${definition.key} references a forbidden test-only contract.`
        )
      }
    }
  }

  const missing = PRODUCTION_QA_NEGATIVE_CATEGORIES.filter(
    (category) => !categories.has(category)
  )
  if (missing.length > 0) {
    throw new Error(
      `Production QA negative journeys are missing categories: ${missing.join(", ")}.`
    )
  }
}

export function createProductionQaNegativeJourneyPlan(
  plan: ProductionQaHarnessPlan
): ProductionQaNegativeJourneyPlanItem[] {
  assertProductionQaNegativeJourneyDefinitions()

  return PRODUCTION_QA_NEGATIVE_JOURNEYS.map((definition) => {
    const scenario = plan.scenarios.find(
      ({ key }) => key === definition.scenarioKey
    )
    if (!scenario) {
      throw new Error(
        `Production QA negative journey ${definition.key} references missing scenario ${definition.scenarioKey}.`
      )
    }
    const identity = scenario.identities.find(
      ({ role }) => role === definition.role
    )
    if (!identity) {
      throw new Error(
        `Production QA negative journey ${definition.key} references missing role ${definition.role}.`
      )
    }

    return {
      ...definition,
      cooperativeNumber: identity.cooperativeNumber,
      email: identity.email,
      tenantSlug: scenario.slug,
    }
  })
}

export function createProductionQaNegativeJourneyCoverageReport(input: {
  generatedAt?: Date
  plan: ProductionQaHarnessPlan
}) {
  const journeys = createProductionQaNegativeJourneyPlan(input.plan)
  const lines = [
    "# Production-contract negative journey coverage",
    "",
    `- Contract: v${PRODUCTION_QA_NEGATIVE_JOURNEY_CONTRACT_VERSION}`,
    `- Harness contract: v${input.plan.contractVersion}`,
    `- Environment: ${input.plan.environment}`,
    `- Run: ${input.plan.runId}`,
    `- Generated: ${(input.generatedAt ?? new Date(input.plan.generatedAt)).toISOString()}`,
    `- Negative journeys: ${journeys.length}`,
    `- Categories: ${new Set(journeys.map(({ category }) => category)).size}/${PRODUCTION_QA_NEGATIVE_CATEGORIES.length}`,
    "",
    "| Journey | Category | Scenario | Role | Invoked API steps | Suppressed API steps | Android checkpoints |",
    "| --- | --- | --- | --- | ---: | ---: | ---: |",
  ]

  for (const journey of journeys) {
    lines.push(
      `| ${journey.key} | ${journey.category} | ${journey.scenarioKey} | ${journey.role} | ${journey.steps.filter(({ invocation, surface }) => surface === "api" && invocation === "invoke").length} | ${journey.steps.filter(({ invocation, surface }) => surface === "api" && invocation === "suppress").length} | ${journey.steps.filter(({ surface }) => surface === "android").length} |`
    )
  }

  lines.push(
    "",
    "This is a negative-journey coverage contract, not execution evidence. Suppressed writes must prove zero transport calls; invoked steps must prove the declared server outcome through an authorized exact-domain session.",
    "",
    "Private identity, account, challenge, tester, session, provider, notification, and command material is omitted."
  )

  return lines.join("\n")
}
