import { useAuthContext } from "@/hooks/use-auth"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { type Href, useRouter } from "expo-router"
import { useCallback, useEffect, useState } from "react"
import { Platform } from "react-native"

import { useCooperativeWorkspaces } from "../hooks/use-cooperative-workspaces"
import {
  describeShortcutState,
  formatMembershipRole,
  type ShortcutPresentation,
} from "../model/shortcut-policy"
import { shortcutPill } from "../model/shortcut-presentation"
import { useCooperativeShortcuts } from "../platform/cooperative-shortcut-runtime-provider"
import type { ShortcutRequestOutcome } from "../platform/cooperative-shortcut-service"
import { CooperativeShortcutsScreen } from "../screens/cooperative-shortcuts-screen"

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
  const [switchingMembershipId, setSwitchingMembershipId] = useState<
    string | null
  >(null)
  const [switchError, setSwitchError] = useState<string | null>(null)
  const [busyAction, setBusyAction] = useState<
    ShortcutPresentation["actions"][number] | null
  >(null)
  const [message, setMessage] = useState<string | null>(null)
  const offline = runtime.state.connectivity === "offline"
  const associationStatus = shortcuts.association?.status

  // A launcher callback can change the pin state after an action finished
  // (for example "Confirm on your launcher" → pinned). The presentation
  // restates every status, so drop the stale action message.
  useEffect(() => {
    setMessage(null)
  }, [associationStatus])

  // T27: cached on react-query (refresh on focus/reconnect, pull to refresh)
  // instead of an effect that refetched on every mount.
  const workspacesQuery = useCooperativeWorkspaces(profile, !offline)
  const workspaces = workspacesQuery.data ?? null

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

  const activeRole = profile?.availableRoles?.find(
    (role) => role.id === profile.activeMembershipId
  )
  const shortcut = isAndroid
    ? {
        ...describeShortcutState({
          association: shortcuts.association,
          support: shortcuts.support,
        }),
        checking: shortcuts.support === "checking",
        pill: shortcutPill({
          association: shortcuts.association,
          support: shortcuts.support,
        }),
      }
    : null

  return (
    <CooperativeShortcutsScreen
      activeMembershipId={profile?.activeMembershipId ?? null}
      busyAction={busyAction}
      current={
        profile
          ? {
              mark: profile.tenant.branding.mark,
              name: profile.tenant.name,
              role: activeRole ? formatMembershipRole(activeRole.role) : "",
            }
          : null
      }
      loadError={
        workspacesQuery.isError ? "Your cooperatives could not be loaded." : null
      }
      loading={workspacesQuery.isFetching}
      message={message}
      offline={offline}
      onAction={(action) => void handleAction(action)}
      onBack={() =>
        router.canGoBack() ? router.back() : router.replace("/" as Href)
      }
      onRefresh={() => void workspacesQuery.refetch()}
      onRetryLoad={() => void workspacesQuery.refetch()}
      onSwitch={(membershipId) => void handleSwitch(membershipId)}
      refreshing={workspacesQuery.isRefetching && Boolean(workspaces)}
      shortcut={shortcut}
      switchError={switchError}
      switchingMembershipId={switchingMembershipId}
      workspaces={workspaces}
    />
  )
}
