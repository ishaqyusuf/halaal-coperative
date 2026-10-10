import { isMobileDevFixtureSession } from "@/dev/mobile-dev-session"
import {
  createDevProjectFinancingRequest,
  getDevMemberProjectFinancing,
} from "@/dev/mobile-dev-fixtures"
import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import { readCachedMobileQuery } from "@/lib/read-cache"
import type {
  MobileMemberProjectFinancing,
  MobileProjectFinancingChargeQuote,
  MobileProjectFinancingRequest,
  MobileProjectFinancingRequestPage,
  MobileProjectFinancingRequestCreateInput,
} from "../model/member-project-financing-types"

export async function getMobileMemberProjectFinancing() {
  if (isMobileDevFixtureSession()) {
    return readCachedMobileQuery("member.projectFinancing", async () =>
      getDevMemberProjectFinancing()
    ) as Promise<MobileMemberProjectFinancing>
  }
  const client = createMobileTrpcClient()
  return readCachedMobileQuery("member.projectFinancing", () =>
    client.mobile.member.projectFinancing.list.query()
  ) as Promise<MobileMemberProjectFinancing>
}

export async function getMobileMemberProjectFinancingChargeQuote(
  requestedAmount: number
) {
  if (isMobileDevFixtureSession()) {
    const charges = getDevMemberProjectFinancing().chargeOptions.map(
      (charge) => ({
        amount:
          charge.chargeValueType === "percentage"
            ? Number(((requestedAmount * charge.amount) / 100).toFixed(2))
            : charge.amount,
        collectionMode: charge.collectionMode,
        id: charge.id,
        name: charge.name,
      })
    )
    return {
      chargeQuoteHash: "a".repeat(64),
      charges,
      feeTotal: charges.reduce((sum, charge) => sum + charge.amount, 0),
      generatedAt: new Date().toISOString(),
      requestedAmount,
    } as MobileProjectFinancingChargeQuote
  }
  const client = createMobileTrpcClient()
  return client.mobile.member.projectFinancing.quote.query({
    requestedAmount,
  }) as Promise<MobileProjectFinancingChargeQuote>
}

export async function getMobileMemberProjectFinancingRequests(input: {
  cursor: string
  pageSize?: number
}) {
  if (isMobileDevFixtureSession()) {
    return {
      data: [],
      nextCursor: null,
      state: "available",
    } as MobileProjectFinancingRequestPage
  }
  const client = createMobileTrpcClient()
  return client.mobile.member.projectFinancing.requests.query(
    input
  ) as Promise<MobileProjectFinancingRequestPage>
}

export async function getMobileMemberProjectFinancingRequest(
  projectFinancingRequestId: string
) {
  if (isMobileDevFixtureSession()) {
    const snapshot =
      getDevMemberProjectFinancing() as MobileMemberProjectFinancing
    return (
      snapshot.requests.find(
        (request) => request.id === projectFinancingRequestId
      ) ?? null
    )
  }
  const client = createMobileTrpcClient()
  return client.mobile.member.projectFinancing.request.query({
    projectFinancingRequestId,
  }) as Promise<MobileProjectFinancingRequest | null>
}

export async function createMobileMemberProjectFinancingRequest(
  input: MobileProjectFinancingRequestCreateInput
) {
  if (isMobileDevFixtureSession()) {
    return createDevProjectFinancingRequest(
      input
    ) as MobileProjectFinancingRequest
  }
  const client = createMobileTrpcClient()
  return client.mobile.member.projectFinancing.createRequest.mutate(
    input
  ) as Promise<MobileProjectFinancingRequest>
}
