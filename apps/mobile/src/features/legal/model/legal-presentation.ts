import type { StatusCardTone } from "@/components/app/status-card"
import type { LegalBundle, LegalDocument, LegalRecord } from "../api/legal-api"

export type LegalState = "needs" | "updated" | "current" | "drafts" | "unavailable"

export function isDocumentRecorded(document: LegalDocument, records: readonly LegalRecord[]) {
  return records.some(
    (record) =>
      record.documentType === document.documentType &&
      record.documentVersion === document.documentVersion &&
      record.contentHash === document.contentHash
  )
}

/** Where the person stands on the current platform documents. */
export function legalState(bundle: LegalBundle, records: readonly LegalRecord[]): LegalState {
  if (!bundle.available) return bundle.acceptanceRequired ? "unavailable" : "drafts"
  if (bundle.documents.every((document) => isDocumentRecorded(document, records))) return "current"
  return records.length ? "updated" : "needs"
}

const dayFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" })
const timeFormat = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, minute: "2-digit" })
export const legalDay = (value: Date | string) => dayFormat.format(new Date(value))
export const legalDayTime = (value: Date | string) =>
  `${dayFormat.format(new Date(value))}, ${timeFormat.format(new Date(value))}`

export function effectiveLabel(bundle: LegalBundle) {
  const first = bundle.documents[0]
  return first ? `Effective ${legalDay(first.contentSnapshot.effectiveAt)}` : undefined
}

export const LEGAL_STATUS: Record<
  LegalState,
  { body: (bundle: LegalBundle) => string; icon: string; pill: string; title: string; tone: StatusCardTone }
> = {
  current: {
    body: () =>
      "Your acceptance of the current terms and acknowledgement of the current privacy notice are recorded.",
    icon: "ShieldCheck",
    pill: "Up to date",
    title: "You’re up to date",
    tone: "success",
  },
  drafts: {
    body: () => "These platform documents are still review drafts. There is nothing to accept yet.",
    icon: "FileText",
    pill: "Drafts",
    title: "Nothing to accept yet",
    tone: "neutral",
  },
  needs: {
    body: () => "Read the platform terms and privacy notice, then record your acknowledgement.",
    icon: "FileCheck2",
    pill: "Review needed",
    title: "Two documents need your review",
    tone: "warning",
  },
  unavailable: {
    body: () => "Approved current documents are temporarily unavailable. Try again later.",
    icon: "Clock",
    pill: "Unavailable",
    title: "Temporarily unavailable",
    tone: "warning",
  },
  updated: {
    body: (bundle) => {
      const first = bundle.documents[0]
      return first
        ? `New versions took effect on ${legalDay(first.contentSnapshot.effectiveAt)}. Read them, then record your acknowledgement.`
        : "Read the new versions, then record your acknowledgement."
    },
    icon: "FileCheck2",
    pill: "Updated",
    title: "Updated documents to review",
    tone: "warning",
  },
}

export function needsReviewTitle(bundle: LegalBundle, state: LegalState) {
  if (state !== "needs") return LEGAL_STATUS[state].title
  const count = bundle.documents.length
  return count === 1 ? "One document needs your review" : count === 2 ? "Two documents need your review" : `${count} documents need your review`
}

export function documentIcon(document: LegalDocument): { icon: string; tone: StatusCardTone } {
  return document.documentType === "privacy" ? { icon: "Eye", tone: "brand" } : { icon: "FileText", tone: "info" }
}

export function recordTitle(record: LegalRecord) {
  if (record.action === "accept_terms") return "Accepted platform terms"
  if (record.action === "acknowledge_notice") return "Acknowledged privacy notice"
  return record.documentType === "privacy" ? "Acknowledged privacy notice" : "Accepted platform terms"
}
