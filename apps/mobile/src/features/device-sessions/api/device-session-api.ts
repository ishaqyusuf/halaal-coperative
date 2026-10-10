import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"

import type {
  MobileDeviceSession,
  MobileDeviceSessionCollection,
} from "../model/device-session-types"

export async function getOwnMobileDeviceSessions(input: {
  ownerId: string
  ownerName: string
}): Promise<MobileDeviceSessionCollection> {
  const sessions =
    (await createMobileTrpcClient().mobile.sessions.list.query()) as MobileDeviceSession[]

  return {
    owner: { fullName: input.ownerName, id: input.ownerId },
    sessions,
  }
}

export async function getManagedMobileDeviceSessions(userId: string) {
  return createMobileTrpcClient().mobile.sessions.adminList.query({
    userId,
  }) as Promise<MobileDeviceSessionCollection>
}

export async function refreshMobileDeviceSession() {
  return createMobileTrpcClient().mobile.sessions.refresh.mutate()
}

export async function revokeOwnMobileDeviceSession(sessionId: string) {
  return createMobileTrpcClient().mobile.sessions.revoke.mutate({ sessionId })
}

export async function revokeAllOwnMobileDeviceSessions() {
  return createMobileTrpcClient().mobile.sessions.revokeAll.mutate()
}

export async function revokeManagedMobileDeviceSession(input: {
  sessionId: string
  userId: string
}) {
  return createMobileTrpcClient().mobile.sessions.adminRevoke.mutate(input)
}

export async function revokeAllManagedMobileDeviceSessions(userId: string) {
  return createMobileTrpcClient().mobile.sessions.adminRevokeAll.mutate({
    userId,
  })
}
