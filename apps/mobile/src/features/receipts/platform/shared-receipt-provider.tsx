import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import { useAppLockGateState } from "@/features/app-lock/public/app-lock-state"
import { useAuthContext } from "@/hooks/use-auth"
import { useMobileAppAccess } from "@/runtime/mobile-app-access-provider"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { createMobilePersistenceScope } from "@/runtime/persistence-scope"
import { useRootNavigationState, useRouter, useSegments } from "expo-router"
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { AppState } from "react-native"
import Toast from "react-native-toast-message"
import {
  deleteSharedReceipt,
  receiptShareNative,
  type SharedReceipt,
} from "./shared-receipt-native"

type Intake = {
  receipt: SharedReceipt
  owner: string | null
  opened: boolean
}

const SharedReceiptContext = createContext<{
  receipt: SharedReceipt | null
  clear: (id: string) => void
} | null>(null)

export function SharedReceiptProvider({ children }: { children: ReactNode }) {
  const auth = useAuthContext()
  const access = useMobileAppAccess()
  const lock = useAppLockGateState()
  const router = useRouter()
  const {
    state: { lifecycle },
  } = useMobileRuntime()
  const [routeGroup] = useSegments()
  const navigationReady = Boolean(useRootNavigationState()?.key)
  const owner = auth.profile
    ? createMobilePersistenceScope(auth.profile).key
    : null
  const current = useRef<Intake | null>(null)
  const [intake, setIntake] = useState<Intake | null>(null)

  const clear = useCallback((id: string) => {
    if (current.current?.receipt.id !== id) return
    deleteSharedReceipt(current.current.receipt)
    current.current = null
    setIntake(null)
  }, [])

  useEffect(() => {
    return () => {
      if (current.current) deleteSharedReceipt(current.current.receipt)
      current.current = null
    }
  }, [])

  useEffect(() => {
    if (!receiptShareNative || auth.initializing) return
    const native = receiptShareNative
    let mounted = true
    const take = () => {
      void native
        .take()
        .then((receipt) => {
          if (!receipt) return
          if (!mounted || receipt.expiresAt <= Date.now()) {
            deleteSharedReceipt(receipt)
            return
          }
          if (current.current?.opened) {
            deleteSharedReceipt(receipt)
            Toast.show({
              text1: "Finish the open shared payment and share again.",
            })
            return
          }
          if (current.current) deleteSharedReceipt(current.current.receipt)
          const next = { receipt, owner, opened: false }
          current.current = next
          setIntake(next)
        })
        .catch(() => undefined)
    }
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") take()
    })
    const share = native.addListener("onReceiptShared", take)
    queueMicrotask(() => {
      if (mounted) take()
    })
    return () => {
      mounted = false
      share.remove()
      appState.remove()
    }
  }, [auth.initializing, owner])

  useEffect(() => {
    if (!intake || current.current !== intake) return
    if (intake.owner && owner !== intake.owner) {
      clear(intake.receipt.id)
      return
    }
    const remaining = intake.receipt.expiresAt - Date.now()
    const expire = () => {
      clear(intake.receipt.id)
      if (intake.opened) Toast.show({ text1: "Share the expired receipt again." })
    }
    if (remaining <= 0) {
      expire()
      return
    }
    const timer = setTimeout(expire, remaining)
    return () => clearTimeout(timer)
  }, [clear, intake, owner])

  useEffect(() => {
    if (
      !intake ||
      current.current !== intake ||
      intake.opened ||
      !owner ||
      !navigationReady ||
      lifecycle !== "active" ||
      !routeGroup ||
      routeGroup === "(auth)" ||
      !lock.isHydrated ||
      lock.isLocked ||
      access.checking ||
      (intake.owner && intake.owner !== owner)
    ) return
    if (auth.role === "admin") {
      clear(intake.receipt.id)
      Toast.show({ text1: "Open member mode and share the receipt again." })
      return
    }
    if (!access.accessAllowed || !canUseMobileFeatureData(auth.profile, "member")) return

    const opened = { ...intake, opened: true, owner }
    current.current = opened
    setIntake(opened)
    router.push({
      pathname: "/(member)/receipts",
      params: { sharedReceipt: intake.receipt.id },
    })
  }, [
    access.accessAllowed,
    access.checking,
    auth.profile,
    auth.role,
    clear,
    intake,
    lifecycle,
    lock.isHydrated,
    lock.isLocked,
    navigationReady,
    owner,
    routeGroup,
    router,
  ])

  const receipt = intake?.opened && intake.owner === owner ? intake.receipt : null
  return (
    <SharedReceiptContext.Provider value={{ receipt, clear }}>
      {children}
    </SharedReceiptContext.Provider>
  )
}

export function useSharedReceipt(id: string | undefined) {
  const handoff = useContext(SharedReceiptContext)
  return handoff?.receipt && handoff.receipt.id === id ? handoff : null
}
