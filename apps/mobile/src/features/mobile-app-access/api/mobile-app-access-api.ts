import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"

export type MobileAppAccessSnapshot = {
  userBinding: string
  tenantId: string
  membershipId: string
  accessAllowed: boolean
  status:
    | "not_requested"
    | "pending"
    | "active"
    | "expired"
    | "rejected"
    | "revoked"
  accessEndsAt: Date | string | null
}

export function getMobileAppAccessSnapshot(): Promise<MobileAppAccessSnapshot> {
  return createMobileTrpcClient().cooperativeMobileAccess.snapshot.query()
}
