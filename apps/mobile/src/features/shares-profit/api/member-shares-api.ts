import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import {
  readCachedMobileQuery,
  type MobileReadCacheState,
} from "@/lib/read-cache"
import type {
  MobileMemberShareApplication,
  MobileMemberShareApplicationCreateInput,
  MobileMemberShareApplicationsPage,
  MobileMemberShares,
} from "../model/member-shares-types"
import { isMobileDevFixtureSession } from "@/dev/mobile-dev-session"
import {
  createDevShareApplication,
  getDevMemberShareApplicationsPage,
  getDevMemberShares,
} from "@/dev/mobile-dev-fixtures"

export type MemberSharesCachedSnapshot = MobileMemberShares & {
  cache: MobileReadCacheState
}

export async function getMemberShareApplicationsPage(input: {
  cursor: string | null
}): Promise<MobileMemberShareApplicationsPage> {
  if (isMobileDevFixtureSession()) {
    return getDevMemberShareApplicationsPage({
      cursor: input.cursor,
      pageSize: 20,
    })
  }
  const client = createMobileTrpcClient()

  return client.mobile.member.shares.applications.query({
    cursor: input.cursor,
    pageSize: 20,
  }) as Promise<MobileMemberShareApplicationsPage>
}

export async function getMemberShares(): Promise<MemberSharesCachedSnapshot> {
  if (isMobileDevFixtureSession()) {
    return readCachedMobileQuery("member.shares", async () =>
      getDevMemberShares()
    )
  }
  const client = createMobileTrpcClient()

  return readCachedMobileQuery("member.shares", () =>
    client.mobile.member.shares.list.query()
  ) as Promise<MemberSharesCachedSnapshot>
}

export async function createMemberShareApplication(
  input: MobileMemberShareApplicationCreateInput
): Promise<MobileMemberShareApplication> {
  if (isMobileDevFixtureSession()) return createDevShareApplication(input)
  const client = createMobileTrpcClient()

  return client.mobile.member.shares.createApplication.mutate(
    input
  ) as Promise<MobileMemberShareApplication>
}
