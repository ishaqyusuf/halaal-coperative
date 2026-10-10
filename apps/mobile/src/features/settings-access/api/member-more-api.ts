import { getDevMemberMore } from "@/dev/mobile-dev-fixtures"
import { isMobileDevFixtureSession } from "@/dev/mobile-dev-session"
import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import { readCachedMobileQuery } from "@/lib/read-cache"

import type { MobileMemberMore } from "../model/member-more-types"

export async function getMemberMore(): Promise<MobileMemberMore> {
  if (isMobileDevFixtureSession()) {
    return readCachedMobileQuery("member.more", async () => getDevMemberMore())
  }
  const client = createMobileTrpcClient()
  return readCachedMobileQuery("member.more", () =>
    client.mobile.member.more.query()
  ) as Promise<MobileMemberMore>
}
