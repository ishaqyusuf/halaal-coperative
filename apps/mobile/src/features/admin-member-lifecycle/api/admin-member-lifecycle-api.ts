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
import { readCachedMobileQuery } from "@/lib/read-cache"
import type {
  MobileAdminActionResult,
  MobileAdminMemberCreateInput,
  MobileAdminMemberDetail,
  MobileAdminMemberKycUpdateInput,
  MobileAdminMemberOnboardingReviewInput,
  MobileAdminMemberRow,
  MobileAdminMembers,
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
  input?: MobileAdminMembersListInput
) {
  if (isMobileDevFixtureSession()) return getDevAdminMembers(input)
  const client = createMobileTrpcClient()
  return readCachedMobileQuery(
    `admin.member-directory.${JSON.stringify(input ?? {})}`,
    () => client.mobile.admin.members.list.query(input)
  ) as Promise<MobileAdminMembers>
}

export async function getAdminMemberDetail(memberId: string) {
  if (isMobileDevFixtureSession()) return getDevAdminMemberDetail(memberId)
  const client = createMobileTrpcClient()
  return readCachedMobileQuery(`admin.member-lifecycle.${memberId}`, () =>
    client.mobile.admin.members.detail.query({ memberId })
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
