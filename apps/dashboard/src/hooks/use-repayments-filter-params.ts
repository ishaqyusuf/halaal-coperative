import { useQueryStates } from "nuqs"
import {
  createLoader,
  parseAsArrayOf,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server"
import { hasActiveFilters } from "@/lib/filters/utils"

export type RepaymentsFilterParams = {
  assignedToUserId: string | null
  dateRange: string[] | null
  memberId: string | null
  q: string | null
  repaymentStatus: "pending" | "posted" | "reversed" | null
  resolutionStatus: "open" | "resolved" | null
  scheduleStatus:
    | "pending"
    | "due"
    | "partially_paid"
    | "overdue"
    | "paid"
    | "waived"
    | null
  stage: "active" | "promise_tracking" | "escalated" | "resolved" | null
  view: "collections" | "schedule" | "history" | null
}

export const repaymentsFilterParamsSchema = {
  assignedToUserId: parseAsString,
  dateRange: parseAsArrayOf(parseAsString),
  memberId: parseAsString,
  q: parseAsString,
  resolutionStatus: parseAsStringEnum(["open", "resolved"]),
  scheduleStatus: parseAsStringEnum([
    "pending",
    "due",
    "partially_paid",
    "overdue",
    "paid",
    "waived",
  ]),
  repaymentStatus: parseAsStringEnum(["pending", "posted", "reversed"]),
  stage: parseAsStringEnum([
    "active",
    "promise_tracking",
    "escalated",
    "resolved",
  ]),
  view: parseAsStringEnum(["collections", "schedule", "history"]),
}

export function useRepaymentsFilterParams() {
  const [filters, setFilters] = useQueryStates(repaymentsFilterParamsSchema, {
    shallow: false,
  })

  return {
    filters,
    hasFilters: hasActiveFilters({ ...filters, view: null }),
    setFilters,
  }
}

export const loadRepaymentsFilterParams = createLoader(
  repaymentsFilterParamsSchema
)
