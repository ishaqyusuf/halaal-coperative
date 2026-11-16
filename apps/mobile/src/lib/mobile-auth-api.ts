import { type MobileAppAccessSnapshot } from "@/features/mobile-app-access/api/mobile-app-access-api"
import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import { withRequestTimeout } from "@/lib/request-timeout"
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

/** Sign-in and recovery return the new session's app-access snapshot too. */
export type MobileSignInResponse = {
  accessSnapshot?: MobileAppAccessSnapshot
  profile: MobileProfile
}

type MobileSessionResponse = {
  profile: MobileProfile
}

export async function signInWithMobileAuth(input: MobileSignInCredentials) {
  const client = createMobileTrpcClient()

  return withRequestTimeout((signal) =>
    client.auth.mobile.signIn.mutate(input, { signal })
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
  const client = createMobileTrpcClient()
  return withRequestTimeout((signal) =>
    client.auth.mobile.recovery.request.mutate(input, { signal })
  ) as Promise<{ challengeId: string; message: string; requested: true }>
}

export async function completeMobilePasswordRecovery(
  input: MobileRecoveryCompleteInput
) {
  return withRequestTimeout((signal) =>
    createMobileTrpcClient().auth.mobile.recovery.complete.mutate(input, {
      signal,
    })
  ) as Promise<MobileSignInResponse>
}
