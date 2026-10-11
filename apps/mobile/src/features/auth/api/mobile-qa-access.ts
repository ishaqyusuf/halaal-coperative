import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import {
  clearMobileQaAuthorization,
  loadMobileQaAuthorization,
  saveMobileQaAuthorization,
  type MobileQaAuthorization,
} from "@/lib/mobile-qa-authorization-store"
import { getMobileDeviceMetadata } from "@/platform/mobile-device-metadata"

export type { MobileQaAuthorization } from "@/lib/mobile-qa-authorization-store"

export type MobileQaProfile = {
  cooperativeName: string
  eligible: boolean
  identityLabel: string
  memberCode: string | null
  role: string
  selectionRef: string
}

function clientId() {
  return getMobileDeviceMetadata().deviceId
}

export async function getMobileQaCapability() {
  return createMobileTrpcClient().qaAccelerator.capability.query({
    clientKind: "mobile",
    contractVersion: 1,
  })
}

export { clearMobileQaAuthorization, loadMobileQaAuthorization }

export async function authorizeMobileQa(input: { qaDomain: string }) {
  const authorization =
    await createMobileTrpcClient().qaAccelerator.authorize.mutate({
      ...input,
      clientId: clientId(),
      clientKind: "mobile",
      contractVersion: 1,
    })
  await saveMobileQaAuthorization(authorization)
  return authorization
}

export async function listMobileQaProfiles(
  authorization: MobileQaAuthorization
) {
  return createMobileTrpcClient().qaAccelerator.profiles.query({
    authorizationToken: authorization.authorizationToken,
    clientId: clientId(),
    clientKind: "mobile",
    contractVersion: 1,
  })
}

export async function enterMobileQaProfile(input: {
  authorization: MobileQaAuthorization
  selectionRef: string
}) {
  return createMobileTrpcClient().qaAccelerator.enterProfile.mutate({
    authorizationToken: input.authorization.authorizationToken,
    clientId: clientId(),
    clientKind: "mobile",
    contractVersion: 1,
    selectionRef: input.selectionRef,
  })
}
