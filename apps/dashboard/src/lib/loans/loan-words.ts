/**
 * Plain words for loan, request, guarantor and installment states, shared by
 * the loans, repayments and guarantor pages (tables, phone lists, sheets).
 */

export type LoanWordTone = "attention" | "bad" | "default" | "good"

type Word = { label: string; tone: LoanWordTone }

const requestWords: Record<string, Word> = {
  approved: { label: "Approved", tone: "good" },
  cancelled: { label: "Cancelled", tone: "default" },
  draft: { label: "Draft", tone: "default" },
  expired: { label: "Expired", tone: "default" },
  rejected: { label: "Declined", tone: "bad" },
  submitted: { label: "New", tone: "attention" },
  under_review: { label: "Being checked", tone: "attention" },
}

const loanWords: Record<string, Word> = {
  active: { label: "Repaying", tone: "good" },
  approved: { label: "Ready to pay out", tone: "attention" },
  completed: { label: "Fully repaid", tone: "default" },
  defaulted: { label: "Stopped paying", tone: "bad" },
  disbursed: { label: "Paid out", tone: "good" },
  written_off: { label: "Written off", tone: "bad" },
}

const guarantorWords: Record<string, Word> = {
  approved: { label: "Agreed", tone: "good" },
  pending: { label: "Waiting", tone: "attention" },
  rejected: { label: "Said no", tone: "bad" },
}

const installmentWords: Record<string, Word> = {
  due: { label: "Due", tone: "attention" },
  overdue: { label: "Late", tone: "bad" },
  paid: { label: "Paid", tone: "good" },
  partially_paid: { label: "Part paid", tone: "attention" },
  pending: { label: "Not due yet", tone: "default" },
  waived: { label: "Not needed", tone: "default" },
}

const repaymentWords: Record<string, Word> = {
  pending: { label: "Pending", tone: "attention" },
  posted: { label: "Received", tone: "good" },
  reversed: { label: "Reversed", tone: "bad" },
}

function humanize(value: string) {
  const text = value.replace(/_/g, " ")
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function lookup(words: Record<string, Word>, status: string): Word {
  return words[status] ?? { label: humanize(status), tone: "default" }
}

export function getLoanRequestWord(status: string) {
  return lookup(requestWords, status)
}

export function getLoanWord(status: string) {
  return lookup(loanWords, status)
}

export function getGuarantorWord(status: string) {
  return lookup(guarantorWords, status)
}

/** An unpaid installment due before today reads "Late" whatever its status. */
export function getInstallmentWord(status: string, isLate = false) {
  if (isLate && status !== "paid" && status !== "waived") {
    return installmentWords.overdue!
  }

  return lookup(installmentWords, status)
}

export function getRepaymentWord(status: string) {
  return lookup(repaymentWords, status)
}

type GuarantorAnswer = {
  guarantorMember: { fullName: string }
  status: string
}

/**
 * One line for a request's guarantors: who still has to answer, or that
 * everyone agreed. Empty list means none were asked.
 */
export function getGuarantorSummary(guarantors: GuarantorAnswer[]) {
  if (guarantors.length === 0) {
    return { label: "No guarantors", tone: "default" as LoanWordTone }
  }

  const declined = guarantors.find((row) => row.status === "rejected")
  if (declined) {
    return {
      label: `${declined.guarantorMember.fullName} said no`,
      tone: "bad" as LoanWordTone,
    }
  }

  const waiting = guarantors.filter((row) => row.status === "pending")
  if (waiting.length === 0) {
    return {
      label:
        guarantors.length === 1
          ? "Guarantor agreed"
          : `All ${guarantors.length} guarantors agreed`,
      tone: "good" as LoanWordTone,
    }
  }

  return {
    label:
      waiting.length === 1
        ? `Waiting for ${waiting[0]!.guarantorMember.fullName}`
        : `Waiting for ${waiting.length} guarantors`,
    tone: "attention" as LoanWordTone,
  }
}

function startOfUtcToday(now = new Date()) {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
}

/**
 * Unpaid and due before today. Mirrors `isLateScheduleItem` in
 * `@halaalvest/db` (which the server uses for lists and counts).
 */
export function isInstallmentLate(
  dueAt: Date | string,
  status: string,
  now = new Date()
) {
  return (
    ["pending", "due", "partially_paid", "overdue"].includes(status) &&
    new Date(dueAt).getTime() < startOfUtcToday(now)
  )
}
