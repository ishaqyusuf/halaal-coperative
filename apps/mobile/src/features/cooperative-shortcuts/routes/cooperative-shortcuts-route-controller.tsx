import { useAuthContext } from "@/hooks/use-auth"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { type Href, useRouter } from "expo-router"
import { useCallback, useEffect, useState } from "react"
import { Platform } from "react-native"

import { getCooperativeWorkspaces } from "../api/cooperative-workspaces-api"
import {
  type CooperativeWorkspace,
  describeShortcutState,
  type ShortcutPresentation,
} from "../model/shortcut-policy"
import { getShortcutAppIdentity } from "../platform/cooperative-shortcut-platform"
import { useCooperativeShortcuts } from "../platform/cooperative-shortcut-runtime-provider"
import type { ShortcutRequestOutcome } from "../platform/cooperative-shortcut-service"
import { CooperativeShortcutsScreen } from "../screens/cooperative-shortcuts-screen"

const identity = getShortcutAppIdentity()

const REQUEST_MESSAGES: Record<ShortcutRequestOutcome, string> = {
  already_pinned: "This cooperative is already on your home screen.",
  busy: "A request is already waiting on your launcher.",
  failed: "The shortcut could not be requested. Try again.",
  rejected: "Your launcher did not accept the request.",
  requested: "Confirm on your launcher.",
  unsupported: "This launcher does not accept cooperative shortcuts.",
}

export function CooperativeShortcutsRouteController() {
  const auth = useAuthContext()
  const runtime = useMobileRuntime()
  const router = useRouter()
  const shortcuts = useCooperativeShortcuts()
  const profile = auth.profile
  const [workspaces, setWorkspaces] = useState<CooperativeWorkspace[] | null>(
    null
  )
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [switchingMembershipId, setSwitchingMembershipId] = useState<
    string | null
  >(null)
  const [switchError, setSwitchError] = useState<string | null>(null)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const offline = runtime.state.connectivity === "offline"
  const associationStatus = shortcuts.association?.status

  // A launcher callback can change the pin state after an action finished
  // (for example "Confirm on your launcher" → pinned). The presentation
  // restates every status, so drop the stale action message.
  useEffect(() => {
    setMessage(null)
  }, [associationStatus])

  useEffect(() => {
    let active = true
    setWorkspaces(null)
    setLoadError(null)
    if (!profile) return
    if (offline) {
      setLoadError("Connect to the internet to see all your cooperatives.")
      return
    }
    setLoading(true)
    void getCooperativeWorkspaces(profile)
      .then((next) => {
        if (active) setWorkspaces(next)
      })
      .catch(() => {
        if (active) setLoadError("Your cooperatives could not be loaded.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
    // Reload for a new signed context, connectivity change or explicit retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offline, profile?.token, reloadKey])

  const handleSwitch = useCallback(
    async (membershipId: string) => {
      if (switchingMembershipId) return
      setSwitchError(null)
      setSwitchingMembershipId(membershipId)
      try {
        await runtime.runOnlineOperation("command", () =>
          auth.switchRole(membershipId)
        )
        router.replace("/" as Href)
      } catch {
        setSwitchError("The cooperative could not be opened. Try again.")
      } finally {
        setSwitchingMembershipId(null)
      }
    },
    [auth, router, runtime, switchingMembershipId]
  )

  const handleAction = useCallback(
    async (action: ShortcutPresentation["actions"][number]) => {
      if (busyAction) return
      setBusyAction(action)
      setMessage(null)
      try {
        if (action === "add" || action === "retry") {
          setMessage(REQUEST_MESSAGES[await shortcuts.requestCurrent()])
        } else if (action === "refresh") {
          setMessage(
            (await shortcuts.refreshCurrent())
              ? "Icon refresh requested. Your launcher may take a moment to redraw it."
              : "The icon could not be refreshed right now."
          )
        } else {
          await shortcuts.disableCurrent()
          setMessage(
            "Shortcut disabled. You can remove its tile from your launcher."
          )
        }
      } catch {
        setMessage("That didn't work. Try again.")
      } finally {
        setBusyAction(null)
      }
    },
    [busyAction, shortcuts]
  )

  const isAndroid = Platform.OS === "android"

  return (
    <CooperativeShortcutsScreen
      activeMembershipId={profile?.activeMembershipId ?? null}
      busyAction={busyAction}
      current={
        profile
          ? { mark: profile.tenant.branding.mark, name: profile.tenant.name }
          : null
      }
      environment={identity.environment}
      loadError={loadError}
      loading={loading}
      message={message}
      onAction={(action) => void handleAction(action)}
      onBack={() =>
        router.canGoBack() ? router.back() : router.replace("/" as Href)
      }
      onRetryLoad={() => setReloadKey((value) => value + 1)}
      onSwitch={(membershipId) => void handleSwitch(membershipId)}
      shortcut={
        isAndroid
          ? describeShortcutState({
              association: shortcuts.association,
              support: shortcuts.support,
            })
          : null
      }
      switchError={switchError}
      switchingMembershipId={switchingMembershipId}
      workspaces={workspaces}
    />
  )
}
