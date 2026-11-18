import type { StatusTone } from "@/components/ui/status-pill"
import type { MobileAdminMemberCreateInput } from "./admin-member-lifecycle-types"

export const memberTypes = [
  {
    value: "individual",
    label: "Individual",
    description: "Saves monthly and pays in directly",
  },
  {
    value: "civil_servant",
    label: "Civil servant",
    description: "Contributes through payroll deduction",
  },
  {
    value: "business",
    label: "Business",
    description: "A business or organisation membership",
  },
] as const satisfies readonly {
  value: MobileAdminMemberCreateInput["memberType"]
  label: string
  description: string
}[]

export function memberLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/^./, (first) => first.toUpperCase())
}

export function memberPill(
  status: string,
  kyc = false
): { label: string; tone: StatusTone } {
  const tones: Record<string, StatusTone> = {
    active: "success",
    pending: "warning",
    rejected: "danger",
    suspended: "danger",
    verified: kyc ? "brand" : "success",
  }
  const label = status.replaceAll("_", " ")
  return {
    label: kyc ? `KYC ${label}` : memberLabel(status),
    tone: tones[status] ?? "neutral",
  }
}

export function memberMeta(member: {
  memberNumber: string
  memberType: string
}) {
  return `${member.memberNumber} · ${memberLabel(member.memberType)}`
}
