export type RepaymentLane = "collections" | "due" | "posted"

export type RepaymentCapabilities = {
  followUp: boolean
  post: boolean
  view: boolean
}

export type RepaymentWorkspaceItem = {
  agingDays: number
  amount: number
  dueAt: string
  id: string
  installmentNumber: number | null
  lane: RepaymentLane
  latestFollowUp: {
    nextActionAt: string | null
    priority: string
    status: string
  } | null
  loan: {
    id: string
    outstandingPrincipal: number
    productName: string
    status: string
  }
  member: { id: string; name: string; number: string }
  reference: string | null
  state: string
}

export type RepaymentWorkspace = {
  cache?: {
    ageMs: number
    cachedAt: string
    scope: string
    status: "live" | "stale"
  }
  capabilities: RepaymentCapabilities
  currencyCode: string
  generatedAt: string
  items: RepaymentWorkspaceItem[]
  nextCursor?: string | null
  lane: RepaymentLane
  summary: {
    activeFacilities: number
    dueThisMonth: number
    outstanding: number
    overdue: number
    paidPrincipal: number
    principal: number
  }
}

export type RepaymentFacility = {
  collectionFollowUps: {
    actorName: string
    assignedToName: string | null
    caseStage: string
    createdAt: string
    id: string
    installmentNumber: number
    nextActionAt: string | null
    note: string
    priority: string
    promiseToPayAt: string | null
    resolutionStatus: string
    status: string
  }[]
  id: string
  member: { id: string; name: string; number: string }
  nextDue: {
    agingDays: number
    amountPaid: number
    dueAt: string
    id: string
    installmentNumber: number
    outstandingAmount: number
    state: string
    totalDue: number
  } | null
  outstandingPrincipal: number
  paidPrincipal: number
  principalAmount: number
  productName: string
  repayments: {
    amount: number
    id: string
    paidAt: string
    receivedByName: string
    reference: string | null
    status: string
  }[]
  schedule: {
    agingDays: number
    amountPaid: number
    dueAt: string
    id: string
    installmentNumber: number
    outstandingAmount: number
    state: string
    totalDue: number
  }[]
  state: string
  termMonths: number
  updatedAt: string
}

export type RepaymentCommandResult = {
  commandId: string
  entityId: string
  replayed: boolean
  state: string
}
