import { onlineManager } from "@tanstack/react-query"
import { useSyncExternalStore } from "react"

/** React Query's online flag, kept current by MobileRuntimeProvider (NetInfo). */
export function useIsOnline() {
  return useSyncExternalStore(
    onlineManager.subscribe.bind(onlineManager),
    () => onlineManager.isOnline(),
    () => true
  )
}
