import { useAppLockGateState } from "@/features/app-lock/public/app-lock-state"
import { useAuthContext } from "@/hooks/use-auth"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { type Href, useRouter } from "expo-router"
import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useRef, useState } from "react"

import { fetchCooperativeWorkspaces } from "../hooks/use-cooperative-workspaces"
import {
  decideShortcutLaunch,
  resolveShortcutSwitch,
} from "../model/shortcut-policy"
import { emptyShortcutRegistry } from "../model/shortcut-state"
import { useCooperativeShortcuts } from "../platform/cooperative-shortcut-runtime-provider"
import {
  CooperativeShortcutResolverScreen,
  type ShortcutResolverState,
} from "../screens/cooperative-shortcut-resolver-screen"

/**
 * Unprotected landing for launcher shortcuts. It never decides a destination
 * itself: it waits for auth and app lock, sends a signed-out tap to that
 * cooperative's sign-in, resolves the opaque id through this phone's
 * registry, performs the ordinary signed membership switch online, and then
 * hands off to the normal entry gates.
 */
export function CooperativeShortcutRouteController({
  shortcutId,
}: {
  shortcutId: string | undefined
}) {
  const auth = useAuthContext()
  const lock = useAppLockGateState()
  const runtime = useMobileRuntime()
  const router = useRouter()
  const shortcuts = useCooperativeShortcuts()
  const queryClient = useQueryClient()
  const [state, setState] = useState<ShortcutResolverState>({
    kind: "resolving",
  })
  const [attempt, setAttempt] = useState(0)
  const handledRef = useRef<string | null>(null)
  const profile = auth.profile
  const tokenRef = useRef(profile?.token)
  tokenRef.current = profile?.token
  const online = runtime.state.connectivity !== "offline"

  const enterHome = useCallback(() => {
    router.replace("/" as Href)
  }, [router])

  const switchTo = useCallback(
    async (membershipId: string) => {
      setState({ kind: "switching" })
      try {
        await runtime.runOnlineOperation("command", () =>
          auth.switchRole(membershipId)
        )
        enterHome()
      } catch {
        setState({ kind: "failed" })
      }
    },
    [auth, enterHome, runtime]
  )

  const decision = decideShortcutLaunch({
    authInitializing: auth.initializing,
    // An unreconciled registry is treated like a lock: nothing resolves yet.
    locked:
      !lock.isHydrated ||
      lock.isLocked ||
      (profile !== null && !shortcuts.registry),
    online,
    profile: profile ? { tenantId: profile.tenant.id } : null,
    registry: shortcuts.registry ?? emptyShortcutRegistry(),
    shortcutId,
    variant: shortcuts.variant,
  })

  useEffect(() => {
    // Consume each launch once per signed context; a later tap remounts.
    const handledKey = `${decision.kind}:${shortcutId}:${profile?.token ?? ""}:${attempt}`
    if (decision.kind === "wait" || handledRef.current === handledKey) return
    handledRef.current = handledKey

    switch (decision.kind) {
      case "invalid":
      case "unknown":
      case "offline":
        setState({ kind: decision.kind })
        return
      case "sign-in":
        if (shortcutId) shortcuts.rememberPendingLaunch(shortcutId)
        router.replace("/(auth)/sign-in" as Href)
        return
      case "enter":
        enterHome()
        return
      case "switch-needed": {
        const token = profile?.token
        setState({ kind: "resolving" })
        void (async () => {
          try {
            if (!profile) return
            // Reuses a fresh cached list (T27) instead of reading it again.
            const workspaces = await fetchCooperativeWorkspaces(queryClient, profile)
            // A sign-out or another switch while loading wins.
            if (tokenRef.current !== token) return
            const next = resolveShortcutSwitch(decision.association, workspaces)
            if (next.kind === "unavailable") {
              // The shortcut still serves this cooperative's other accounts
              // on this phone, so it stays on.
              setState({
                cooperativeName: decision.association.label,
                kind: "unavailable",
              })
            } else if (next.kind === "choose-role") {
              setState({ kind: "choose-role", memberships: next.memberships })
            } else {
              await switchTo(next.membershipId)
            }
          } catch {
            setState({ kind: online ? "failed" : "offline" })
          }
        })()
      }
    }
  }, [
    attempt,
    decision,
    enterHome,
    online,
    profile,
    queryClient,
    router,
    shortcutId,
    shortcuts,
    switchTo,
  ])

  return (
    <CooperativeShortcutResolverScreen
      onChooseCooperative={() =>
        router.replace("/cooperative-shortcuts" as Href)
      }
      onChooseRole={(membershipId) => void switchTo(membershipId)}
      onContinue={enterHome}
      onRetry={() => setAttempt((value) => value + 1)}
      onUseAnotherAccount={() => {
        // Signing out re-runs this opener, which sends the tap to the
        // cooperative's own sign-in.
        if (shortcutId) shortcuts.rememberPendingLaunch(shortcutId)
        void auth.signOut()
      }}
      state={state}
    />
  )
}
