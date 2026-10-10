import { getSessionProfile } from "@/lib/session-store"
import {
  createMobilePersistenceScope,
  type MobilePersistenceScope,
} from "@/runtime/persistence-scope-key"

export { createMobilePersistenceScope } from "@/runtime/persistence-scope-key"
export type { MobilePersistenceScope } from "@/runtime/persistence-scope-key"

export function getMobilePersistenceScope(): MobilePersistenceScope | null {
  const profile = getSessionProfile()
  return profile ? createMobilePersistenceScope(profile) : null
}

export function requireMobilePersistenceScope() {
  const scope = getMobilePersistenceScope()
  if (!scope) {
    throw new Error(
      "Authenticated mobile persistence requires a session scope."
    )
  }
  return scope
}
