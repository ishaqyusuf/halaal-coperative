import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import { type MobileProfile } from "@/lib/session-store"

export type MobileSignInCredentials = {
  // API field name remains stable; the product-facing label is Cooperative number.
  cooperativeAccessCode: string
  password: string
}

export type MobileSwitchRoleInput = {
  membershipId: string
}

export type MobileRecoveryRequestInput = {
  cooperativeNumber: string
  deviceId: string
  email: string
}

export type MobileRecoveryCompleteInput = {
  challengeId: string
  code: string
  cooperativeNumber: string
  deviceId: string
  password: string
}

type MobileSignInResponse = {
  profile: MobileProfile
}

type MobileSessionResponse = {
  profile: MobileProfile
}

export async function signInWithMobileAuth(input: MobileSignInCredentials) {
  const client = createMobileTrpcClient()

  return client.auth.mobile.signIn.mutate(
    input
  ) as Promise<MobileSignInResponse>
}

export async function getCurrentMobileProfile() {
  const client = createMobileTrpcClient()

  return client.auth.mobile.me.query() as Promise<MobileSessionResponse>
}

export async function switchMobileRole(input: MobileSwitchRoleInput) {
  const client = createMobileTrpcClient()

  return client.auth.mobile.switchRole.mutate(
    input
  ) as Promise<MobileSessionResponse>
}

export async function signOutMobileAuth() {
  const client = createMobileTrpcClient()

  return client.auth.mobile.signOut.mutate()
}

export async function requestMobilePasswordRecovery(
  input: MobileRecoveryRequestInput
) {
  return createMobileTrpcClient().auth.mobile.recovery.request.mutate(input)
}

export async function completeMobilePasswordRecovery(
  input: MobileRecoveryCompleteInput
) {
  return createMobileTrpcClient().auth.mobile.recovery.complete.mutate(input)
}
