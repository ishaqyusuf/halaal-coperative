export type ChargeLane = "applications" | "levies" | "rules"
export type ChargeStatus = "pending" | "posted" | "reversed" | "waived"
export type ChargeCollectionMode = "deduct_from_savings" | "pay_separately"

export type ChargeCapabilities = {
  correct: boolean
  manage: boolean
  view: boolean
}

export type ChargeFilters = {
  collectionMode?: ChargeCollectionMode | null
  fromDate?: string | null
  memberId?: string | null
  purpose?: string | null
  status?: ChargeStatus | null
  toDate?: string | null
  workflow?: string | null
}

export type ChargeApplicationRow = {
  amount: number
  assessedAt: string
  collectionMode: ChargeCollectionMode
  definitionCode: string
  definitionName: string
  id: string
  isMonthlyLevy: boolean
  memberId: string
  memberName: string
  memberNumber: string
  periodLabel: string
  purpose: string
  status: ChargeStatus
  trigger: string
  workflow: string
}

export type ChargeRuleRow = {
  applicability: {
    collectionMode: ChargeCollectionMode
    id: string
    isActive: boolean
    isRequired: boolean
    trigger: string
    workflow: string
  }[]
  chargeFrequency: string
  chargeValueType: "fixed_amount" | "percentage"
  code: string
  id: string
  isActive: boolean
  isMonthlyLevy: boolean
  name: string
  purpose: string
  versions: {
    amount: number
    chargeValueType: "fixed_amount" | "percentage"
    effectiveFrom: string
    id: string
  }[]
}

export type ChargeWorkspace = {
  cache?: {
    ageMs: number
    cachedAt: string
    scope: string
    status: "live" | "stale"
  }
  capabilities: ChargeCapabilities
  currencyCode: string
  data: (ChargeApplicationRow | ChargeRuleRow)[]
  generatedAt: string
  lane: ChargeLane
  nextCursor: string | null
  stats: {
    corrections: number
    outstanding: number
    postedThisMonth: number
  }
}

export type ChargeApplicationDetail = ChargeApplicationRow & {
  amountBasis: number | null
  audit: {
    action: string
    actorUserId: string | null
    id: string
    metadata: Record<string, unknown> | null
    occurredAt: string
  }[]
  definition: {
    chargeFrequency: string
    chargeValueType: "fixed_amount" | "percentage"
    code: string
    effectiveAmount: number
    isMonthlyLevy: boolean
    name: string
    purpose: string
    versionEffectiveFrom: string | null
    versionId: string | null
  }
  ledger: {
    entries: {
      accountCode: string
      accountName: string
      amount: number
      direction: string
    }[]
    id: string
    postedAt: string
    reference: string | null
  } | null
  notes: string | null
  target: {
    id: string
    label: string
    state: string
    type: string
  } | null
  workspaceState: ChargeStatus
}

export type ChargeFormOptions = {
  definitions: {
    chargeFrequency: string
    chargeValueType: "fixed_amount" | "percentage"
    code: string
    collectionMode: ChargeCollectionMode
    id: string
    isMonthlyLevy: boolean
    name: string
    purpose: string
    rate: number
  }[]
  members: {
    fullName: string
    id: string
    memberNumber: string
    status: string
  }[]
}

export type ChargeCommandBase = {
  commandId: string
  expectedState: string
}

export type ChargeCommandResult = {
  commandId: string
  entityId: string
  replayed: boolean
  state: string
}
