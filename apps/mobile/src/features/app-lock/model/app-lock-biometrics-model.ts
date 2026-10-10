export const APP_LOCK_AUTHENTICATION_TYPE = {
  FACIAL_RECOGNITION: 2,
  FINGERPRINT: 1,
  IRIS: 3,
} as const

export const APP_LOCK_SECURITY_LEVEL = {
  BIOMETRIC_STRONG: 3,
  BIOMETRIC_WEAK: 2,
  NONE: 0,
  SECRET: 1,
} as const

export type AppLockBiometricsStatus = {
  hasHardware: boolean
  isAvailable: boolean
  isEnrolled: boolean
  label: string
  reason: string | null
  securityLevel: number
  supportedTypes: number[]
}

export const APP_LOCK_UNAVAILABLE_BIOMETRICS_STATUS: AppLockBiometricsStatus = {
  hasHardware: false,
  isAvailable: false,
  isEnrolled: false,
  label: "Biometrics",
  reason: "Biometric unlock is not available on this device.",
  securityLevel: APP_LOCK_SECURITY_LEVEL.NONE,
  supportedTypes: [],
}

function getBiometricLabel(supportedTypes: number[]) {
  if (
    supportedTypes.includes(APP_LOCK_AUTHENTICATION_TYPE.FACIAL_RECOGNITION)
  ) {
    return "Face ID"
  }
  if (supportedTypes.includes(APP_LOCK_AUTHENTICATION_TYPE.FINGERPRINT)) {
    return "Fingerprint"
  }
  if (supportedTypes.includes(APP_LOCK_AUTHENTICATION_TYPE.IRIS)) {
    return "Iris unlock"
  }
  return "Biometrics"
}

export function deriveAppLockBiometricsStatus(input: {
  hasHardware: boolean
  isEnrolled: boolean
  securityLevel: number
  supportedTypes: number[]
}): AppLockBiometricsStatus {
  const label = getBiometricLabel(input.supportedTypes)
  const isStrong =
    input.securityLevel === APP_LOCK_SECURITY_LEVEL.BIOMETRIC_STRONG
  const isAvailable = input.hasHardware && input.isEnrolled && isStrong

  return {
    ...input,
    isAvailable,
    label,
    reason: !input.hasHardware
      ? "This device does not have biometric hardware."
      : !input.isEnrolled
        ? `Set up ${label.toLowerCase()} in your phone settings to use it here.`
        : !isStrong
          ? `${label} does not meet the strong biometric requirement on this device.`
          : null,
  }
}
