import { useAppLockContext } from "../hooks/use-app-lock"

/** Read-only lock state for launch resolvers that must wait for unlock. */
export function useAppLockGateState() {
  const { isHydrated, isLocked } = useAppLockContext()
  return { isHydrated, isLocked }
}

/** Show the state in settings once the device’s lock has loaded. */
export function useAppLockSettingValue() {
  const { hydrationError, isConfigured, isHydrated } = useAppLockContext()
  if (!isHydrated || hydrationError) return undefined
  return isConfigured ? "On" : "Off"
}
