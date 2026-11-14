import type { ShareRequestsTab } from "@/hooks/use-share-requests-params"

// Shared by the /shares prefetch and the staff list so both use one query key.
export function getShareRequestListInput(tab: ShareRequestsTab) {
  return tab === "waiting" ? { status: "pending" as const } : {}
}
