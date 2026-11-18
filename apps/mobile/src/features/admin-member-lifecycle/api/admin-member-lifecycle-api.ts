import {
  createDevAdminMember,
  getDevAdminMemberDetail,
  getDevAdminMembers,
  getDevAdminOverview,
  reviewDevOnboarding,
  updateDevAdminMemberKyc,
  updateDevAdminMemberStatus,
} from "@/dev/mobile-dev-fixtures"
import { isMobileDevFixtureSession } from "@/dev/mobile-dev-session"
import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import { isPersistableReadInput, readCachedMobileQuery } from "@/lib/read-cache"
import type {
  MobileAdminActionResult,
  MobileAdminMemberCreateInput,
  MobileAdminMemberDetail,
  MobileAdminMemberDirectoryPage,
  MobileAdminMemberDirectorySummary,
  MobileAdminMemberKycUpdateInput,
  MobileAdminMemberOnboardingReviewInput,
  MobileAdminMemberRow,
  MobileAdminMembersListInput,
  MobileAdminMemberStatusUpdateInput,
  MobileAdminOverview,
} from "../model/admin-member-lifecycle-types"

export async function getAdminLifecycleOverview() {
  if (isMobileDevFixtureSession()) return getDevAdminOverview()
  const client = createMobileTrpcClient()
  return readCachedMobileQuery("admin.lifecycle.overview", () =>
    client.mobile.admin.overview.query()
  ) as Promise<MobileAdminOverview>
}

export async function getAdminMemberDirectory(
  input: MobileAdminMembersListInput
): Promise<MobileAdminMemberDirectoryPage> {
  if (isMobileDevFixtureSession()) {
    const { members, ...directory } = getDevAdminMembers(input)
    const page = input.page ?? 1
    const pageSize = input.pageSize ?? 20
    return {
      ...directory,
      members: members.slice((page - 1) * pageSize, page * pageSize),
    }
  }
  const client = createMobileTrpcClient()
  return readCachedMobileQuery(
    `admin.member-directory-page.${JSON.stringify(input)}`,
    () => client.mobile.admin.members.list.query({ ...input, compact: true }),
    { persist: isPersistableReadInput(input) && !input.needsReview }
  )
}

export async function getAdminMemberDirectorySummary(): Promise<MobileAdminMemberDirectorySummary> {
  if (isMobileDevFixtureSession()) {
    const directory = getDevAdminMembers()
    const countStatus = (status: string) =>
      directory.members.filter((member) => member.status === status).length
    const countKyc = (status: string) =>
      directory.members.filter((member) => member.kycStatus === status).length
    return {
      ...directory,
      statusCounts: {
        active: countStatus("active"),
        exited: countStatus("exited"),
        inactive: countStatus("inactive"),
        pending: countStatus("pending"),
        suspended: countStatus("suspended"),
      },
      kycCounts: {
        not_started: countKyc("not_started"),
        pending: countKyc("pending"),
        rejected: countKyc("rejected"),
        verified: countKyc("verified"),
      },
    }
  }
  const client = createMobileTrpcClient()
  return readCachedMobileQuery("admin.member-directory-summary", () =>
    client.mobile.admin.members.summary.query()
  )
}

export async function getAdminMemberDetail(memberId: string) {
  if (isMobileDevFixtureSession()) return getDevAdminMemberDetail(memberId)
  const client = createMobileTrpcClient()
  return readCachedMobileQuery(`admin.member-profile.${memberId}`, () =>
    client.mobile.admin.members.detail.query({ compact: true, memberId })
  ) as Promise<MobileAdminMemberDetail>
}

export async function createAdminMemberProfile(
  input: MobileAdminMemberCreateInput
) {
  if (isMobileDevFixtureSession()) return createDevAdminMember(input)
  const client = createMobileTrpcClient()
  return client.mobile.admin.members.create.mutate(
    input
  ) as Promise<MobileAdminMemberRow>
}

export async function changeAdminMemberStatus(
  input: MobileAdminMemberStatusUpdateInput
) {
  if (isMobileDevFixtureSession()) return updateDevAdminMemberStatus(input)
  const client = createMobileTrpcClient()
  return client.mobile.admin.members.updateStatus.mutate(
    input
  ) as Promise<MobileAdminActionResult>
}

export async function reviewAdminMemberKyc(
  input: MobileAdminMemberKycUpdateInput
) {
  if (isMobileDevFixtureSession()) return updateDevAdminMemberKyc(input)
  const client = createMobileTrpcClient()
  return client.mobile.admin.members.updateKyc.mutate(input)
}

export async function decideAdminMemberOnboarding(
  input: MobileAdminMemberOnboardingReviewInput
) {
  if (isMobileDevFixtureSession()) return reviewDevOnboarding(input)
  const client = createMobileTrpcClient()
  return client.mobile.admin.members.reviewOnboarding.mutate(
    input
  ) as Promise<MobileAdminActionResult>
}
