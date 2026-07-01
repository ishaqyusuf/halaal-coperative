"use server"

import { headers } from "next/headers"
import {
  createMemberOnboardingRequest,
  createNotificationOutboxEntryFromDraft,
  getTenantInitialMigrationState,
  getPendingMemberOnboardingForUser,
} from "@halaalvest/db"
import { createEmailDraftFromType } from "@halaalvest/notifications"
import { buildTenantDashboardUrl } from "@halaalvest/utils"
import { resolveMemberSignupGate } from "@/lib/member-signup-access"
import { verifyMemberSignupLinkToken } from "@/lib/member-signup-link-token"
import { createMemberOnboardingVerificationToken } from "@/lib/member-onboarding-token"
import { composeMemberNumber } from "@/lib/member-number"
import { hashPassword } from "@/lib/password"
import { getDashboardServerContext } from "@/lib/server-context"

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key)
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required field: ${key}`)
  }

  return value.trim()
}

const memberSignupLockedMessage =
  "Member signup is locked until this cooperative finishes its one-time historical migration and goes live."

async function requireMemberSignupOpen(tenantId: string) {
  const migrationState = await getTenantInitialMigrationState(tenantId)

  if (!migrationState.snapshot.canUseLiveFinancialWrites) {
    throw new Error(memberSignupLockedMessage)
  }
}

export async function submitMemberOnboardingAction(formData: FormData) {
  const context = await getDashboardServerContext()
  const headerStore = await headers()

  if (!context.tenant) {
    throw new Error("Member signup is only available on a cooperative host.")
  }

  await requireMemberSignupOpen(context.tenant.id)

  const fullName = getRequiredString(formData, "fullName")
  const email = getRequiredString(formData, "email").toLowerCase()
  const memberNumber = composeMemberNumber(
    context.tenant.memberNumberPrefix,
    getRequiredString(formData, "memberNumber"),
  )
  const phoneNumber = getRequiredString(formData, "phoneNumber")
  const password = getRequiredString(formData, "password")
  const confirmPassword = getRequiredString(formData, "confirmPassword")
  const signupToken = (formData.get("signupToken") as string | null)?.trim() || null

  if (password !== confirmPassword) {
    throw new Error("Passwords do not match.")
  }

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.")
  }

  const gate = await resolveMemberSignupGate({
    tenantId: context.tenant.id,
    token: signupToken,
  })

  if (gate.access !== "granted") {
    throw new Error(gate.message)
  }

  const tokenPayload =
    gate.mode === "link" && gate.token ? verifyMemberSignupLinkToken(gate.token) : null

  const created = await createMemberOnboardingRequest({
    email,
    fullName,
    memberNumber,
    passwordHash: hashPassword(password),
    phoneNumber,
    signupLinkId: tokenPayload?.linkId ?? null,
    signupLinkTokenVersion: tokenPayload?.tokenVersion ?? null,
    tenantId: context.tenant.id,
  })

  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString()
  const verificationToken = createMemberOnboardingVerificationToken({
    email,
    expiresAt,
    requestId: created.request.id,
    tenantId: context.tenant.id,
  })
  const verificationUrl = buildTenantDashboardUrl(context.tenant.slug, {
    currentOrigin: headerStore.get("origin") ?? undefined,
    pathname: `/signup/members/verify?token=${encodeURIComponent(verificationToken)}`,
    tenantHostname: headerStore.get("x-tenant-hostname"),
  })

  const verificationDraft = createEmailDraftFromType(
    "member.onboarding_verification_requested",
    {
      expiresAt,
      recipientEmail: email,
      recipientName: fullName,
      requestId: created.request.id,
      tenantName: context.tenant.name,
      verificationUrl,
    },
  )

  await createNotificationOutboxEntryFromDraft({
    draft: verificationDraft,
    metadata: {
      email,
      requestId: created.request.id,
    },
    source: "dashboard.member_signup",
    tenantId: context.tenant.id,
  })

  return {
    email,
    tenantName: context.tenant.name,
  }
}

export async function resendMemberVerificationAction() {
  const context = await getDashboardServerContext()
  const headerStore = await headers()

  if (!context.tenant || !context.auth.user) {
    throw new Error("You must be signed in to resend verification.")
  }

  await requireMemberSignupOpen(context.tenant.id)

  const request = await getPendingMemberOnboardingForUser({
    tenantId: context.tenant.id,
    userId: context.auth.user.id,
  })

  if (!request || request.status !== "pending_email_verification") {
    throw new Error("No pending email verification was found.")
  }

  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString()
  const verificationToken = createMemberOnboardingVerificationToken({
    email: request.email,
    expiresAt,
    requestId: request.id,
    tenantId: context.tenant.id,
  })
  const verificationUrl = buildTenantDashboardUrl(context.tenant.slug, {
    currentOrigin: headerStore.get("origin") ?? undefined,
    pathname: `/signup/members/verify?token=${encodeURIComponent(verificationToken)}`,
    tenantHostname: headerStore.get("x-tenant-hostname"),
  })

  const verificationDraft = createEmailDraftFromType(
    "member.onboarding_verification_requested",
    {
      expiresAt,
      recipientEmail: request.email,
      recipientName: request.fullName,
      requestId: request.id,
      tenantName: context.tenant.name,
      verificationUrl,
    },
  )

  await createNotificationOutboxEntryFromDraft({
    draft: verificationDraft,
    metadata: {
      email: request.email,
      requestId: request.id,
    },
    source: "dashboard.member_signup",
    tenantId: context.tenant.id,
  })
}
