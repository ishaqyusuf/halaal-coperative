import {
  PRODUCTION_QA_HARNESS_PRODUCT_AREAS,
  type ProductionQaHarnessPlan,
  type ProductionQaHarnessProductArea,
  type ProductionQaHarnessRole,
} from "./production-qa-harness"

export const PRODUCTION_QA_JOURNEY_CONTRACT_VERSION = 1 as const

export const PRODUCTION_QA_JOURNEY_SURFACES = ["api", "android"] as const

export type ProductionQaJourneySurface =
  (typeof PRODUCTION_QA_JOURNEY_SURFACES)[number]

export type ProductionQaJourneyStep = {
  contract: string
  evidence: string
  key: string
  operation: "mutation" | "query" | "visual"
  surface: ProductionQaJourneySurface
}

export type ProductionQaJourneyDefinition = {
  fixturePrerequisites: readonly string[]
  key: string
  productArea: ProductionQaHarnessProductArea
  role: ProductionQaHarnessRole
  scenarioKey: string
  steps: readonly ProductionQaJourneyStep[]
}

export type ProductionQaJourneyPlanItem = ProductionQaJourneyDefinition & {
  cooperativeNumber: string
  email: string
  tenantSlug: string
}

function apiStep(input: {
  contract: string
  evidence: string
  key: string
  operation: "mutation" | "query"
}): ProductionQaJourneyStep {
  return { ...input, surface: "api" }
}

function androidStep(input: {
  contract: string
  evidence: string
  key: string
}): ProductionQaJourneyStep {
  return { ...input, operation: "visual", surface: "android" }
}

export const PRODUCTION_QA_POSITIVE_JOURNEYS = [
  {
    fixturePrerequisites: [
      "authorized_exact_domain_tester",
      "qa_routed_recovery_code",
    ],
    key: "mobile-session-entry",
    productArea: "activation_auth",
    role: "member",
    scenarioKey: "starter-healthy",
    steps: [
      apiStep({
        contract: "auth.mobile.recovery.request",
        evidence:
          "Recovery sends a neutral QA-routed challenge for the exact account.",
        key: "request-recovery",
        operation: "mutation",
      }),
      apiStep({
        contract: "auth.mobile.recovery.complete",
        evidence:
          "The one-time challenge sets a strong password and issues an ordinary session.",
        key: "complete-recovery",
        operation: "mutation",
      }),
      apiStep({
        contract: "auth.mobile.signIn",
        evidence:
          "Cooperative number and the new password enter the same tenant session.",
        key: "password-sign-in",
        operation: "mutation",
      }),
      apiStep({
        contract: "qaAccelerator.authorize",
        evidence: "Exact-domain authorization is short-lived and client-bound.",
        key: "authorize",
        operation: "mutation",
      }),
      apiStep({
        contract: "qaAccelerator.profiles",
        evidence: "Only eligible exact-domain QA profiles are returned.",
        key: "profiles",
        operation: "query",
      }),
      apiStep({
        contract: "qaAccelerator.enterProfile",
        evidence:
          "An opaque selection reference issues an ordinary mobile session.",
        key: "enter-profile",
        operation: "mutation",
      }),
      apiStep({
        contract: "auth.mobile.me",
        evidence:
          "The issued session resolves the selected tenant and membership.",
        key: "read-session",
        operation: "query",
      }),
      androidStep({
        contract: "auth/sign-in-to-member-home",
        evidence:
          "Android shows the confirmed cooperative identity and signed-in home.",
        key: "android-session-entry",
      }),
    ],
  },
  {
    fixturePrerequisites: ["multi_role_identity"],
    key: "workspace-role-switch",
    productArea: "role_switching",
    role: "tenant_admin",
    scenarioKey: "starter-healthy",
    steps: [
      apiStep({
        contract: "auth.mobile.switchRole",
        evidence:
          "Switching replaces the prior session with the selected membership.",
        key: "switch-role",
        operation: "mutation",
      }),
      apiStep({
        contract: "auth.mobile.me",
        evidence:
          "The replacement session reports only the selected active role.",
        key: "confirm-role",
        operation: "query",
      }),
      androidStep({
        contract: "more/workspace-selector",
        evidence:
          "Android changes workspace and returns to the correct role shell.",
        key: "android-role-switch",
      }),
    ],
  },
  {
    fixturePrerequisites: ["sandbox_store_product"],
    key: "subscription-store-offer",
    productArea: "subscription",
    role: "tenant_admin",
    scenarioKey: "starter-healthy",
    steps: [
      apiStep({
        contract: "subscriptions.snapshot",
        evidence:
          "Current plan, limits, entitlements, and invoices are server-owned.",
        key: "read-subscription",
        operation: "query",
      }),
      apiStep({
        contract: "subscriptions.storeCatalog",
        evidence:
          "A configured Google product maps to the target software plan and this QA cooperative.",
        key: "read-store-offer",
        operation: "query",
      }),
      androidStep({
        contract: "admin/plan-and-billing",
        evidence:
          "Android shows the current entitlement and localized native store offer without starting a purchase.",
        key: "android-subscription",
      }),
    ],
  },
  {
    fixturePrerequisites: [],
    key: "member-core-reads",
    productArea: "member_reads",
    role: "member",
    scenarioKey: "starter-healthy",
    steps: [
      apiStep({
        contract: "mobile.member.home",
        evidence: "Member home resolves tenant-scoped readiness and position.",
        key: "home",
        operation: "query",
      }),
      apiStep({
        contract: "mobile.member.commitments",
        evidence: "Commitments use the current server snapshot.",
        key: "commitments",
        operation: "query",
      }),
      apiStep({
        contract: "mobile.member.shares.list",
        evidence: "Share position and applications stay member-scoped.",
        key: "shares",
        operation: "query",
      }),
      apiStep({
        contract: "mobile.member.statement",
        evidence: "Statement activity is tenant- and member-scoped.",
        key: "statement",
        operation: "query",
      }),
      androidStep({
        contract: "member/core-read-screens",
        evidence:
          "Android checkpoints cover home, commitments, shares, and statement.",
        key: "android-member-reads",
      }),
    ],
  },
  {
    fixturePrerequisites: ["request_capacity"],
    key: "member-procurement-request",
    productArea: "requests",
    role: "member",
    scenarioKey: "standard-review",
    steps: [
      apiStep({
        contract: "mobile.member.procurement.list",
        evidence: "The service quote and blockers are read before mutation.",
        key: "read-procurement",
        operation: "query",
      }),
      apiStep({
        contract: "mobile.member.procurement.createRequest",
        evidence:
          "A deterministic submission key creates one tenant-scoped request.",
        key: "create-procurement-request",
        operation: "mutation",
      }),
      apiStep({
        contract: "mobile.member.procurement.requests",
        evidence: "The created request appears once in member history.",
        key: "confirm-procurement-request",
        operation: "query",
      }),
      androidStep({
        contract: "member/procurement-request",
        evidence:
          "Android proves keyboard-safe entry, review, submission, and history.",
        key: "android-request",
      }),
    ],
  },
  {
    fixturePrerequisites: ["receipt_allocation_target"],
    key: "member-payment-receipt",
    productArea: "receipts",
    role: "member",
    scenarioKey: "standard-review",
    steps: [
      apiStep({
        contract: "mobile.member.receipts.create",
        evidence:
          "A payment receipt is persisted through the member operational guard.",
        key: "create-receipt",
        operation: "mutation",
      }),
      apiStep({
        contract: "mobile.member.receipts.list",
        evidence: "The receipt appears once in the member ledger.",
        key: "list-receipts",
        operation: "query",
      }),
      apiStep({
        contract: "mobile.member.receipts.detail",
        evidence: "Detail returns the same allocations and review state.",
        key: "receipt-detail",
        operation: "query",
      }),
      androidStep({
        contract: "member/payment-receipts",
        evidence:
          "Android proves form, review, status, and detail presentation.",
        key: "android-receipts",
      }),
    ],
  },
  {
    fixturePrerequisites: [],
    key: "member-support-conversation",
    productArea: "support",
    role: "member",
    scenarioKey: "standard-review",
    steps: [
      apiStep({
        contract: "mobile.member.support.create",
        evidence:
          "A tenant-scoped support case is created without money mutation.",
        key: "create-support-case",
        operation: "mutation",
      }),
      apiStep({
        contract: "mobile.member.support.reply",
        evidence: "A member reply is appended to the same case.",
        key: "reply-support-case",
        operation: "mutation",
      }),
      apiStep({
        contract: "mobile.member.support.detail",
        evidence: "Case detail contains the persisted conversation.",
        key: "support-detail",
        operation: "query",
      }),
      androidStep({
        contract: "member/support",
        evidence:
          "Android proves case creation, history, reply, and keyboard avoidance.",
        key: "android-support",
      }),
    ],
  },
  {
    fixturePrerequisites: ["pending_receipt"],
    key: "admin-receipt-review",
    productArea: "admin_reviews",
    role: "finance_officer",
    scenarioKey: "standard-review",
    steps: [
      apiStep({
        contract: "mobile.admin.finance.overview",
        evidence: "The pending receipt appears in the authorized admin queue.",
        key: "read-review-queue",
        operation: "query",
      }),
      apiStep({
        contract: "mobile.admin.finance.reviewReceipt",
        evidence: "Expected state and command id govern the review transition.",
        key: "review-receipt",
        operation: "mutation",
      }),
      androidStep({
        contract: "admin/finance-review",
        evidence:
          "Android proves queue, detail, review evidence, and final status.",
        key: "android-admin-review",
      }),
    ],
  },
  {
    fixturePrerequisites: ["active_contribution_plan"],
    key: "admin-contribution-posting",
    productArea: "contributions",
    role: "finance_officer",
    scenarioKey: "starter-healthy",
    steps: [
      apiStep({
        contract: "mobile.admin.contributions.workspace",
        evidence:
          "The authorized contribution workspace exposes the target member.",
        key: "read-contributions",
        operation: "query",
      }),
      apiStep({
        contract: "mobile.admin.contributions.recordPayment",
        evidence:
          "Expected state and command id post one balanced contribution.",
        key: "record-contribution",
        operation: "mutation",
      }),
      androidStep({
        contract: "admin/contributions",
        evidence:
          "Android proves member selection, review, posting, and ledger result.",
        key: "android-contributions",
      }),
    ],
  },
  {
    fixturePrerequisites: ["active_charge_definition"],
    key: "admin-charge-application",
    productArea: "charges",
    role: "finance_officer",
    scenarioKey: "starter-healthy",
    steps: [
      apiStep({
        contract: "mobile.admin.charges.workspace",
        evidence: "The authorized charge ledger and form options are current.",
        key: "read-charges",
        operation: "query",
      }),
      apiStep({
        contract: "mobile.admin.charges.applyCharge",
        evidence:
          "Expected amount, expected state, and command id create one charge.",
        key: "apply-charge",
        operation: "mutation",
      }),
      androidStep({
        contract: "admin/charges",
        evidence: "Android proves selection, review, application, and detail.",
        key: "android-charges",
      }),
    ],
  },
  {
    fixturePrerequisites: ["submitted_financing_request"],
    key: "financing-review-and-disbursement",
    productArea: "financing_execution",
    role: "finance_officer",
    scenarioKey: "growth-overdue",
    steps: [
      apiStep({
        contract: "mobile.admin.financingOperations.workspace",
        evidence:
          "The financing queue exposes current capacity and request state.",
        key: "read-financing-queue",
        operation: "query",
      }),
      apiStep({
        contract: "mobile.admin.finance.reviewFinancingRequest",
        evidence:
          "Distinct authorized reviewers satisfy the dual-approval policy.",
        key: "review-financing",
        operation: "mutation",
      }),
      apiStep({
        contract: "mobile.admin.financingOperations.disburse",
        evidence:
          "Disbursement uses expected state and produces the repayment schedule.",
        key: "disburse-financing",
        operation: "mutation",
      }),
      androidStep({
        contract: "admin/financing-operations",
        evidence:
          "Android proves queue, approval evidence, disbursement, and schedule.",
        key: "android-financing",
      }),
    ],
  },
  {
    fixturePrerequisites: ["submitted_procurement_request"],
    key: "procurement-fulfillment",
    productArea: "service_fulfillment",
    role: "finance_officer",
    scenarioKey: "standard-review",
    steps: [
      apiStep({
        contract: "mobile.admin.procurementOperations.review",
        evidence: "The request is reviewed with expected-state evidence.",
        key: "review-procurement",
        operation: "mutation",
      }),
      apiStep({
        contract: "mobile.admin.procurementOperations.activate",
        evidence:
          "Purchase activation records dates, reference, and repayment schedule.",
        key: "activate-procurement",
        operation: "mutation",
      }),
      apiStep({
        contract: "mobile.admin.procurementOperations.detail",
        evidence:
          "The fulfilled request returns its purchase and repayment facts.",
        key: "procurement-detail",
        operation: "query",
      }),
      androidStep({
        contract: "admin/procurement-operations",
        evidence:
          "Android proves review, calendar selection, activation, and detail.",
        key: "android-procurement-fulfillment",
      }),
    ],
  },
  {
    fixturePrerequisites: ["open_food_purchase_cycle"],
    key: "food-purchase-fulfillment",
    productArea: "service_fulfillment",
    role: "operations_officer",
    scenarioKey: "standard-review",
    steps: [
      apiStep({
        contract: "mobile.admin.foodPurchaseOperations.reviewApplication",
        evidence:
          "The application is reviewed through the authorized workflow.",
        key: "review-food-purchase",
        operation: "mutation",
      }),
      apiStep({
        contract: "mobile.admin.foodPurchaseOperations.workspace",
        evidence:
          "The application and cycle states are visible in the operations queue.",
        key: "food-purchase-workspace",
        operation: "query",
      }),
      androidStep({
        contract: "admin/food-purchase-operations",
        evidence:
          "Android proves cycle, application review, accounting, and completion surfaces.",
        key: "android-food-purchase-fulfillment",
      }),
    ],
  },
  {
    fixturePrerequisites: ["submitted_project_financing_request"],
    key: "project-financing-fulfillment",
    productArea: "service_fulfillment",
    role: "finance_officer",
    scenarioKey: "standard-review",
    steps: [
      apiStep({
        contract: "mobile.admin.projectFinancingOperations.review",
        evidence:
          "The proposal is reviewed with an approved structure and evidence.",
        key: "review-project-financing",
        operation: "mutation",
      }),
      apiStep({
        contract: "mobile.admin.projectFinancingOperations.activate",
        evidence: "The approved proposal enters its active execution state.",
        key: "activate-project-financing",
        operation: "mutation",
      }),
      apiStep({
        contract: "mobile.admin.projectFinancingOperations.recordDisbursement",
        evidence: "A governed disbursement is recorded once.",
        key: "record-project-disbursement",
        operation: "mutation",
      }),
      androidStep({
        contract: "admin/project-financing-operations",
        evidence:
          "Android proves review, activation, disbursement, and detail.",
        key: "android-project-financing-fulfillment",
      }),
    ],
  },
  {
    fixturePrerequisites: ["reportable_activity"],
    key: "admin-report-generation",
    productArea: "reports",
    role: "tenant_admin",
    scenarioKey: "enterprise-profit",
    steps: [
      apiStep({
        contract: "mobile.admin.reports.overview",
        evidence: "The report catalog reflects current plan entitlements.",
        key: "reports-overview",
        operation: "query",
      }),
      apiStep({
        contract: "mobile.admin.reports.generate",
        evidence:
          "A bounded export is generated and audited with an expiring artifact.",
        key: "generate-report",
        operation: "mutation",
      }),
      apiStep({
        contract: "mobile.admin.reports.activity",
        evidence:
          "The report-generation audit is visible to the authorized role.",
        key: "report-activity",
        operation: "query",
      }),
      androidStep({
        contract: "admin/reports",
        evidence:
          "Android proves catalog, generation, native share, and audit activity.",
        key: "android-reports",
      }),
    ],
  },
  {
    fixturePrerequisites: ["durable_mobile_device_session"],
    key: "push-and-governed-deep-link",
    productArea: "push_deep_links",
    role: "member",
    scenarioKey: "starter-healthy",
    steps: [
      apiStep({
        contract: "mobile.notifications.registerPush",
        evidence:
          "A QA provider token is bound to the current durable device session.",
        key: "register-push",
        operation: "mutation",
      }),
      apiStep({
        contract: "mobile.notifications.overview",
        evidence:
          "Notification center returns only tenant- and recipient-scoped records.",
        key: "notifications-overview",
        operation: "query",
      }),
      androidStep({
        contract: "notifications/governed-destination",
        evidence:
          "Android opens only a registered exact-record destination and rejects malformed links.",
        key: "android-deep-link",
      }),
    ],
  },
  {
    fixturePrerequisites: ["second_durable_mobile_device_session"],
    key: "device-session-revocation",
    productArea: "revocation",
    role: "member",
    scenarioKey: "starter-healthy",
    steps: [
      apiStep({
        contract: "mobile.sessions.list",
        evidence: "The member sees only their tenant-scoped device sessions.",
        key: "list-sessions",
        operation: "query",
      }),
      apiStep({
        contract: "mobile.sessions.revoke",
        evidence: "The selected session is revoked by exact record id.",
        key: "revoke-session",
        operation: "mutation",
      }),
      apiStep({
        contract: "auth.mobile.me",
        evidence:
          "The revoked token is rejected on its next authenticated request.",
        key: "confirm-revocation",
        operation: "query",
      }),
      androidStep({
        contract: "more/device-access",
        evidence:
          "Android shows revocation, session loss, and return to the auth gate.",
        key: "android-revocation",
      }),
    ],
  },
  {
    fixturePrerequisites: ["published_profit"],
    key: "share-profit-governance-read",
    productArea: "shares_profit",
    role: "tenant_admin",
    scenarioKey: "enterprise-profit",
    steps: [
      apiStep({
        contract: "mobile.admin.shareProfitGovernance.workspace",
        evidence:
          "The governance ledger exposes published tenant-scoped profit records.",
        key: "share-profit-workspace",
        operation: "query",
      }),
      apiStep({
        contract: "mobile.admin.shareProfitGovernance.profitDetail",
        evidence: "Published allocations reconcile to the selected period.",
        key: "profit-detail",
        operation: "query",
      }),
      androidStep({
        contract: "admin/share-profit-governance",
        evidence:
          "Android proves published profit summary, allocation detail, and audit state.",
        key: "android-share-profit",
      }),
    ],
  },
] as const satisfies readonly ProductionQaJourneyDefinition[]

export function assertProductionQaPositiveJourneyDefinitions(
  definitions: readonly ProductionQaJourneyDefinition[] = PRODUCTION_QA_POSITIVE_JOURNEYS
) {
  const keys = new Set<string>()
  const stepKeys = new Set<string>()

  for (const definition of definitions) {
    if (keys.has(definition.key)) {
      throw new Error(`Duplicate production QA journey key: ${definition.key}.`)
    }
    keys.add(definition.key)
    if (definition.steps.length === 0) {
      throw new Error(`Production QA journey ${definition.key} has no steps.`)
    }
    if (!definition.steps.some(({ surface }) => surface === "android")) {
      throw new Error(
        `Production QA journey ${definition.key} has no Android checkpoint.`
      )
    }
    for (const step of definition.steps) {
      const compositeKey = `${definition.key}:${step.key}`
      if (stepKeys.has(compositeKey)) {
        throw new Error(
          `Duplicate production QA journey step: ${compositeKey}.`
        )
      }
      stepKeys.add(compositeKey)
      if (
        step.contract.toLowerCase().includes("mock") ||
        step.contract.toLowerCase().includes("importsession")
      ) {
        throw new Error(
          `Production QA journey ${definition.key} references a forbidden test-only contract.`
        )
      }
    }
  }

  const covered = new Set(definitions.map(({ productArea }) => productArea))
  const missing = PRODUCTION_QA_HARNESS_PRODUCT_AREAS.filter(
    (productArea) => !covered.has(productArea)
  )
  if (missing.length > 0) {
    throw new Error(
      `Production QA journeys are missing product areas: ${missing.join(", ")}.`
    )
  }
}

export function createProductionQaPositiveJourneyPlan(
  plan: ProductionQaHarnessPlan
): ProductionQaJourneyPlanItem[] {
  assertProductionQaPositiveJourneyDefinitions()

  return PRODUCTION_QA_POSITIVE_JOURNEYS.map((definition) => {
    const scenario = plan.scenarios.find(
      ({ key }) => key === definition.scenarioKey
    )
    if (!scenario) {
      throw new Error(
        `Production QA journey ${definition.key} references missing scenario ${definition.scenarioKey}.`
      )
    }
    if (!scenario.productAreas.includes(definition.productArea)) {
      throw new Error(
        `Production QA journey ${definition.key} is not assigned to ${definition.productArea} in scenario ${definition.scenarioKey}.`
      )
    }
    const identity = scenario.identities.find(
      ({ role }) => role === definition.role
    )
    if (!identity) {
      throw new Error(
        `Production QA journey ${definition.key} references missing role ${definition.role}.`
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

export function createProductionQaJourneyCoverageReport(input: {
  generatedAt?: Date
  plan: ProductionQaHarnessPlan
}) {
  const journeys = createProductionQaPositiveJourneyPlan(input.plan)
  const lines = [
    "# Production-contract positive journey coverage",
    "",
    `- Contract: v${PRODUCTION_QA_JOURNEY_CONTRACT_VERSION}`,
    `- Harness contract: v${input.plan.contractVersion}`,
    `- Environment: ${input.plan.environment}`,
    `- QA Domain: ${input.plan.qaDomain}`,
    `- Run: ${input.plan.runId}`,
    `- Generated: ${(input.generatedAt ?? new Date(input.plan.generatedAt)).toISOString()}`,
    `- Journeys: ${journeys.length}`,
    `- Product areas: ${new Set(journeys.map(({ productArea }) => productArea)).size}/${PRODUCTION_QA_HARNESS_PRODUCT_AREAS.length}`,
    "",
    "## Journey matrix",
    "",
    "| Journey | Area | Scenario | Role | API steps | Android checkpoints | Prerequisites |",
    "| --- | --- | --- | --- | ---: | ---: | --- |",
  ]

  for (const journey of journeys) {
    lines.push(
      `| ${journey.key} | ${journey.productArea} | ${journey.scenarioKey} | ${journey.role} | ${journey.steps.filter(({ surface }) => surface === "api").length} | ${journey.steps.filter(({ surface }) => surface === "android").length} | ${journey.fixturePrerequisites.join(", ") || "none"} |`
    )
  }

  lines.push(
    "",
    "This is a coverage contract, not execution evidence. A journey passes only after every API step runs through an authorized exact-domain session and every Android checkpoint is captured.",
    "",
    "No password, OTP, tester credential, authorization token, session token, provider token, or mutable command input is included in this report."
  )

  return lines.join("\n")
}
