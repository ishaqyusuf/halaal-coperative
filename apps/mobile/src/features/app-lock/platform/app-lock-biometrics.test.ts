import { describe, expect, test } from "bun:test"
import {
  APP_LOCK_AUTHENTICATION_TYPE,
  APP_LOCK_SECURITY_LEVEL,
  deriveAppLockBiometricsStatus,
} from "../model/app-lock-biometrics-model"

describe("mobile app lock biometrics", () => {
  test("reports an unenrolled device without offering biometric unlock", () => {
    const status = deriveAppLockBiometricsStatus({
      hasHardware: true,
      isEnrolled: false,
      securityLevel: APP_LOCK_SECURITY_LEVEL.NONE,
      supportedTypes: [APP_LOCK_AUTHENTICATION_TYPE.FINGERPRINT],
    })

    expect(status.isAvailable).toBe(false)
    expect(status.reason).toContain("phone settings")
  })

  test("requires strong enrolled biometrics for the financial workspace", () => {
    const weak = deriveAppLockBiometricsStatus({
      hasHardware: true,
      isEnrolled: true,
      securityLevel: APP_LOCK_SECURITY_LEVEL.BIOMETRIC_WEAK,
      supportedTypes: [APP_LOCK_AUTHENTICATION_TYPE.FACIAL_RECOGNITION],
    })
    const strong = deriveAppLockBiometricsStatus({
      hasHardware: true,
      isEnrolled: true,
      securityLevel: APP_LOCK_SECURITY_LEVEL.BIOMETRIC_STRONG,
      supportedTypes: [APP_LOCK_AUTHENTICATION_TYPE.FINGERPRINT],
    })

    expect(weak.isAvailable).toBe(false)
    expect(strong.isAvailable).toBe(true)
    expect(strong.label).toBe("Fingerprint")
  })
})
