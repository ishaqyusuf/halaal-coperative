export const qaAcceleratorContractVersion = 1 as const

export const qaAcceleratorEnvironments = [
  "local",
  "development",
  "preview",
] as const

export type QaAcceleratorEnvironment =
  | (typeof qaAcceleratorEnvironments)[number]
  | "production"
  | "test"
  | "unknown"

export type QaAcceleratorClientKind = "mobile" | "web"

export type QaAcceleratorCapability =
  | {
      available: true
      contractVersion: typeof qaAcceleratorContractVersion
      environment: (typeof qaAcceleratorEnvironments)[number]
      status: "available"
    }
  | {
      available: false
      contractVersion: typeof qaAcceleratorContractVersion
      environment: QaAcceleratorEnvironment
      status: "unavailable" | "upgrade-required"
    }

export function normalizeQaDomain(value: string) {
  return value.trim().toLowerCase().replace(/^@/, "").replace(/\.$/, "")
}

export function normalizeQaAcceleratorEnvironment(
  value: string | null | undefined
): QaAcceleratorEnvironment {
  const normalized = value?.trim().toLowerCase()
  if (normalized === "dev") return "development"
  if (normalized === "prod") return "production"
  if (
    normalized === "local" ||
    normalized === "development" ||
    normalized === "preview" ||
    normalized === "production" ||
    normalized === "test"
  ) {
    return normalized
  }
  return "unknown"
}

export function resolveQaAcceleratorCapability(input: {
  clientKind: QaAcceleratorClientKind
  contractVersion: number
  enabled: boolean
  environment: QaAcceleratorEnvironment
  hasCredentialSecret: boolean
  permittedClientKinds: readonly QaAcceleratorClientKind[]
}): QaAcceleratorCapability {
  if (
    !input.enabled ||
    !input.hasCredentialSecret ||
    !qaAcceleratorEnvironments.includes(
      input.environment as (typeof qaAcceleratorEnvironments)[number]
    ) ||
    !input.permittedClientKinds.includes(input.clientKind)
  ) {
    return {
      available: false,
      contractVersion: qaAcceleratorContractVersion,
      environment: input.environment,
      status: "unavailable",
    }
  }

  if (input.contractVersion !== qaAcceleratorContractVersion) {
    return {
      available: false,
      contractVersion: qaAcceleratorContractVersion,
      environment: input.environment,
      status: "upgrade-required",
    }
  }

  return {
    available: true,
    contractVersion: qaAcceleratorContractVersion,
    environment:
      input.environment as (typeof qaAcceleratorEnvironments)[number],
    status: "available",
  }
}

export type QaExternalEffect =
  | "email"
  | "sms"
  | "whatsapp"
  | "payment"
  | "subscription"
  | "domain"
  | "hosting"
  | "document"
  | "media"
  | "financial-posting"
  | "destructive"

export function resolveQaExternalEffectPolicy(input: {
  effect: QaExternalEffect
  hasRegisteredTestAdapter?: boolean
  isQaTenant: boolean
  isRoutedQaEmail?: boolean
}) {
  if (!input.isQaTenant) {
    return { allowed: true, reason: "live-tenant-policy" as const }
  }
  if (input.effect === "email" && input.isRoutedQaEmail) {
    return { allowed: true, reason: "routed-qa-email" as const }
  }
  if (input.hasRegisteredTestAdapter) {
    return { allowed: true, reason: "registered-test-adapter" as const }
  }
  return { allowed: false, reason: "qa-effect-blocked" as const }
}

export type QaFormCoverage =
  | { kind: "recipe"; formId: string }
  | { kind: "prerequisite"; formId: string; reason: string }
  | { kind: "excluded"; formId: string; reason: string }

export function assertCompleteQaFormCoverage(input: {
  coverage: readonly QaFormCoverage[]
  formIds: readonly string[]
}) {
  const declarations = new Map<string, number>()
  for (const entry of input.coverage) {
    declarations.set(entry.formId, (declarations.get(entry.formId) ?? 0) + 1)
  }
  const missing = input.formIds.filter((formId) => !declarations.has(formId))
  const duplicates = [...declarations]
    .filter(([, count]) => count > 1)
    .map(([formId]) => formId)
  if (missing.length || duplicates.length) {
    throw new Error(
      `Invalid QA form coverage. Missing: ${missing.join(", ") || "none"}. Duplicates: ${duplicates.join(", ") || "none"}.`
    )
  }
}

export type QaFixtureContext = {
  currencyCode: string
  invocation: number
  qaDomain: string
  seed: string
  timezone: string
}

function stableFixtureNumber(value: string) {
  let hash = 2166136261
  for (const character of value) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function createQaMemberFixture(context: QaFixtureContext) {
  const qaDomain = normalizeQaDomain(context.qaDomain)
  if (!qaDomain) throw new Error("An exact QA Domain is required.")
  const identity = stableFixtureNumber(`${context.seed}:${context.invocation}`)
  const suffix = String(identity % 1_000_000).padStart(6, "0")
  const commitment = String(25_000 + (identity % 4) * 5_000)

  return {
    address: `QA ONLY — ${10 + (identity % 80)} Test Cooperative Road, Kaduna`,
    email: `qa-member-${suffix}@${qaDomain}`,
    fullName: `QA Member ${suffix}`,
    joinedAt: "2026-08-01",
    memberNumber: `QA-${suffix}`,
    memberType: "individual" as const,
    monthlyCommitment: commitment,
    occupation: "QA cooperative tester",
    phoneNumber: `+2340000${suffix}`,
  }
}

export const qaFormInventory = [
  { formId: "marketing.early-access", kind: "recipe" },
  { formId: "marketing.signup", kind: "recipe" },
  { formId: "marketing.onboarding", kind: "recipe" },
  { formId: "cooperative.profile", kind: "recipe" },
  { formId: "member.create", kind: "recipe" },
  { formId: "member.signup-identity", kind: "recipe" },
  { formId: "staff.invite", kind: "recipe" },
  { formId: "contribution.commitment", kind: "recipe" },
  { formId: "contribution.receipt-draft", kind: "recipe" },
  { formId: "shares.request", kind: "recipe" },
  { formId: "charge.definition", kind: "recipe" },
  {
    formId: "charge.application",
    kind: "prerequisite",
    reason: "Requires a current member and charge definition.",
  },
  {
    formId: "financing.request",
    kind: "prerequisite",
    reason: "Requires current product eligibility and capacity.",
  },
  {
    formId: "repayment.draft",
    kind: "prerequisite",
    reason: "Requires an active obligation and schedule row.",
  },
  {
    formId: "procurement.request",
    kind: "prerequisite",
    reason: "Requires current procurement policy eligibility.",
  },
  {
    formId: "food-purchase.request",
    kind: "prerequisite",
    reason: "Requires an open Foodstuff Purchase cycle.",
  },
  {
    formId: "project-financing.request",
    kind: "prerequisite",
    reason: "Requires current project-financing capacity.",
  },
  { formId: "support.case", kind: "recipe" },
  { formId: "support.reply", kind: "recipe" },
  { formId: "notification.draft", kind: "recipe" },
  {
    formId: "auth.password",
    kind: "excluded",
    reason: "Passwords stay manual.",
  },
  {
    formId: "auth.otp",
    kind: "excluded",
    reason: "OTP evidence stays manual.",
  },
  {
    formId: "auth.qa-credential",
    kind: "excluded",
    reason: "Tester credentials stay manual.",
  },
  {
    formId: "member.kyc",
    kind: "excluded",
    reason:
      "Identity, private documents, and compliance decisions are not generated.",
  },
  {
    formId: "finance.approval",
    kind: "excluded",
    reason: "Approval separation stays human and server-owned.",
  },
  {
    formId: "finance.disbursement",
    kind: "excluded",
    reason: "Irreversible financial effects cannot be Quick Filled.",
  },
  {
    formId: "ledger.adjustment",
    kind: "excluded",
    reason: "Append-only ledger corrections require an audited workflow.",
  },
  {
    formId: "subscription.checkout",
    kind: "excluded",
    reason: "External payment effects require a registered test adapter.",
  },
  {
    formId: "domain.operation",
    kind: "excluded",
    reason: "Hosting and DNS effects require a registered test adapter.",
  },
  {
    formId: "destructive.confirmation",
    kind: "excluded",
    reason: "Destructive confirmations stay manual.",
  },
] as const satisfies readonly QaFormCoverage[]
