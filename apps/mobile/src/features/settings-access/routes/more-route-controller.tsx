import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import { canManageMobileAdminAccess } from "@/features/admin-reports-access/public/admin-access-policy"
import { useLegalReminder } from "@/features/legal/public/legal-read-api"
import { useAppQuery } from "@/hooks/use-app-query"
import { useAuthContext } from "@/hooks/use-auth"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { useLocalSearchParams } from "expo-router"
import { useRef, useState } from "react"
import { getMemberMore } from "../api/member-more-api"
import {
  getWorkspaceAccessCount,
  settingsAccessKey,
} from "../api/workspace-access-api"
import { getSettingsAccessQaState } from "../model/settings-access-qa"
import { MoreScreen } from "../screens/more-screen"

export function MoreRouteController() {
  const { profile, signInAs, signOut, switchRole } = useAuthContext()
  const runtime = useMobileRuntime()
  const { qaState } = useLocalSearchParams<{ qaState?: string }>()
  const qa = getSettingsAccessQaState(qaState)
  const [switchingMembershipId, setSwitchingMembershipId] = useState<
    string | null
  >(null)
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const signingOut = useRef(false)
  const offline = qa === "offline" || runtime.state.connectivity === "offline"
  const accountKey = profile
    ? `${profile.user.id}:${profile.tenant.id}:${profile.activeMembershipId}`
    : null
  const canManageAccess =
    qa !== "denied" &&
    canUseMobileFeatureData(profile, "admin") &&
    canManageMobileAdminAccess(profile?.cooperativeRole)

  const showLegalReminder = useLegalReminder({ accountKey, enabled: !offline })
  const member = useAppQuery({
    enabled: canUseMobileFeatureData(profile, "member"),
    networkMode: "always",
    placeholderData: undefined,
    queryFn: getMemberMore,
    queryKey: settingsAccessKey(accountKey, "member"),
  })
  const access = useAppQuery({
    enabled: canManageAccess && qa !== "loading" && qa !== "error",
    networkMode: "always",
    placeholderData: undefined,
    queryFn: getWorkspaceAccessCount,
    queryKey: settingsAccessKey(accountKey, "count"),
  })

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
    if (signingOut.current) return
    signingOut.current = true
    setIsSigningOut(true)
    setSignOutError(null)
    try {
      if (qa === "signout-error") throw new Error("Simulated sign-out failure")
      await signOut()
    } catch {
      setSignOutError("Sign out could not be completed. Try again.")
    } finally {
      signingOut.current = false
      setIsSigningOut(false)
    }
  }

  if (!profile) return null
  return (
    <MoreScreen
      key={`${accountKey}:${qa ?? ""}`}
      accessCount={qa === "empty" ? 0 : access.data?.workspaceUsers}
      accessError={qa === "error" || access.isError}
      canManageAccess={canManageAccess}
      isSigningOut={isSigningOut}
      member={member.data}
      memberError={member.isError}
      memberLoading={member.isLoading}
      offline={offline}
      onOpenAdminFixture={() => void signInAs("admin")}
      onRefresh={() => {
        if (offline) return
        if (profile.role === "member") void member.refetch()
        if (canManageAccess) void access.refetch()
      }}
      onSignOut={() => void handleSignOut()}
      onSwitchWorkspace={(membershipId) => void switchWorkspace(membershipId)}
      profile={profile}
      qa={qa}
      refreshing={member.isRefetching || access.isRefetching}
      showLegalReminder={showLegalReminder}
      signOutError={signOutError}
      switchingMembershipId={switchingMembershipId}
      workspaceError={workspaceError}
    />
  )
}
