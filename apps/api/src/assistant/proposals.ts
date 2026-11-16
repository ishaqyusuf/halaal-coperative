import {
  type AssistantActionResult,
  type AssistantAnswer,
  type AssistantProposal,
  type AssistantProposalFields,
  type IntentCandidates,
  formatMoney,
  money,
  paymentRequestOptions,
  proposalFieldsSchema,
} from "@halaalvest/assistant"
import { roleCan } from "@halaalvest/auth"
import {
  type AssistantProposalRow,
  assertMemberOperationalReadiness,
  claimAssistantProposalConfirmation,
  createAssistantProposal,
  createMemberPaymentReceipt,
  createMemberSupportCase,
  findAssistantMember,
  getTenantOperationProfile,
  readAssistantPaymentTargets,
  readAssistantProposal,
  recordMemberPayment,
  resolveMemberPaymentAllocation,
  reviseAssistantProposal,
  saveAssistantProposalResult,
  searchAssistantMembers,
  setAssistantProposalStatus,
} from "@halaalvest/db"
import type { AssistantPrincipal } from "./principal"
import { denied, unavailable } from "./reads"
import { receiptProofUrl } from "./uploads"

/**
 * Exact-draft writes: collect → review → confirm exact revision → saved
 * result. Server-owned amounts, dates, periods and allocation targets; every
 * confirm rechecks authority, service and readiness, and claims the reviewed
 * revision once. Nothing posts on submission of a member receipt.
 */

const DRAFT_TTL_MS = 30 * 60 * 1000

export type ProposalDependencies = {
  now: () => Date
  operationProfile: typeof getTenantOperationProfile
  findMember: typeof findAssistantMember
  assertReadiness: typeof assertMemberOperationalReadiness
  paymentTargets: typeof readAssistantPaymentTargets
  searchMembers: typeof searchAssistantMembers
  createReceipt: typeof createMemberPaymentReceipt
  createSupportCase: typeof createMemberSupportCase
  recordPayment: typeof recordMemberPayment
}

export const defaultProposalDependencies: ProposalDependencies = {
  now: () => new Date(),
  operationProfile: getTenantOperationProfile,
  findMember: findAssistantMember,
  assertReadiness: assertMemberOperationalReadiness,
  paymentTargets: readAssistantPaymentTargets,
  searchMembers: searchAssistantMembers,
  createReceipt: createMemberPaymentReceipt,
  createSupportCase: createMemberSupportCase,
  recordPayment: recordMemberPayment,
}

const scopeOf = (principal: AssistantPrincipal) => ({
  tenantId: principal.tenantId,
  userId: principal.userId,
  membershipId: principal.membershipId,
})

/** Africa/Lagos calendar date, YYYY-MM-DD. */
/** A stated payment date if it is a real past or current day, else today (Lagos). */
function paidOnOrToday(paidOn: string | null | undefined, now: Date) {
  const today = lagosToday(now)
  if (!paidOn || !/^\d{4}-\d{2}-\d{2}$/.test(paidOn) || paidOn > today) return today
  return Number.isNaN(Date.parse(`${paidOn}T00:00:00Z`)) ? today : paidOn
}

export function lagosToday(now: Date) {
  return new Date(now.getTime() + 60 * 60 * 1000).toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

function missingFor(fields: AssistantProposalFields): string[] {
  switch (fields.kind) {
    case "receipt-submission":
      return [
        ...(fields.amount ? [] : ["amount"]),
        ...(fields.paidOn ? [] : ["payment date"]),
      ]
    case "payment-request":
      return fields.purpose ? [] : ["what you need"]
    case "record-payment":
      return [
        ...(fields.member ? [] : ["member"]),
        ...(fields.amount ? [] : ["amount"]),
        ...(fields.paidOn ? [] : ["payment date"]),
        ...(fields.period ? [] : ["month"]),
      ]
  }
}

function effectFor(fields: AssistantProposalFields) {
  switch (fields.kind) {
    case "receipt-submission":
      return "Saves a receipt for review. No money is posted until staff approve it."
    case "payment-request":
      return "Opens a tracked support case for finance review. No money is paid out from chat."
    case "record-payment":
      return "Posts this payment to the member's account once, using their allocation rules."
  }
}

export function toProposalDto(row: AssistantProposalRow): AssistantProposal {
  const fields = proposalFieldsSchema.parse(row.fields)
  return {
    id: row.id,
    capabilityId: row.capabilityId,
    revision: row.revision,
    status: row.status,
    fields,
    missing: missingFor(fields),
    effect: effectFor(fields),
    expiresAt: row.expiresAt.toISOString(),
    confirmInApp: fields.kind === "record-payment",
  }
}

// ---------------------------------------------------------------------------
// Allocation (server-selected targets)
// ---------------------------------------------------------------------------

type Allocation = { targetId: string; label: string; amount: ReturnType<typeof money> }

/** Member receipt: commitment first, then the next instalment, then special savings. */
async function memberReceiptAllocations(
  principal: AssistantPrincipal,
  memberId: string,
  amount: number,
  deps: ProposalDependencies
): Promise<Allocation[]> {
  const { plan, loan } = await deps.paymentTargets({
    tenantId: principal.tenantId,
    memberId,
  })
  let left = amount
  const out: Allocation[] = []
  const take = (value: number) => {
    const used = Math.min(left, Math.max(0, value))
    left = Math.round((left - used) * 100) / 100
    return used
  }
  if (plan) {
    const used = take(Number(plan.amount))
    if (used > 0) out.push({ targetId: `commitment:${plan.id}`, label: "Monthly savings", amount: money(used) })
  }
  const next = loan?.repaymentScheduleItems[0]
  if (loan && next) {
    const used = take(Number(next.totalDue) - Number(next.amountPaid))
    if (used > 0)
      out.push({
        targetId: `loan_servicing:${loan.id}`,
        label: `${loan.loanProduct?.name ?? "Financing"} instalment`,
        amount: money(used),
      })
  }
  if (left > 0) out.push({ targetId: "special_savings", label: "Special savings", amount: money(left) })
  return out
}

function receiptAllocationInputs(allocations: Allocation[]) {
  return allocations.map((allocation) => {
    const [category, id] = allocation.targetId.split(":")
    const amount = Number(allocation.amount.amount)
    if (category === "commitment") return { amount, category: "commitment" as const, contributionPlanId: id }
    if (category === "loan_servicing") return { amount, category: "loan_servicing" as const, loanId: id }
    return { amount, category: "special_savings" as const }
  })
}

/** Staff posting preview through the canonical allocation resolver. */
async function staffPaymentPlan(
  principal: AssistantPrincipal,
  memberId: string,
  amount: number,
  deps: ProposalDependencies
) {
  const { member, plan, loan } = await deps.paymentTargets({
    tenantId: principal.tenantId,
    memberId,
  })
  if (!member) return null
  const next = loan?.repaymentScheduleItems[0]
  const committed = Math.min(amount, Number(plan?.amount ?? 0))
  const scheduled = loan && next
    ? Math.min(amount - committed, Math.max(0, Number(next.totalDue) - Number(next.amountPaid)))
    : 0
  const resolved = resolveMemberPaymentAllocation({
    committedSavingsAmount: committed,
    scheduledLoanServicingAmount: scheduled,
    hasLoanTarget: Boolean(loan),
    paymentAllocationPreference: member.paymentAllocationPreference,
    totalAmount: amount,
  })
  const allocations: Allocation[] = []
  if (resolved.committedSavingsAmount > 0)
    allocations.push({ targetId: `commitment:${plan?.id ?? ""}`, label: "Monthly savings", amount: money(resolved.committedSavingsAmount) })
  if (resolved.extraSavingsAmount > 0)
    allocations.push({ targetId: "extra_savings", label: "Extra savings", amount: money(resolved.extraSavingsAmount) })
  if (resolved.scheduledLoanServicingAmount > 0)
    allocations.push({ targetId: `loan_servicing:${loan?.id ?? ""}`, label: `${loan?.loanProduct?.name ?? "Financing"} instalment`, amount: money(resolved.scheduledLoanServicingAmount) })
  if (resolved.extraLoanPaymentAmount > 0)
    allocations.push({ targetId: `loan_extra:${loan?.id ?? ""}`, label: "Extra financing payment", amount: money(resolved.extraLoanPaymentAmount) })
  return { member, plan, loan, resolved, allocations }
}

// ---------------------------------------------------------------------------
// Start (from a chat turn)
// ---------------------------------------------------------------------------

export type ProposalStart =
  | { kind: "proposal"; proposal: AssistantProposal; text: string }
  | { kind: "answer"; answer: AssistantAnswer; text: string }

const reply = (answer: AssistantAnswer, text: string): ProposalStart => ({ kind: "answer", answer, text })

async function memberGate(
  principal: AssistantPrincipal,
  permission: "submit_receipts" | "view_own_member_profile",
  deps: ProposalDependencies
) {
  if (principal.role !== "member" || !roleCan(principal.role, permission)) return { error: denied() }
  const member = await deps.findMember({ tenantId: principal.tenantId, userId: principal.userId })
  if (!member) return { error: unavailable("Your account is not linked to a member profile yet.") }
  try {
    await deps.assertReadiness({ memberId: member.id, tenantId: principal.tenantId })
  } catch {
    return {
      error: unavailable(
        "Member verification is required before you can submit requests. Open your profile to finish it.",
        { label: "Open profile", href: "/settings/profile" }
      ),
    }
  }
  return { member }
}

export async function startReceiptSubmission(
  principal: AssistantPrincipal,
  conversationId: string,
  candidates: IntentCandidates,
  deps = defaultProposalDependencies
): Promise<ProposalStart> {
  const gate = await memberGate(principal, "submit_receipts", deps)
  if ("error" in gate) return reply(gate.error!, "I can't start a receipt here.")
  const profile = await deps.operationProfile(principal.tenantId)
  if (!profile.services.payment_receipts.canMemberCreate)
    return reply(
      unavailable("Your cooperative takes receipts at the office, not online."),
      "Receipt submission is not open online for your cooperative."
    )
  const amount = candidates.amount ? Number(candidates.amount) : null
  const fields: AssistantProposalFields = {
    kind: "receipt-submission",
    amount: amount ? money(amount) : null,
    paidOn: paidOnOrToday(candidates.paidOn, deps.now()),
    paymentReference: candidates.paymentReference ?? null,
    allocations: amount ? await memberReceiptAllocations(principal, gate.member!.id, amount, deps) : [],
    evidenceUploadId: null,
  }
  const row = await createAssistantProposal({
    ...scopeOf(principal),
    conversationId,
    capabilityId: "M04",
    kind: fields.kind,
    status: missingFor(fields).length ? "collecting" : "review",
    fields,
    expiresAt: new Date(deps.now().getTime() + DRAFT_TTL_MS),
  })
  const proposal = toProposalDto(row)
  return {
    kind: "proposal",
    proposal,
    text: proposal.missing.length
      ? `How much did you pay? I'll prepare the receipt for review.`
      : `Check this receipt of ${formatMoney(fields.amount!)} and confirm to save it for review.`,
  }
}

export async function startPaymentRequest(
  principal: AssistantPrincipal,
  conversationId: string,
  candidates: IntentCandidates,
  deps = defaultProposalDependencies
): Promise<ProposalStart> {
  if (principal.role !== "member") return reply(denied(), "That request is for members.")
  const fields: AssistantProposalFields = {
    kind: "payment-request",
    purpose: null,
    amount: candidates.amount ? money(candidates.amount) : null,
    note: null,
  }
  const row = await createAssistantProposal({
    ...scopeOf(principal),
    conversationId,
    capabilityId: "M05",
    kind: fields.kind,
    status: "collecting",
    fields,
    expiresAt: new Date(deps.now().getTime() + DRAFT_TTL_MS),
  })
  return {
    kind: "answer",
    answer: {
      kind: "clarify",
      question: "Which do you mean?",
      options: paymentRequestOptions.map((option) => ({
        label: option.label,
        value: `purpose:${row.id}:${option.value}`,
      })),
    },
    text: "I can help with a few kinds of money request. Which do you mean?",
  }
}

export async function choosePaymentRequestPurpose(
  principal: AssistantPrincipal,
  proposalId: string,
  purpose: string,
  deps = defaultProposalDependencies
): Promise<ProposalStart> {
  const row = await readAssistantProposal({ ...scopeOf(principal), proposalId })
  if (!row || row.kind !== "payment-request" || !["collecting", "review"].includes(row.status))
    return reply(unavailable("That request is no longer open. Start again."), "That request has closed.")
  if (purpose === "financing") {
    await setAssistantProposalStatus({ ...scopeOf(principal), proposalId, from: ["collecting", "review"], to: "cancelled" })
    return reply(
      { kind: "notice", tone: "info", message: "Financing applications use the financing form, where your fees and terms are checked.", link: { label: "Apply for financing", href: "/loans" } },
      "Financing goes through the financing form."
    )
  }
  if (purpose === "pay_in") {
    await setAssistantProposalStatus({ ...scopeOf(principal), proposalId, from: ["collecting", "review"], to: "cancelled" })
    return reply(
      { kind: "notice", tone: "info", message: "After you pay, send me the amount (for example “I paid ₦25,000”) and I'll prepare the receipt.", link: { label: "Open receipts", href: "/payment-receipts" } },
      "To pay the cooperative, pay as usual and then send me your receipt."
    )
  }
  if (purpose !== "special_savings_refund" && purpose !== "money_owed")
    return reply(unavailable("I didn't recognise that choice."), "Please pick one of the options.")
  const gate = await memberGate(principal, "view_own_member_profile", deps)
  if ("error" in gate) return reply(gate.error!, "I can't open that request here.")
  const profile = await deps.operationProfile(principal.tenantId)
  if (!profile.services.support_cases.canMemberCreate)
    return reply(unavailable("Online support requests are not open for your cooperative."), "Support requests aren't open online.")
  const current = proposalFieldsSchema.parse(row.fields)
  if (current.kind !== "payment-request") throw new Error("unreachable")
  const fields: AssistantProposalFields = { ...current, purpose }
  await reviseAssistantProposal({
    ...scopeOf(principal),
    proposalId,
    expectedRevision: row.revision,
    fields,
    status: "review",
    expiresAt: new Date(deps.now().getTime() + DRAFT_TTL_MS),
  })
  const fresh = await readAssistantProposal({ ...scopeOf(principal), proposalId })
  return {
    kind: "proposal",
    proposal: toProposalDto(fresh!),
    text:
      purpose === "special_savings_refund"
        ? "Check the refund request and confirm. Finance reviews it; nothing is paid from chat."
        : "Check the request and confirm. Staff will follow it up as a support case.",
  }
}

export async function startRecordPayment(
  principal: AssistantPrincipal,
  conversationId: string,
  candidates: IntentCandidates,
  deps = defaultProposalDependencies
): Promise<ProposalStart> {
  if (principal.role === "member" || !roleCan(principal.role, "manage_member_contributions"))
    return reply(denied(), "Recording payments needs staff access.")
  const query = candidates.memberNumber ?? candidates.memberQuery
  let member: { id: string; memberNumber: string; fullName: string } | null = null
  let matches: Awaited<ReturnType<typeof searchAssistantMembers>>["items"] = []
  if (query) {
    const found = await deps.searchMembers({ tenantId: principal.tenantId, query, limit: 5 })
    matches = found.items
    member =
      found.items.find((item) => item.memberNumber.toUpperCase() === query.toUpperCase()) ??
      (found.items.length === 1 ? found.items[0]! : null)
  }
  const amount = candidates.amount ? Number(candidates.amount) : null
  const planned = member && amount ? await staffPaymentPlan(principal, member.id, amount, deps).catch(() => null) : null
  const fields: AssistantProposalFields = {
    kind: "record-payment",
    member: member ? { memberId: member.id, memberNumber: member.memberNumber, name: member.fullName } : null,
    amount: amount ? money(amount) : null,
    paidOn: paidOnOrToday(candidates.paidOn, deps.now()),
    period: candidates.period,
    channel: "transfer",
    paymentReference: candidates.paymentReference ?? null,
    allocations: planned?.allocations ?? [],
  }
  const row = await createAssistantProposal({
    ...scopeOf(principal),
    conversationId,
    capabilityId: "S04",
    kind: fields.kind,
    status: missingFor(fields).length ? "collecting" : "review",
    fields,
    expiresAt: new Date(deps.now().getTime() + DRAFT_TTL_MS),
  })
  if (!member && matches.length > 1)
    return {
      kind: "answer",
      answer: {
        kind: "clarify",
        question: "Which member?",
        options: matches.slice(0, 5).map((item) => ({
          label: `${item.fullName} · ${item.memberNumber}`,
          value: `member:${row.id}:${item.id}`,
        })),
      },
      text: "More than one member matches. Choose the right one.",
    }
  const proposal = toProposalDto(row)
  return {
    kind: "proposal",
    proposal,
    text: proposal.missing.length
      ? `I still need: ${proposal.missing.join(", ")}.`
      : `Review this payment for ${fields.member!.name}. Confirming posts it once.`,
  }
}

export async function chooseRecordPaymentMember(
  principal: AssistantPrincipal,
  proposalId: string,
  memberId: string,
  deps = defaultProposalDependencies
): Promise<ProposalStart> {
  const row = await readAssistantProposal({ ...scopeOf(principal), proposalId })
  if (!row || row.kind !== "record-payment" || !["collecting", "review"].includes(row.status))
    return reply(unavailable("That payment draft is no longer open."), "That draft has closed.")
  const current = proposalFieldsSchema.parse(row.fields)
  if (current.kind !== "record-payment") throw new Error("unreachable")
  return editProposal(principal, { proposalId, revision: row.revision, fields: { ...current, member: { memberId, memberNumber: "", name: "" } } }, deps).then(
    (proposal) => ({ kind: "proposal" as const, proposal, text: proposal.missing.length ? `I still need: ${proposal.missing.join(", ")}.` : "Review this payment. Confirming posts it once." })
  )
}

// ---------------------------------------------------------------------------
// Edit / cancel / confirm
// ---------------------------------------------------------------------------

/**
 * Receipt proof comes only from the signed-in app's private upload (web or
 * native). Messaging channels keep whatever proof the draft already has.
 */
function evidenceFor(
  principal: AssistantPrincipal,
  requested: Extract<AssistantProposalFields, { kind: "receipt-submission" }>,
  current: AssistantProposalFields
) {
  const kept = current.kind === "receipt-submission"
    ? { evidenceUploadId: current.evidenceUploadId, evidenceName: current.evidenceName ?? null }
    : { evidenceUploadId: null, evidenceName: null }
  if (principal.channel !== "web" && principal.channel !== "native") return kept
  if (!requested.evidenceUploadId) return { evidenceUploadId: null, evidenceName: null }
  if (!receiptProofUrl(requested.evidenceUploadId))
    throw new ProposalError("BAD_REQUEST", "That proof upload isn't valid. Upload it again.")
  return {
    evidenceUploadId: requested.evidenceUploadId,
    evidenceName: requested.evidenceName?.trim().slice(0, 160) || "Payment proof",
  }
}

export async function editProposal(
  principal: AssistantPrincipal,
  input: { proposalId: string; revision: number; fields: AssistantProposalFields },
  deps = defaultProposalDependencies
): Promise<AssistantProposal> {
  const row = await readAssistantProposal({ ...scopeOf(principal), proposalId: input.proposalId })
  if (!row) throw new ProposalError("NOT_FOUND", "Draft not found.")
  const current = proposalFieldsSchema.parse(row.fields)
  if (current.kind !== input.fields.kind) throw new ProposalError("BAD_REQUEST", "Draft type cannot change.")
  let next: AssistantProposalFields
  switch (input.fields.kind) {
    case "receipt-submission": {
      const gate = await memberGate(principal, "submit_receipts", deps)
      if ("error" in gate) throw new ProposalError("FORBIDDEN", "You can't edit this draft.")
      const amount = input.fields.amount ? Number(input.fields.amount.amount) : null
      next = {
        ...input.fields,
        allocations: amount ? await memberReceiptAllocations(principal, gate.member!.id, amount, deps) : [],
        ...evidenceFor(principal, input.fields, current),
      }
      break
    }
    case "payment-request":
      next = { ...input.fields }
      break
    case "record-payment": {
      if (!roleCan(principal.role, "manage_member_contributions"))
        throw new ProposalError("FORBIDDEN", "You can't edit this draft.")
      const memberId = input.fields.member?.memberId ?? null
      const targets = memberId
        ? await deps.paymentTargets({ tenantId: principal.tenantId, memberId })
        : null
      if (memberId && !targets?.member) throw new ProposalError("NOT_FOUND", "Member not found in this cooperative.")
      const amount = input.fields.amount ? Number(input.fields.amount.amount) : null
      const planned = memberId && amount ? await staffPaymentPlan(principal, memberId, amount, deps) : null
      next = {
        ...input.fields,
        member: targets?.member
          ? { memberId: targets.member.id, memberNumber: targets.member.memberNumber, name: targets.member.fullName }
          : null,
        allocations: planned?.allocations ?? [],
      }
      break
    }
  }
  const status = missingFor(next).length ? "collecting" : "review"
  await reviseAssistantProposal({
    ...scopeOf(principal),
    proposalId: input.proposalId,
    expectedRevision: input.revision,
    fields: next,
    status,
    expiresAt: new Date(deps.now().getTime() + DRAFT_TTL_MS),
  })
  const fresh = await readAssistantProposal({ ...scopeOf(principal), proposalId: input.proposalId })
  return toProposalDto(fresh!)
}

export async function cancelProposal(principal: AssistantPrincipal, proposalId: string) {
  await setAssistantProposalStatus({ ...scopeOf(principal), proposalId, from: ["collecting", "review"], to: "cancelled" })
  const row = await readAssistantProposal({ ...scopeOf(principal), proposalId })
  if (!row) throw new ProposalError("NOT_FOUND", "Draft not found.")
  return toProposalDto(row)
}

export class ProposalError extends Error {
  constructor(
    readonly code: "NOT_FOUND" | "BAD_REQUEST" | "FORBIDDEN" | "CONFLICT",
    message: string
  ) {
    super(message)
    this.name = "ProposalError"
  }
}

const notSaved = (proposalId: string, revision: number, message: string): AssistantActionResult => ({
  proposalId,
  revision,
  outcome: "not_saved",
  reference: null,
  message,
  link: null,
})

/** Confirms the exact reviewed revision through the canonical command, once. */
export async function confirmProposal(
  principal: AssistantPrincipal,
  input: { proposalId: string; revision: number; confirmationKey: string },
  deps = defaultProposalDependencies
): Promise<AssistantActionResult> {
  // Financial confirmations are app-only.
  if (principal.channel !== "web" && principal.channel !== "native")
    return notSaved(input.proposalId, input.revision, "Confirm this in the Halaalvest app.")
  const claim = await claimAssistantProposalConfirmation({
    ...scopeOf(principal),
    ...input,
    now: deps.now(),
  })
  if (claim.kind === "refused")
    return notSaved(
      input.proposalId,
      input.revision,
      claim.reason === "stale"
        ? "This draft changed. Review the latest version before confirming."
        : claim.reason === "expired"
          ? "This review expired. Start again to see current figures."
          : "This draft can't be confirmed again."
    )
  if (claim.kind === "already") {
    const saved = claim.proposal.result as AssistantActionResult | null
    return (
      saved ?? {
        proposalId: input.proposalId,
        revision: input.revision,
        outcome: "checking",
        reference: null,
        message: "Still saving. Check again in a moment.",
        link: null,
      }
    )
  }
  const fields = proposalFieldsSchema.parse(claim.proposal.fields)
  let result: AssistantActionResult
  try {
    result = await executeConfirmed(principal, claim.proposal, fields, deps)
  } catch (error) {
    const message =
      error && typeof error === "object" && "publicMessage" in error && typeof error.publicMessage === "string"
        ? error.publicMessage
        : error instanceof Error && error.name === "ExpectedQueryError"
          ? error.message
          : "Not saved. Nothing was posted. Try again from a fresh review."
    result = notSaved(input.proposalId, input.revision, message)
  }
  await saveAssistantProposalResult({
    proposalId: input.proposalId,
    confirmationKey: input.confirmationKey,
    outcome: result.outcome === "saved" ? "saved" : "not_saved",
    result,
    resultReference: result.reference,
  })
  return result
}

async function executeConfirmed(
  principal: AssistantPrincipal,
  row: AssistantProposalRow,
  fields: AssistantProposalFields,
  deps: ProposalDependencies
): Promise<AssistantActionResult> {
  const base = { proposalId: row.id, revision: row.revision }
  switch (fields.kind) {
    case "receipt-submission": {
      const gate = await memberGate(principal, "submit_receipts", deps)
      if ("error" in gate) return notSaved(row.id, row.revision, "You can no longer submit receipts here.")
      const profile = await deps.operationProfile(principal.tenantId)
      if (!profile.services.payment_receipts.canMemberCreate)
        return notSaved(row.id, row.revision, "Online receipts are closed for your cooperative.")
      if (!fields.amount || !fields.paidOn || !fields.allocations.length)
        return notSaved(row.id, row.revision, "This receipt is missing details.")
      const receipt = await deps.createReceipt({
        allocations: receiptAllocationInputs(fields.allocations),
        channel: "transfer",
        memberId: gate.member!.id,
        memberNotes: "Submitted through the Halaalvest assistant.",
        paidAt: new Date(`${fields.paidOn}T00:00:00.000Z`),
        paymentReference: fields.paymentReference,
        proofDocumentName: receiptProofUrl(fields.evidenceUploadId) ? fields.evidenceName ?? "Payment proof" : null,
        proofDocumentUrl: receiptProofUrl(fields.evidenceUploadId),
        submittedByUserId: principal.userId,
        tenantId: principal.tenantId,
        totalAmount: Number(fields.amount.amount),
      })
      const id = (receipt as { id?: string } | null)?.id ?? null
      return {
        ...base,
        outcome: "saved",
        reference: id ? `RCPT-${id.slice(0, 6).toUpperCase()}` : null,
        message: `Receipt for ${formatMoney(fields.amount)} saved for review. Nothing is posted until staff approve it.`,
        link: { label: "Open receipt", href: id ? `/payment-receipts?receiptId=${id}` : "/payment-receipts" },
      }
    }
    case "payment-request": {
      const gate = await memberGate(principal, "view_own_member_profile", deps)
      if ("error" in gate) return notSaved(row.id, row.revision, "You can no longer open requests here.")
      if (fields.purpose !== "special_savings_refund" && fields.purpose !== "money_owed")
        return notSaved(row.id, row.revision, "Choose what you need first.")
      const supportCase = await deps.createSupportCase({
        category: "payment_issue",
        description: [
          fields.purpose === "special_savings_refund"
            ? "Member asked to withdraw or refund special savings."
            : "Member asked for help with money the cooperative owes them.",
          fields.amount ? `Amount mentioned: ${formatMoney(fields.amount)}.` : null,
          fields.note ? `Note: ${fields.note}` : null,
          "Opened through the Halaalvest assistant.",
        ]
          .filter(Boolean)
          .join("\n"),
        memberId: gate.member!.id,
        moneyImpactRequested: true,
        openedByUserId: principal.userId,
        subject:
          fields.purpose === "special_savings_refund"
            ? "Special savings refund request"
            : "Money owed to member",
        tenantId: principal.tenantId,
      })
      return {
        ...base,
        outcome: "saved",
        reference: `CASE-${supportCase.id.slice(0, 6).toUpperCase()}`,
        message: "Your request is open as a support case. Finance reviews it before anything is paid.",
        link: { label: "Open support case", href: `/support?supportCaseSheetType=case&supportCaseId=${supportCase.id}` },
      }
    }
    case "record-payment": {
      if (principal.role === "member" || !roleCan(principal.role, "manage_member_contributions"))
        return notSaved(row.id, row.revision, "You no longer have permission to record payments.")
      if (!fields.member || !fields.amount || !fields.paidOn || !fields.period)
        return notSaved(row.id, row.revision, "This payment is missing details.")
      const amount = Number(fields.amount.amount)
      // Recompute from current records; a changed plan or schedule means a fresh review.
      const planned = await staffPaymentPlan(principal, fields.member.memberId, amount, deps)
      if (!planned) return notSaved(row.id, row.revision, "Member not found in this cooperative.")
      const reviewed = JSON.stringify(fields.allocations.map((a) => [a.targetId, a.amount.amount]))
      const current = JSON.stringify(planned.allocations.map((a) => [a.targetId, a.amount.amount]))
      if (reviewed !== current)
        return notSaved(row.id, row.revision, "The member's commitment or schedule changed. Review the payment again.")
      const posted = await deps.recordPayment({
        actorUserId: principal.userId,
        channel: (fields.channel as "transfer" | "cash" | "payroll" | "manual") ?? "transfer",
        committedSavingsAmount: planned.resolved.committedSavingsAmount,
        contributionPlanId: planned.plan?.id,
        loanId: planned.loan?.id,
        scheduledLoanServicingAmount: planned.resolved.scheduledLoanServicingAmount,
        totalAmount: amount,
        memberId: fields.member.memberId,
        periodLabel: fields.period,
        postedAt: new Date(`${fields.paidOn}T00:00:00.000Z`),
        reference: fields.paymentReference ?? undefined,
        idempotencyKeyPrefix: `assistant:${row.id}`,
        tenantId: principal.tenantId,
      })
      const reference = posted.contributionId ?? posted.repaymentId
      return {
        ...base,
        outcome: "saved",
        reference: reference ? `PAY-${reference.slice(0, 6).toUpperCase()}` : null,
        message: `Posted ${formatMoney(fields.amount)} for ${fields.member.name} (${fields.period}).`,
        link: { label: "Open statement", href: `/members/${fields.member.memberId}/statement` },
      }
    }
  }
}
