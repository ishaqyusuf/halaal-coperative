import type { MobileProfile, MobileRole } from "@/lib/session-store"
import { getToken, isMockSessionToken } from "@/lib/session-store"
import Constants from "expo-constants"

const appVariant = String(
  Constants.expoConfig?.extra?.appVariant ?? ""
).toLowerCase()

export const isMobileDevelopmentBuild =
  process.env.NODE_ENV !== "production" ||
  appVariant === "local" ||
  appVariant === "development" ||
  appVariant === "dev"

export const isMobileQaClientBuild =
  isMobileDevelopmentBuild ||
  appVariant === "preview" ||
  Constants.expoConfig?.extra?.qaAcceleratorClient === true

export function isMobileDevFixtureSession(
  token: string | null | undefined = getToken()
) {
  return isMobileDevelopmentBuild && isMockSessionToken(token)
}

export function canUseMobileFeatureData(
  profile: MobileProfile | null | undefined,
  role: MobileRole
) {
  if (!profile?.token || profile.role !== role) return false

  return !isMockSessionToken(profile.token) || isMobileDevelopmentBuild
}
