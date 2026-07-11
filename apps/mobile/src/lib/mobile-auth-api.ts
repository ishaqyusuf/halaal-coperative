import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import { type MobileProfile } from "@/lib/session-store"

export type MobileSignInCredentials = {
  email: string
  password: string
  tenantSlug: string
}

export type MobileSwitchRoleInput = {
  membershipId: string
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
