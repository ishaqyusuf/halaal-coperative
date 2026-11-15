import {
  getPublishedLegalBundle,
  listOwnLegalAcceptances,
} from "@halaalvest/db"
import { needsLegalReviewReminder } from "@halaalvest/domain/legal-reminder"

/**
 * Whether the shell shows the "review the updated documents" reminder.
 * Shared by the sidebar layout and home so both shells agree.
 */
export async function loadShowLegalReminder(input: {
  hasMembership: boolean
  tenantId: string | null | undefined
  userId: string | null | undefined
}) {
  const legalBundle = getPublishedLegalBundle()
  const legalRecords =
    legalBundle.available &&
    input.tenantId &&
    input.userId &&
    input.hasMembership
      ? await listOwnLegalAcceptances({
          tenantId: input.tenantId,
          userId: input.userId,
        }).catch(() => null)
      : null

  return needsLegalReviewReminder(legalBundle, legalRecords)
}
