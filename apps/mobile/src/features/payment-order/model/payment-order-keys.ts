import { memberPayablesQueryKey } from "@/features/receipts/public/member-payables"
import type { QueryKey } from "@tanstack/react-query"

/**
 * Reads that depend on the tenant's payment order, invalidated (exact keys)
 * after a save: this account's member payables, which carry the mode and
 * the order (an admin can also be a member of the cooperative).
 */
export function paymentOrderDependentKeys(
  profile:
    | { activeMembershipId?: string | null; tenant: { id: string }; user: { id: string } }
    | null
    | undefined
): QueryKey[] {
  if (!profile?.activeMembershipId) return []
  return [
    memberPayablesQueryKey(
      `${profile.user.id}:${profile.tenant.id}:${profile.activeMembershipId}`
    ),
  ]
}
