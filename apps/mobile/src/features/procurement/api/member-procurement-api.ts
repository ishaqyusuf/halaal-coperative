import { isMobileDevFixtureSession } from "@/dev/mobile-dev-session"
import {
  createDevProcurementRequest,
  getDevMemberProcurement,
} from "@/dev/mobile-dev-fixtures"
import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import { readCachedMobileQuery } from "@/lib/read-cache"
import type {
  MobileMemberProcurement,
  MobileMemberProcurementRequest,
  MobileProcurementRequestPage,
  MobileProcurementRequestCreateInput,
} from "../model/member-procurement-types"

export async function getMobileMemberProcurement() {
  if (isMobileDevFixtureSession()) {
    return readCachedMobileQuery("member.procurement", async () =>
      getDevMemberProcurement()
    ) as Promise<MobileMemberProcurement>
  }
  const client = createMobileTrpcClient()
  return readCachedMobileQuery("member.procurement", () =>
    client.mobile.member.procurement.list.query()
  ) as Promise<MobileMemberProcurement>
}

export async function getMobileMemberProcurementRequests(input: {
  cursor: string
  pageSize?: number
}) {
  if (isMobileDevFixtureSession()) {
    return {
      data: [],
      nextCursor: null,
      state: "available",
    } as MobileProcurementRequestPage
  }
  const client = createMobileTrpcClient()
  return client.mobile.member.procurement.requests.query(
    input
  ) as Promise<MobileProcurementRequestPage>
}

export async function getMobileMemberProcurementRequest(
  procurementRequestId: string
) {
  if (isMobileDevFixtureSession()) {
    const snapshot = getDevMemberProcurement() as MobileMemberProcurement
    return (
      snapshot.requests.find(
        (request) => request.id === procurementRequestId
      ) ?? null
    )
  }
  const client = createMobileTrpcClient()
  return client.mobile.member.procurement.request.query({
    procurementRequestId,
  }) as Promise<MobileMemberProcurementRequest | null>
}

export async function createMobileMemberProcurementRequest(
  input: MobileProcurementRequestCreateInput
) {
  if (isMobileDevFixtureSession()) {
    return createDevProcurementRequest(input) as MobileMemberProcurementRequest
  }
  const client = createMobileTrpcClient()
  return client.mobile.member.procurement.createRequest.mutate(
    input
  ) as Promise<MobileMemberProcurementRequest>
}
