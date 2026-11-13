// Plain words for a member's monthly row. "pending" is stored; staff read it
// as "Not paid".
export const monthlyRecordStatusLabels = {
  applied: "Paid",
  cancelled: "Cancelled",
  pending: "Not paid",
} as const

export function monthlyRecordStatusLabel(status: string) {
  return (
    monthlyRecordStatusLabels[status as keyof typeof monthlyRecordStatusLabels] ??
    status
  )
}

export function monthlyRecordStatusVariant(status: string) {
  if (status === "applied") return "default" as const
  if (status === "cancelled") return "destructive" as const
  return "secondary" as const
}
