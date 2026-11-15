/** The form value staff send to take a case off everyone ("No one"). */
export const supportCaseNoAssignee = "none"

/**
 * Reads the case's "Handled by" field: a user id assigns, `none` unassigns
 * (null), and a missing or empty field keeps the current assignee
 * (undefined).
 */
export function readSupportCaseAssignee(
  formData: FormData
): string | null | undefined {
  const value = formData.get("assignedToUserId")
  const assignee = typeof value === "string" ? value.trim() : ""

  if (!assignee) return undefined
  if (assignee === supportCaseNoAssignee) return null
  return assignee
}
