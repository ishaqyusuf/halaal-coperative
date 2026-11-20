import {
  cancelDevShareApplication,
  createDevShareApplication,
  getDevMemberShares,
} from "@/dev/mobile-dev-fixtures"
import { isMobileDevFixtureSession } from "@/dev/mobile-dev-session"
import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import { readCachedMobileQuery } from "@/lib/read-cache"
import type {
  MobileMemberShareApplicationCreateInput,
  ShareOverview,
  ShareProfitPeriod,
  ShareTimelinePage,
} from "../model/member-shares-types"

export function getMemberShareOverview() {
  return readCachedMobileQuery(
    "member.shares.overview",
    async (): Promise<ShareOverview> => {
      if (!isMobileDevFixtureSession()) {
        return createMobileTrpcClient().mobile.member.shares.overview.query()
      }
      const { applications, generatedAt, member, position, state } =
        getDevMemberShares()
      return {
        generatedAt,
        member,
        position,
        profit: { count: 0, total: 0, latestUnpaidAmount: null },
        shareBalance: position?.totalApprovedValue ?? 0,
        state,
        timeline: {
          items: applications
            .map((application) => ({
              application,
              kind: "request" as const,
              occurredAt: application.createdAt,
            }))
            .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
          nextCursor: null,
        },
      }
    }
  )
}

export function getMemberShareTimelinePage(
  cursor: string
): Promise<ShareTimelinePage> {
  return createMobileTrpcClient().mobile.member.shares.timeline.query({
    cursor,
  })
}

export function getMemberShareProfitPeriods(): Promise<ShareProfitPeriod[]> {
  return createMobileTrpcClient().mobile.member.shares.profit.query()
}

export async function createMemberShareApplication(
  input: MobileMemberShareApplicationCreateInput
) {
  if (isMobileDevFixtureSession()) return createDevShareApplication(input)
  return createMobileTrpcClient().mobile.member.shares.createApplication.mutate(
    input
  )
}

export async function cancelMemberShareApplication(applicationId: string) {
  if (isMobileDevFixtureSession())
    return cancelDevShareApplication(applicationId)
  return createMobileTrpcClient().mobile.member.shares.cancelApplication.mutate(
    { applicationId }
  )
}
