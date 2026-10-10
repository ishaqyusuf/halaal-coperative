import { isMobileDevFixtureSession } from "@/dev/mobile-dev-session"
import {
  createDevFinancingRequest,
  getDevMemberFinancing,
  getDevMemberFinancingQuote,
} from "@/dev/mobile-dev-fixtures"
import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import { readCachedMobileQuery } from "@/lib/read-cache"
import type {
  MobileFinancingQuote,
  MobileFinancingQuoteInput,
  MobileFinancingRequest,
  MobileFinancingRequestInput,
  MobileFinancingRequestPage,
  MobileMemberFinancing,
} from "../model/member-financing-types"

export async function getMemberFinancing(): Promise<MobileMemberFinancing> {
  if (isMobileDevFixtureSession()) {
    return readCachedMobileQuery("member.financing", async () => ({
      ...getDevMemberFinancing(),
      requestNextCursor: null,
    })) as Promise<MobileMemberFinancing>
  }
  const client = createMobileTrpcClient()
  return readCachedMobileQuery("member.financing", () =>
    client.mobile.member.financing.list.query()
  ) as Promise<MobileMemberFinancing>
}

export async function quoteMemberFinancing(
  input: MobileFinancingQuoteInput
): Promise<MobileFinancingQuote> {
  if (isMobileDevFixtureSession()) {
    return getDevMemberFinancingQuote(input) as MobileFinancingQuote
  }
  const client = createMobileTrpcClient()
  return client.mobile.member.financing.quote.query(
    input
  ) as Promise<MobileFinancingQuote>
}

export async function createMemberFinancingRequest(
  input: MobileFinancingRequestInput
): Promise<MobileFinancingRequest> {
  if (isMobileDevFixtureSession()) {
    return createDevFinancingRequest(input)
  }
  const client = createMobileTrpcClient()
  return client.mobile.member.financing.createRequest.mutate(
    input
  ) as Promise<MobileFinancingRequest>
}

export async function getMemberFinancingRequestPage(input: {
  cursor: string | null
}): Promise<MobileFinancingRequestPage> {
  if (isMobileDevFixtureSession()) {
    return { data: [], nextCursor: null, state: "available" }
  }
  const client = createMobileTrpcClient()
  return client.mobile.member.financing.requests.query({
    cursor: input.cursor,
    pageSize: 20,
  }) as Promise<MobileFinancingRequestPage>
}

export async function getMemberFinancingRequestDetail(
  loanRequestId: string
): Promise<MobileFinancingRequest | null> {
  if (isMobileDevFixtureSession()) {
    return (
      getDevMemberFinancing().requests.find(
        (request) => request.id === loanRequestId
      ) ?? null
    )
  }
  const client = createMobileTrpcClient()
  return client.mobile.member.financing.request.query({
    loanRequestId,
  }) as Promise<MobileFinancingRequest | null>
}
