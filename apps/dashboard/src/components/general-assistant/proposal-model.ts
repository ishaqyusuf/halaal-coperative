import type {
  AssistantProposal,
  AssistantProposalFields,
  AssistantProposalStatus,
} from "@halaalvest/assistant/contracts"
import { formatAssistantDate, formatMoney } from "@halaalvest/assistant/format"
import { paymentRequestOptions } from "@halaalvest/assistant/intents"

/**
 * Pure proposal presentation and edit rules shared by the review card and
 * the editor. The server owns allocation, authority and the saved result;
 * this only shows the exact revision and turns edits back into fields.
 */
export const proposalTitle: Record<AssistantProposalFields["kind"], string> = {
  "receipt-submission": "Submit a receipt",
  "payment-request": "Payment request",
  "record-payment": "Record a payment",
}

export const proposalConfirmLabel: Record<
  AssistantProposalFields["kind"],
  string
> = {
  "receipt-submission": "Submit receipt",
  "payment-request": "Send request",
  "record-payment": "Post payment",
}

export const proposalStatusLabel: Record<AssistantProposalStatus, string> = {
  collecting: "Needs details",
  review: "Needs your review",
  confirmed: "Done",
  cancelled: "Cancelled",
  expired: "Expired",
  refused: "Not allowed",
}

export function purposeLabel(
  purpose: Extract<AssistantProposalFields, { kind: "payment-request" }>["purpose"]
) {
  return (
    paymentRequestOptions.find((option) => option.value === purpose)?.label ??
    null
  )
}

function monthLabel(period: string) {
  const [year, month] = period.split("-").map(Number)
  if (!year || !month) return period
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-NG", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
}

export type ReviewLine = { label: string; value: string; strong?: boolean }

/** The exact fields of one revision, as label/value rows. */
export function proposalLines(fields: AssistantProposalFields): ReviewLine[] {
  const lines: (ReviewLine | null)[] = []
  const date = (value: string | null) =>
    value ? formatAssistantDate(value) : "Not set"
  if (fields.kind === "record-payment") {
    lines.push({
      label: "Member",
      value: fields.member
        ? `${fields.member.name} · ${fields.member.memberNumber}`
        : "Not chosen",
    })
  }
  if (fields.kind === "payment-request") {
    lines.push({
      label: "For",
      value: purposeLabel(fields.purpose) ?? "Not chosen",
    })
  }
  lines.push({
    label: "Amount",
    value: fields.amount ? formatMoney(fields.amount) : "Not set",
    strong: true,
  })
  if (fields.kind === "receipt-submission" || fields.kind === "record-payment") {
    lines.push({ label: "Date paid", value: date(fields.paidOn) })
  }
  if (fields.kind === "record-payment") {
    lines.push({
      label: "Collection month",
      value: fields.period ? monthLabel(fields.period) : "Not set",
    })
    lines.push(fields.channel ? { label: "Paid by", value: fields.channel } : null)
  }
  if (fields.kind === "receipt-submission" || fields.kind === "record-payment") {
    lines.push(
      fields.paymentReference
        ? { label: "Payment reference", value: fields.paymentReference }
        : null
    )
    for (const allocation of fields.allocations)
      lines.push({
        label: `→ ${allocation.label}`,
        value: formatMoney(allocation.amount),
      })
  }
  if (fields.kind === "receipt-submission" && fields.evidenceUploadId) {
    lines.push({ label: "Proof", value: fields.evidenceName || "Attached" })
  }
  if (fields.kind === "payment-request" && fields.note) {
    lines.push({ label: "Note", value: fields.note })
  }
  return lines.filter((line): line is ReviewLine => !!line)
}

const uploadUrl =
  /^\/api\/uploads\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i

/** The `DashboardEvidenceUpload` id in an upload URL (`/api/uploads/<id>`). */
export function receiptProofUploadId(url: string) {
  return uploadUrl.exec(url)?.[1] ?? null
}

export function proposalLapsed(proposal: AssistantProposal, now = Date.now()) {
  return new Date(proposal.expiresAt).getTime() <= now
}

/** Open for review or edit: not saved, cancelled, refused or lapsed. */
export function proposalOpen(proposal: AssistantProposal, now = Date.now()) {
  return (
    (proposal.status === "review" || proposal.status === "collecting") &&
    !proposalLapsed(proposal, now)
  )
}

// ---------------------------------------------------------------------------
// Editor values
// ---------------------------------------------------------------------------

export type ProposalFormValues = {
  amount: string
  paidOn: string
  period: string
  channel: string
  paymentReference: string
  purpose: string
  note: string
}

export function proposalFormValues(
  fields: AssistantProposalFields
): ProposalFormValues {
  return {
    amount: fields.amount ? fields.amount.amount : "",
    paidOn: "paidOn" in fields ? (fields.paidOn ?? "") : "",
    period: fields.kind === "record-payment" ? (fields.period ?? "") : "",
    channel: fields.kind === "record-payment" ? (fields.channel ?? "") : "",
    paymentReference:
      "paymentReference" in fields ? (fields.paymentReference ?? "") : "",
    purpose: fields.kind === "payment-request" ? (fields.purpose ?? "") : "",
    note: fields.kind === "payment-request" ? (fields.note ?? "") : "",
  }
}

/** Naira amount as typed ("25,000", "₦25000.5") → decimal string or null. */
export function parseNaira(input: string): string | null | "invalid" {
  const cleaned = input.replace(/[₦,\s]/g, "")
  if (!cleaned) return null
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned) || Number(cleaned) <= 0)
    return "invalid"
  return cleaned
}

export type ProposalFormErrors = Partial<Record<keyof ProposalFormValues, string>>

/** Validates the form and returns new fields for the same proposal kind. */
export function proposalFieldsFromForm(
  current: AssistantProposalFields,
  values: ProposalFormValues
):
  | { ok: true; fields: AssistantProposalFields }
  | { ok: false; errors: ProposalFormErrors } {
  const errors: ProposalFormErrors = {}
  const amount = parseNaira(values.amount)
  if (amount === "invalid")
    errors.amount = "Enter an amount in naira, like 25000 or 25000.50."
  if (values.paidOn && !/^\d{4}-\d{2}-\d{2}$/.test(values.paidOn))
    errors.paidOn = "Pick the date it was paid."
  if (values.period && !/^\d{4}-\d{2}$/.test(values.period))
    errors.period = "Pick the collection month."
  if (values.paymentReference.length > 120)
    errors.paymentReference = "Keep the reference under 120 characters."
  if (values.note.length > 500) errors.note = "Keep the note under 500 characters."
  const purpose = paymentRequestOptions.find(
    (option) => option.value === values.purpose
  )?.value
  if (current.kind === "payment-request" && values.purpose && !purpose)
    errors.purpose = "Choose what the payment is for."
  if (Object.keys(errors).length) return { ok: false, errors }

  const money =
    amount && amount !== "invalid"
      ? { amount, currency: "NGN" as const }
      : null
  const text = (value: string) => value.trim() || null
  switch (current.kind) {
    case "receipt-submission":
      return {
        ok: true,
        fields: {
          ...current,
          amount: money,
          paidOn: text(values.paidOn),
          paymentReference: text(values.paymentReference),
        },
      }
    case "payment-request":
      return {
        ok: true,
        fields: {
          ...current,
          purpose: purpose ?? null,
          amount: money,
          note: text(values.note),
        },
      }
    case "record-payment":
      return {
        ok: true,
        fields: {
          ...current,
          amount: money,
          paidOn: text(values.paidOn),
          period: text(values.period),
          channel: text(values.channel),
          paymentReference: text(values.paymentReference),
        },
      }
  }
}
