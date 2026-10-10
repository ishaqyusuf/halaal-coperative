import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import {
  readCachedMobileQuery,
  type MobileReadCacheState,
} from "@/lib/read-cache"
import type {
  MemberStatementExportPayload,
  MobileMemberActivityKind,
  MobileMemberActivityPage,
  MobileMemberHome,
  MobileMemberSection,
  MobileMemberStatement,
} from "../model/member-core-types"
import { isMobileDevFixtureSession } from "@/dev/mobile-dev-session"
import {
  generateDevMemberStatement,
  getDevMemberActivityPage,
  getDevMemberHome,
  getDevMemberSection,
  getDevMemberStatement,
} from "@/dev/mobile-dev-fixtures"

export type MemberCoreCachedHome = MobileMemberHome & {
  cache: MobileReadCacheState
}

export type MemberCoreCachedSection = MobileMemberSection & {
  cache: MobileReadCacheState
}

export type MemberCoreCachedStatement = MobileMemberStatement & {
  cache: MobileReadCacheState
}

export type MemberCoreCachedActivityPage = MobileMemberActivityPage & {
  cache: MobileReadCacheState
}

export async function getMemberActivityPage(input: {
  cursor: string | null
  kind: MobileMemberActivityKind
}): Promise<MemberCoreCachedActivityPage> {
  const cacheCursor = input.cursor ?? "first"

  if (isMobileDevFixtureSession()) {
    return readCachedMobileQuery(
      `member.activity.${input.kind}.${cacheCursor}`,
      async () => getDevMemberActivityPage(input)
    )
  }

  const client = createMobileTrpcClient()

  return readCachedMobileQuery(
    `member.activity.${input.kind}.${cacheCursor}`,
    () =>
      client.mobile.member.activity.query({
        cursor: input.cursor,
        kind: input.kind,
        limit: 20,
      })
  ) as Promise<MemberCoreCachedActivityPage>
}

export async function getMemberCoreHome(): Promise<MemberCoreCachedHome> {
  if (isMobileDevFixtureSession()) {
    return readCachedMobileQuery("member.home", async () => getDevMemberHome())
  }
  const client = createMobileTrpcClient()

  return readCachedMobileQuery("member.home", () =>
    client.mobile.member.home.query()
  ) as Promise<MemberCoreCachedHome>
}

export async function getMemberCommitments(): Promise<MemberCoreCachedSection> {
  if (isMobileDevFixtureSession()) {
    return readCachedMobileQuery("member.section.commitments", async () =>
      getDevMemberSection("commitments")
    )
  }
  const client = createMobileTrpcClient()

  return readCachedMobileQuery("member.section.commitments", () =>
    client.mobile.member.commitments.query()
  ) as Promise<MemberCoreCachedSection>
}

export async function getMemberCoreStatement(): Promise<MemberCoreCachedStatement> {
  if (isMobileDevFixtureSession()) {
    return readCachedMobileQuery("member.statement", async () =>
      getDevMemberStatement()
    )
  }
  const client = createMobileTrpcClient()

  return readCachedMobileQuery("member.statement", () =>
    client.mobile.member.statement.query()
  ) as Promise<MemberCoreCachedStatement>
}

export async function generateMemberStatementExport(
  requestId: string
): Promise<MemberStatementExportPayload> {
  if (isMobileDevFixtureSession()) {
    return generateDevMemberStatement(requestId)
  }
  const client = createMobileTrpcClient()
  return client.mobile.member.statementExport.mutate({
    requestId,
  }) as Promise<MemberStatementExportPayload>
}
