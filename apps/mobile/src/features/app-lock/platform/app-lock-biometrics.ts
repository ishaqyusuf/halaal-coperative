import {
  APP_LOCK_UNAVAILABLE_BIOMETRICS_STATUS,
  deriveAppLockBiometricsStatus,
} from "@/features/app-lock/model/app-lock-biometrics-model"
import * as LocalAuthentication from "expo-local-authentication"

export type { AppLockBiometricsStatus } from "@/features/app-lock/model/app-lock-biometrics-model"

export async function readAppLockBiometricsStatus() {
  try {
    const [hasHardware, isEnrolled, securityLevel, supportedTypes] =
      await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        LocalAuthentication.getEnrolledLevelAsync(),
        LocalAuthentication.supportedAuthenticationTypesAsync(),
      ])

    return deriveAppLockBiometricsStatus({
      hasHardware,
      isEnrolled,
      securityLevel,
      supportedTypes,
    })
  } catch {
    return APP_LOCK_UNAVAILABLE_BIOMETRICS_STATUS
  }
}

export async function authenticateAppLockBiometrics(input: {
  cooperativeName: string
  label: string
}) {
  return LocalAuthentication.authenticateAsync({
    biometricsSecurityLevel: "strong",
    cancelLabel: "Use PIN",
    disableDeviceFallback: true,
    fallbackLabel: "Use PIN",
    promptDescription: `Confirm it is you to open ${input.cooperativeName}.`,
    promptMessage: `Unlock HalaalVest with ${input.label}`,
    promptSubtitle: "App lock",
    requireConfirmation: false,
  })
}
