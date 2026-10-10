import { getOrCreateMobileDeviceId } from "@/lib/session-store"
import Constants from "expo-constants"
import { Platform } from "react-native"

export function getMobileDeviceMetadata() {
  const appVariant = Constants.expoConfig?.extra?.appVariant
  return {
    appVersion:
      Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? "unknown",
    buildVariant:
      (typeof appVariant === "string" && appVariant.trim()
        ? appVariant
        : process.env.EXPO_PUBLIC_APP_VARIANT) ?? "unknown",
    deviceId: getOrCreateMobileDeviceId(),
    deviceLabel:
      Constants.deviceName?.trim() || `${Platform.OS} mobile device`,
    platform: Platform.OS,
  }
}
