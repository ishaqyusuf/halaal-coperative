import type { MobileProfile } from "@/lib/session-store"

type MobileSessionPersistence = {
  clearSession: () => Promise<void> | void
  persistProfile: (profile: MobileProfile) => Promise<void> | void
  persistToken: (token: string) => Promise<void> | void
  profile: MobileProfile
}

export async function persistMobileSessionAtomically({
  clearSession,
  persistProfile,
  persistToken,
  profile,
}: MobileSessionPersistence) {
  try {
    await persistToken(profile.token)
    await persistProfile(profile)
  } catch (error) {
    try {
      await clearSession()
    } catch {
      // Preserve the persistence failure that caused the rollback.
    }
    throw error
  }
}
