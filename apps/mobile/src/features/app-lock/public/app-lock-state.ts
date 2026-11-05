import { useAppLockContext } from "../hooks/use-app-lock"

/** Read-only lock state for launch resolvers that must wait for unlock. */
export function useAppLockGateState() {
  const { isHydrated, isLocked } = useAppLockContext()
  return { isHydrated, isLocked }
}
