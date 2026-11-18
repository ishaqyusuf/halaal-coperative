import { useAppLockGateState } from "@/features/app-lock/public/app-lock-state"
import { useAuthContext } from "@/hooks/use-auth"
import { isMockSessionToken, type MobileProfile } from "@/lib/session-store"
import { useMobileAppAccess } from "@/runtime/mobile-app-access-provider"
import { type Href, usePathname, useRouter } from "expo-router"
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { AppState } from "react-native"

import { AddCooperativeShortcutSheet } from "../components/add-cooperative-shortcut-sheet"
import {
  SHORTCUT_PATH_SEGMENT,
  shortcutRoutePath,
} from "../model/shortcut-intent"
import {
  shouldOfferCooperativeShortcut,
  type ShortcutSupport,
} from "../model/shortcut-policy"
import {
  emptyShortcutRegistry,
  findShortcutAssociation,
  findShortcutById,
  type ShortcutAssociation,
  type ShortcutRegistry,
} from "../model/shortcut-state"
import {
  cooperativeShortcutNative,
  getShortcutAppIdentity,
  readShortcutSupport,
} from "./cooperative-shortcut-platform"
import { cooperativeShortcutService } from "./cooperative-shortcut-instance"
import type {
  ShortcutContext,
  ShortcutRequestOutcome,
} from "./cooperative-shortcut-service"

const OFFER_DELAY_MS = 1500
const identity = getShortcutAppIdentity()

/** The cooperative a signed-out shortcut tap is waiting to open. */
export type PendingShortcutCooperative = {
  mark: string
  name: string
  tenantId: string
}

type CooperativeShortcutRuntimeValue = {
  association: ShortcutAssociation | null
  clearPendingLaunch: () => void
  disableCurrent: () => Promise<void>
  pending: boolean
  pendingCooperative: PendingShortcutCooperative | null
  rememberPendingLaunch: (shortcutId: string) => void
  refreshCurrent: () => Promise<boolean>
  registry: ShortcutRegistry | null
  requestCurrent: () => Promise<ShortcutRequestOutcome>
  support: ShortcutSupport
  variant: string
}

const CooperativeShortcutRuntimeContext =
  createContext<CooperativeShortcutRuntimeValue | null>(null)

function shortcutContext(profile: MobileProfile): ShortcutContext {
  return {
    cooperativeName: profile.tenant.name,
    mark: profile.tenant.branding.mark,
    tenantId: profile.tenant.id,
    userId: profile.user.id,
  }
}

/**
 * Single owner of launcher shortcut state: reconciles native pins (sign-in
 * and sign-out leave them alone), brands the sign-in for a signed-out tap,
 * resumes that launch after ordinary sign-in/unlock, and shows the optional
 * one-time offer after normal entry gates.
 */
export function CooperativeShortcutRuntimeProvider({
  children,
}: {
  children: ReactNode
}) {
  const auth = useAuthContext()
  const access = useMobileAppAccess()
  const lock = useAppLockGateState()
  const router = useRouter()
  const pathname = usePathname()
  const [support, setSupport] = useState<ShortcutSupport>("checking")
  const [registry, setRegistry] = useState<ShortcutRegistry | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [offerOpenFor, setOfferOpenFor] = useState<string | null>(null)
  const [offerDismissed, setOfferDismissed] = useState<string | null>(null)
  const reconcileRef = useRef<Promise<void>>(Promise.resolve())
  const profile = auth.profile
  const ownerKey = profile
    ? `${profile.user.id}:${profile.tenant.id}:${profile.activeMembershipId}`
    : null

  const reconcileKey = profile ? profile.tenant.id : null

  const reconcile = useCallback(() => {
    if (auth.initializing) return reconcileRef.current
    // The signed-in cooperative may adopt its own legacy tile.
    const owner = profile
      ? {
          cooperativeName: profile.tenant.name,
          mark: profile.tenant.branding.mark,
          tenantId: profile.tenant.id,
        }
      : null
    const run = reconcileRef.current.then(async () => {
      try {
        setRegistry(await cooperativeShortcutService.reconcile(owner))
      } catch {
        // Unreadable storage fails closed: no association can be resolved.
        setRegistry(emptyShortcutRegistry())
      }
    })
    reconcileRef.current = run
    return run
    // reconcileKey captures every profile field the owner uses.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.initializing, reconcileKey])

  useEffect(() => {
    void readShortcutSupport().then(setSupport)
    void reconcile()
  }, [reconcile])

  useEffect(() => {
    const appState = AppState.addEventListener("change", (next) => {
      if (next !== "active") return
      void readShortcutSupport().then(setSupport)
      void reconcile()
    })
    const pinObserved = cooperativeShortcutNative?.addListener(
      "onPinObserved",
      () => void reconcile()
    )
    return () => {
      appState.remove()
      pinObserved?.remove()
    }
  }, [reconcile])

  // Resume a launch that arrived while signed out, only once ordinary
  // authentication, app lock and cooperative access checks have settled.
  useEffect(() => {
    if (!profile || auth.initializing || access.checking) return
    if (!lock.isHydrated || lock.isLocked) return
    if (pathname.startsWith(`/${SHORTCUT_PATH_SEGMENT}/`)) return
    const shortcutId = cooperativeShortcutService.pending.take()
    setPendingId(null)
    if (shortcutId) router.replace(shortcutRoutePath(shortcutId) as Href)
  }, [
    access.checking,
    auth.initializing,
    lock.isHydrated,
    lock.isLocked,
    pathname,
    profile,
    router,
  ])

  const association = useMemo(
    () =>
      profile && registry
        ? findShortcutAssociation(registry, {
            tenantId: profile.tenant.id,
            variant: identity.variant,
          })
        : null,
    [profile, registry]
  )

  const pendingCooperative = useMemo<PendingShortcutCooperative | null>(() => {
    const shortcut =
      pendingId && registry ? findShortcutById(registry, pendingId) : null
    if (
      !shortcut ||
      shortcut.variant !== identity.variant ||
      shortcut.status === "disabled"
    ) {
      return null
    }
    return {
      mark: shortcut.mark,
      name: shortcut.label,
      tenantId: shortcut.tenantId,
    }
  }, [pendingId, registry])

  const offerEligible =
    registry !== null &&
    offerDismissed !== ownerKey &&
    shouldOfferCooperativeShortcut({
      accessAllowed: access.accessAllowed,
      locked: !lock.isHydrated || lock.isLocked,
      mockSession: isMockSessionToken(profile?.token),
      pathname,
      profile: profile
        ? {
            qaAuthorized: profile.qaAuthorized,
            tenantId: profile.tenant.id,
            userId: profile.user.id,
          }
        : null,
      registry,
      support,
      variant: identity.variant,
    })

  useEffect(() => {
    if (!offerEligible || !ownerKey) return
    const timer = setTimeout(() => setOfferOpenFor(ownerKey), OFFER_DELAY_MS)
    return () => clearTimeout(timer)
  }, [offerEligible, ownerKey])

  const requestCurrent = useCallback(async () => {
    if (!profile) return "unsupported" as const
    try {
      const result = await cooperativeShortcutService.request(
        shortcutContext(profile)
      )
      setRegistry(result.registry)
      return result.outcome
    } catch {
      return "failed" as const
    }
  }, [profile])

  const deferCurrent = useCallback(async () => {
    setOfferDismissed(ownerKey)
    setOfferOpenFor(null)
    if (!profile) return
    try {
      setRegistry(
        await cooperativeShortcutService.defer(shortcutContext(profile))
      )
    } catch {
      // The in-session dismissal still prevents a repeat prompt.
    }
  }, [ownerKey, profile])

  const value = useMemo<CooperativeShortcutRuntimeValue>(
    () => ({
      association,
      clearPendingLaunch: () => {
        cooperativeShortcutService.pending.clear()
        setPendingId(null)
      },
      disableCurrent: async () => {
        if (!profile) return
        setRegistry(
          await cooperativeShortcutService.disable(shortcutContext(profile))
        )
      },
      pending: pendingId !== null,
      pendingCooperative,
      rememberPendingLaunch: (shortcutId) => {
        cooperativeShortcutService.pending.set(shortcutId)
        setPendingId(cooperativeShortcutService.pending.peek())
      },
      refreshCurrent: async () =>
        profile
          ? cooperativeShortcutService.refresh(shortcutContext(profile))
          : false,
      registry,
      requestCurrent,
      support,
      variant: identity.variant,
    }),
    [
      association,
      pendingCooperative,
      pendingId,
      profile,
      registry,
      requestCurrent,
      support,
    ]
  )

  return (
    <CooperativeShortcutRuntimeContext.Provider value={value}>
      {children}
      {profile ? (
        <AddCooperativeShortcutSheet
          cooperativeName={profile.tenant.name}
          environment={identity.environment}
          mark={profile.tenant.branding.mark}
          onAdd={requestCurrent}
          onClose={() => {
            setOfferDismissed(ownerKey)
            setOfferOpenFor(null)
          }}
          onDismiss={deferCurrent}
          visible={ownerKey !== null && offerOpenFor === ownerKey}
        />
      ) : null}
    </CooperativeShortcutRuntimeContext.Provider>
  )
}

export function useCooperativeShortcuts() {
  const value = useContext(CooperativeShortcutRuntimeContext)
  if (!value) {
    throw new Error(
      "useCooperativeShortcuts must be used inside CooperativeShortcutRuntimeProvider"
    )
  }
  return value
}
