/** The one verification code every code flow accepts in a development profile. */
export const DEVELOPMENT_FIXED_CODE = "123456"

export type DevelopmentCodeEnvironment = {
  APP_ENV?: string
  NODE_ENV?: string
  VERCEL_ENV?: string
}

const developmentProfiles = ["local", "development", "test"]

/**
 * Fixed verification codes are allowed only in explicitly named development
 * profiles, matching EwaTrade's `shouldUseFixedMobileOwnerOtp`. Preview,
 * staging, an unset profile and any production signal keep random codes.
 */
export function shouldUseFixedDevelopmentCode(env: DevelopmentCodeEnvironment) {
  return (
    env.NODE_ENV !== "production" &&
    env.VERCEL_ENV?.trim().toLowerCase() !== "production" &&
    developmentProfiles.includes(env.APP_ENV ?? "")
  )
}
