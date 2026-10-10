import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import { needsLegalReviewReminder } from "@halaalvest/domain/legal-reminder"
import {
  getAdminAccess,
  inviteAdminAccessUser,
} from "@/features/admin-reports-access/public/admin-access-api"
import { canManageMobileAdminAccess } from "@/features/admin-reports-access/public/admin-access-policy"
import type {
  AdminAccess,
  AdminAccessInviteInput,
  AdminAccessInviteResult,
} from "@/features/admin-reports-access/public/admin-access-types"
import { canManageMobileOperationProfile } from "@/features/operation-profile/public/operation-profile-policy"
import { getLegalBundle, getLegalRecords } from "@/features/legal/public/legal-read-api"
import { useAuthContext } from "@/hooks/use-auth"
import { canRoleManageSubscription } from "@/lib/mobile-subscription-policy"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { useFocusEffect, useLocalSearchParams } from "expo-router"
import { useCallback, useEffect, useState } from "react"
import { getMemberMore } from "../api/member-more-api"
import type { MobileMemberMore } from "../model/member-more-types"
import {
  presentAdminAccessForQa,
  type SettingsAccessQaState,
} from "../model/settings-access-qa"
import { MoreScreen } from "../screens/more-screen"

function formatErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback

  if (error.message.includes("tenant_admin")) {
    return "Workspace access requires Cooperative Admin."
  }

  if (error.message.toLowerCase().includes("cooperative prefix")) {
    return "Configure this cooperative's 3–5 letter prefix on the web before inviting mobile users."
  }

  return fallback
}

function getQaState(value: string | string[] | undefined) {
  if (!__DEV__ || typeof value !== "string") return null
  return [
    "denied",
    "empty",
    "error",
    "invite-failed",
    "loading",
    "missing-prefix",
    "offline",
    "stale",
  ].includes(value)
    ? (value as SettingsAccessQaState)
    : null
}

export function MoreRouteController() {
  const { profile, signInAs, signOut, switchRole } = useAuthContext()
  const runtime = useMobileRuntime()
  const { qaState } = useLocalSearchParams<{
    qaState?: string | string[]
  }>()
  const resolvedQaState = getQaState(qaState)
  const [adminAccess, setAdminAccess] = useState<AdminAccess | null>(null)
  const [isLoadingAdminAccess, setIsLoadingAdminAccess] = useState(false)
  const [adminAccessError, setAdminAccessError] = useState<string | null>(null)
  const [adminAccessRefreshKey, setAdminAccessRefreshKey] = useState(0)
  const [memberHub, setMemberHub] = useState<MobileMemberMore | null>(null)
  const [isLoadingMemberHub, setIsLoadingMemberHub] = useState(false)
  const [memberHubError, setMemberHubError] = useState<string | null>(null)
  const [switchingMembershipId, setSwitchingMembershipId] = useState<
    string | null
  >(null)
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const [showLegalReminder, setShowLegalReminder] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  const canUseServerMemberHub = canUseMobileFeatureData(profile, "member")
  const accountKey = profile
    ? `${profile.user.id}:${profile.tenant.id}:${profile.activeMembershipId}`
    : null
  const canUseServerAdminAccess =
    resolvedQaState !== "denied" &&
    canUseMobileFeatureData(profile, "admin") &&
    canManageMobileAdminAccess(profile?.cooperativeRole)

  useFocusEffect(
    useCallback(() => {
      let active = true
      setShowLegalReminder(false)
      if (!accountKey || runtime.state.connectivity === "offline") return

      void (async () => {
        try {
          const bundle = await getLegalBundle()
          if (!bundle.available) return
          const records = await getLegalRecords()
          if (active) {
            setShowLegalReminder(needsLegalReviewReminder(bundle, records))
          }
        } catch {
          // A reminder check must never interrupt account access.
        }
      })()

      return () => {
        active = false
      }
    }, [accountKey, runtime.state.connectivity])
  )

  useEffect(() => {
    let mounted = true

    if (!canUseServerMemberHub) {
      setMemberHub(null)
      setMemberHubError(null)
      setIsLoadingMemberHub(false)
      return
    }

    setIsLoadingMemberHub(true)
    setMemberHubError(null)

    void getMemberMore()
      .then((response) => {
        if (mounted) setMemberHub(response)
      })
      .catch(() => {
        if (mounted) setMemberHubError("Member details are unavailable.")
      })
      .finally(() => {
        if (mounted) setIsLoadingMemberHub(false)
      })

    return () => {
      mounted = false
    }
  }, [canUseServerMemberHub, profile?.token])

  useEffect(() => {
    let mounted = true

    if (!canUseServerAdminAccess) {
      setAdminAccess(null)
      setAdminAccessError(null)
      setIsLoadingAdminAccess(false)
      return
    }

    if (resolvedQaState === "error") {
      setAdminAccess(null)
      setAdminAccessError("Workspace access is unavailable.")
      setIsLoadingAdminAccess(false)
      return
    }

    if (resolvedQaState === "loading") {
      setAdminAccess(null)
      setAdminAccessError(null)
      setIsLoadingAdminAccess(true)
      return
    }

    setIsLoadingAdminAccess(true)
    setAdminAccessError(null)

    void getAdminAccess()
      .then((response) => {
        if (mounted) {
          setAdminAccess(presentAdminAccessForQa(response, resolvedQaState))
        }
      })
      .catch((error: unknown) => {
        if (mounted) {
          setAdminAccessError(
            formatErrorMessage(error, "Workspace access is unavailable.")
          )
        }
      })
      .finally(() => {
        if (mounted) setIsLoadingAdminAccess(false)
      })

    return () => {
      mounted = false
    }
  }, [
    adminAccessRefreshKey,
    canUseServerAdminAccess,
    profile?.token,
    resolvedQaState,
  ])

  async function inviteUser(
    input: AdminAccessInviteInput
  ): Promise<
    | { message: string; result: null }
    | { message: null; result: AdminAccessInviteResult }
  > {
    if (isInviting) {
      return {
        message: "Workspace invitation is already in progress.",
        result: null,
      }
    }

    if (resolvedQaState === "missing-prefix") {
      return {
        message:
          "Configure this cooperative's 3–5 letter prefix on the web before inviting mobile users.",
        result: null,
      }
    }

    if (resolvedQaState === "invite-failed") {
      return {
        message: null,
        result: {
          cooperativeNumber: "ABC-0123",
          deliveryStatus: "failed",
          email: input.email,
          fullName: input.fullName,
          id: "ticket-09-invite-failed",
          role: input.role,
          setupUrl: "",
          status: "invited",
        },
      }
    }

    setIsInviting(true)
    setAdminAccessError(null)

    try {
      const result = await runtime.runOnlineOperation("command", () =>
        inviteAdminAccessUser(input)
      )
      setAdminAccess(await getAdminAccess())
      return { message: null, result }
    } catch (error) {
      return {
        message: formatErrorMessage(
          error,
          "Workspace invitation could not be saved."
        ),
        result: null,
      }
    } finally {
      setIsInviting(false)
    }
  }

  async function switchWorkspace(membershipId: string) {
    setWorkspaceError(null)
    setSwitchingMembershipId(membershipId)

    try {
      await runtime.runOnlineOperation("command", () =>
        switchRole(membershipId)
      )
    } catch {
      setWorkspaceError("Workspace switch failed.")
    } finally {
      setSwitchingMembershipId(null)
    }
  }

  async function handleSignOut() {
    if (isSigningOut) return
    setIsSigningOut(true)
    setSignOutError(null)

    try {
      await signOut()
    } catch {
      setSignOutError("Sign out could not be completed. Try again.")
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <MoreScreen
      adminAccess={adminAccess}
      adminAccessError={adminAccessError}
      canManageOperationProfile={canManageMobileOperationProfile(
        profile?.cooperativeRole
      )}
      canManageSubscription={canRoleManageSubscription(
        profile?.cooperativeRole
      )}
      canUseServerAdminAccess={canUseServerAdminAccess}
      canUseServerMemberHub={canUseServerMemberHub}
      isInviting={isInviting}
      isLoadingAdminAccess={isLoadingAdminAccess}
      isLoadingMemberHub={isLoadingMemberHub}
      isSigningOut={isSigningOut}
      memberHub={memberHub}
      memberHubError={memberHubError}
      onInviteUser={inviteUser}
      onOpenAdminFixture={() => void signInAs("admin")}
      onRefreshAdminAccess={() =>
        setAdminAccessRefreshKey((value) => value + 1)
      }
      onSignOut={() => void handleSignOut()}
      onSwitchWorkspace={(membershipId) => void switchWorkspace(membershipId)}
      profile={profile}
      qaState={resolvedQaState}
      signOutError={signOutError}
      showLegalReminder={showLegalReminder}
      switchingMembershipId={switchingMembershipId}
      workspaceError={workspaceError}
    />
  )
}
