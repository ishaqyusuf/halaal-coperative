import { isMobileDevFixtureSession } from "@/dev/mobile-dev-session"
import {
  createDevSupportCase,
  getDevMemberSupport,
  replyDevSupportCase,
} from "@/dev/mobile-dev-fixtures"
import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import { readCachedMobileQuery } from "@/lib/read-cache"
import type {
  MobileMemberSupport,
  MobileSupportCase,
  MobileSupportCreateInput,
} from "../model/member-support-types"

function enrichCase(value: unknown): MobileSupportCase {
  const supportCase = value as MobileSupportCase
  return {
    ...supportCase,
    financialAdjustmentApprovalNotes:
      supportCase.financialAdjustmentApprovalNotes ?? null,
    linkedRecordId: supportCase.linkedRecordId ?? null,
    linkedRecordType: supportCase.linkedRecordType ?? null,
    moneyImpactRequested:
      supportCase.moneyImpactRequested ??
      supportCase.requiresFinancialAdjustment,
    resolutionSummary: supportCase.resolutionSummary ?? null,
  }
}

export async function getMemberSupport(
  cursor?: string | null
): Promise<MobileMemberSupport> {
  if (isMobileDevFixtureSession()) {
    return readCachedMobileQuery(
      `member.support.${cursor ?? "first"}`,
      async () => {
        const snapshot = getDevMemberSupport()
        return {
          ...snapshot,
          canCreateCase: true,
          cases: snapshot.cases.map(enrichCase),
          nextCursor: null,
          state: "available" as const,
        }
      }
    ) as Promise<MobileMemberSupport>
  }
  const client = createMobileTrpcClient()
  return readCachedMobileQuery(`member.support.${cursor ?? "first"}`, () =>
    client.mobile.member.support.list.query(cursor ? { cursor } : undefined)
  ) as Promise<MobileMemberSupport>
}

export async function getMemberSupportDetail(
  supportCaseId: string
): Promise<MobileSupportCase> {
  if (isMobileDevFixtureSession()) {
    const supportCase = getDevMemberSupport().cases.find(
      (item) => item.id === supportCaseId
    )
    if (!supportCase) throw new Error("Support case was not found.")
    return enrichCase(supportCase)
  }
  const client = createMobileTrpcClient()
  return client.mobile.member.support.detail.query({
    supportCaseId,
  }) as Promise<MobileSupportCase>
}

export async function createMemberSupportCase(
  input: MobileSupportCreateInput
): Promise<MobileSupportCase> {
  if (isMobileDevFixtureSession()) {
    return enrichCase(createDevSupportCase(input as never))
  }
  const client = createMobileTrpcClient()
  return client.mobile.member.support.create.mutate(
    input
  ) as Promise<MobileSupportCase>
}

export async function replyMemberSupportCase(input: {
  attachmentUrl?: string
  message: string
  supportCaseId: string
}): Promise<MobileSupportCase> {
  if (isMobileDevFixtureSession()) {
    return enrichCase(replyDevSupportCase(input as never, "member"))
  }
  const client = createMobileTrpcClient()
  return client.mobile.member.support.reply.mutate(
    input
  ) as Promise<MobileSupportCase>
}
