import * as ScreenCapture from "expo-screen-capture"
import { Platform } from "react-native"

const APP_LOCK_SCREEN_CAPTURE_KEY = "halaalvest-app-lock"

export async function enableAppLockPrivacy() {
  const available = await ScreenCapture.isAvailableAsync()
  if (!available) return false

  await ScreenCapture.preventScreenCaptureAsync(APP_LOCK_SCREEN_CAPTURE_KEY)
  if (Platform.OS === "ios") {
    await ScreenCapture.enableAppSwitcherProtectionAsync(0.9)
  }
  return true
}

export async function disableAppLockPrivacy() {
  await Promise.allSettled([
    ScreenCapture.allowScreenCaptureAsync(APP_LOCK_SCREEN_CAPTURE_KEY),
    Platform.OS === "ios"
      ? ScreenCapture.disableAppSwitcherProtectionAsync()
      : Promise.resolve(),
  ])
}
