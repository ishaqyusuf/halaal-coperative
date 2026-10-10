import { isMobileDevFixtureSession } from "@/dev/mobile-dev-session"
import {
  getDevMemberGuarantorApprovals,
  respondDevGuarantorApproval,
} from "@/dev/mobile-dev-fixtures"
import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import { readCachedMobileQuery } from "@/lib/read-cache"
import type {
  MobileGuarantorRequest,
  MobileGuarantorResponseInput,
  MobileMemberGuarantorSnapshot,
} from "../model/member-guarantor-types"

export async function getMemberGuarantorApprovals(): Promise<MobileMemberGuarantorSnapshot> {
  if (isMobileDevFixtureSession()) {
    return readCachedMobileQuery("member.guarantor-approvals", async () => ({
      ...getDevMemberGuarantorApprovals(),
      state: "available" as const,
    })) as Promise<MobileMemberGuarantorSnapshot>
  }
  const client = createMobileTrpcClient()
  return readCachedMobileQuery("member.guarantor-approvals", () =>
    client.mobile.member.guarantorApprovals.list.query()
  ) as Promise<MobileMemberGuarantorSnapshot>
}

export async function respondMemberGuarantorApproval(
  input: MobileGuarantorResponseInput
): Promise<MobileGuarantorRequest> {
  if (isMobileDevFixtureSession()) {
    return respondDevGuarantorApproval(input)
  }
  const client = createMobileTrpcClient()
  return client.mobile.member.guarantorApprovals.respond.mutate(
    input
  ) as Promise<MobileGuarantorRequest>
}
