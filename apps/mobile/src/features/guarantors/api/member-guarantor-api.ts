import { isMobileDevFixtureSession } from "@/dev/mobile-dev-session"
import {
  getDevMemberGuarantorApprovals,
  respondDevGuarantorApproval,
} from "@/dev/mobile-dev-fixtures"
import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import { readCachedMobileQuery } from "@/lib/read-cache"
import { TRPCClientError } from "@trpc/client"
import { matchesGuarantorSearch } from "../model/member-guarantor-presentation"
import type {
  MobileGuarantorCursor,
  MobileGuarantorRequest,
  MobileGuarantorResponseInput,
  MobileMemberGuarantorSnapshot,
} from "../model/member-guarantor-types"

export const GUARANTOR_CACHE_KEY = "member.guarantor-approvals.v2"

export function getMemberGuarantorApprovals({
  cursor,
  search,
}: {
  cursor: MobileGuarantorCursor | null
  search: string
}): Promise<MobileMemberGuarantorSnapshot> {
  return readCachedMobileQuery(
    GUARANTOR_CACHE_KEY,
    async () => {
      if (isMobileDevFixtureSession()) {
        const snapshot = getDevMemberGuarantorApprovals()
        return {
          ...snapshot,
          approvals: snapshot.approvals.filter((row) =>
            matchesGuarantorSearch(row, search)
          ),
          state: "available" as const,
        }
      }

      const client = createMobileTrpcClient()
      const snapshot = await client.mobile.member.guarantorApprovals.list.query(
        {
          cursor,
          pageSize: 20,
          search: search || undefined,
        }
      )
      if (snapshot.state === "database_unavailable") {
        throw new Error("Guarantor approvals are unavailable.")
      }
      return snapshot
    },
    {
      persist: !cursor && !search,
      shouldFallback: (error) =>
        !(
          error instanceof TRPCClientError &&
          ["FORBIDDEN", "UNAUTHORIZED"].includes(error.data?.code)
        ),
    }
  )
}

export async function getMemberGuarantorRequest(id: string) {
  if (isMobileDevFixtureSession()) {
    return (
      getDevMemberGuarantorApprovals().approvals.find(
        (approval) => approval.id === id
      ) ?? null
    )
  }
  const client = createMobileTrpcClient()
  return client.mobile.member.guarantorApprovals.request.query({
    guarantorApprovalId: id,
  })
}

export async function respondMemberGuarantorApproval(
  input: MobileGuarantorResponseInput
): Promise<MobileGuarantorRequest> {
  if (isMobileDevFixtureSession()) {
    return respondDevGuarantorApproval(input)
  }
  const client = createMobileTrpcClient()
  return client.mobile.member.guarantorApprovals.respond.mutate(input)
}
