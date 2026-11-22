import { AppSheet } from "@/components/app/app-sheet"
import { ConfirmSheet } from "@/components/app/confirm-sheet"
import { SIGN_OUT_CONFIRM_DESCRIPTION } from "@/components/app/confirmation-sheet"
import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { ReviewRow, ReviewSummary } from "@/components/app/result-screen"
import { ScreenShell } from "@/components/app/screen-shell"
import { Pressable } from "@/components/ui/pressable"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { StatusBanner } from "@/components/ui/status-banner"
import { Text } from "@/components/ui/text"
import { useAppLockSettingValue } from "@/features/app-lock/public/app-lock-state"
import { QaAccessPanel } from "@/features/auth/public/qa-access"
import { canManageMobileOperationProfile } from "@/features/operation-profile/public/operation-profile-policy"
import { useColorScheme } from "@/hooks/use-color"
import { formatMobileStatus } from "@/lib/format-mobile-status"
import type { MobileProfile } from "@/lib/session-store"
import { setThemeOverride } from "@/lib/theme-preference"
import Constants from "expo-constants"
import { type Href, useRouter } from "expo-router"
import { useState } from "react"
import { View } from "react-native"
import { MoreIdentity } from "../components/admin-more-identity"
import { GroupedRow, SettingsGroup } from "../components/grouped-settings"
import { InviteUserSheet } from "../components/invite-user-sheet"
import { MemberMoreDirectory } from "../components/member-more-directory"
import { WorkspaceRoleSection } from "../components/workspace-role-section"
import type { MobileMemberMore } from "../model/member-more-types"
import type { SettingsAccessQaState } from "../model/settings-access-qa"
import { formatWorkspaceRoleLabel } from "../presentation/workspace-role-presentation"

const appVersion =
  Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? "Unknown"

const themeOptions = [
  { icon: "Monitor", label: "System", value: "system" },
  { icon: "Sun", label: "Light", value: "light" },
  { icon: "Moon", label: "Dark", value: "dark" },
] as const

export function MoreScreen({
  accessCount,
  accessError,
  canManageAccess,
  isSigningOut,
  member,
  memberError,
  memberLoading,
  offline,
  onOpenAdminFixture,
  onRefresh,
  onSignOut,
  onSwitchWorkspace,
  profile,
  qa,
  refreshing,
  signOutError,
  switchingMembershipId,
  workspaceError,
}: {
  accessCount?: number
  accessError: boolean
  canManageAccess: boolean
  isSigningOut: boolean
  member?: MobileMemberMore
  memberError: boolean
  memberLoading: boolean
  offline: boolean
  onOpenAdminFixture: () => void
  onRefresh: () => void
  onSignOut: () => void
  onSwitchWorkspace: (membershipId: string) => void
  profile: MobileProfile
  qa: SettingsAccessQaState | null
  refreshing: boolean
  signOutError: string | null
  switchingMembershipId: string | null
  workspaceError: string | null
}) {
  const router = useRouter()
  const appLockValue = useAppLockSettingValue()
  const [sheet, setSheet] = useState<"signout" | "profile" | "invite" | null>(
    qa === "signout-error" ? "signout" : null
  )
  const { setColorScheme, themeOverride } = useColorScheme()
  const memberNumber = member?.member?.memberNumber ?? profile.member?.code
  const isMember = profile.role === "member"
  const canManageOperation = canManageMobileOperationProfile(
    profile.cooperativeRole
  )
  const go = (href: Href) => () => router.push(href)
  const close = () => setSheet(null)

  return (
    <>
      <ScreenShell
        back={false}
        compactTitle
        contentClassName="gap-[22px] pt-[8px]"
        onRefresh={offline ? undefined : onRefresh}
        refreshing={refreshing}
        testID={isMember ? "member-more" : "admin-more"}
        title="More"
      >
        {offline || member?.cache?.status === "stale" ? (
          <StatusBanner
            description={member ? "Showing saved member details." : undefined}
            kind={offline ? "offline" : "stale"}
            title={offline ? "You’re offline" : "Showing saved data"}
          />
        ) : null}
        <SettingsGroup flush title="Account">
          <MoreIdentity
            memberNumber={memberNumber}
            onPress={() => setSheet("profile")}
            profile={profile}
          />
          <GroupedRow
            icon="Home"
            onPress={go("/cooperative-shortcuts")}
            title="Cooperatives & shortcuts"
          />
          <GroupedRow
            icon="LogOut"
            onPress={go("/account-privacy")}
            title="Close my account"
            tone="neutral"
          />
        </SettingsGroup>
        <WorkspaceRoleSection
          onSwitchWorkspace={onSwitchWorkspace}
          profile={profile}
          switchingMembershipId={switchingMembershipId}
          workspaceError={workspaceError}
        />
        {isMember ? (
          <MemberMoreDirectory
            error={memberError}
            hub={member}
            loading={memberLoading}
            onRetry={onRefresh}
          />
        ) : null}
        {canManageAccess || canManageOperation ? (
          <View className="gap-[8px]">
            <SettingsGroup title="Administration">
              {canManageAccess ? (
                <GroupedRow
                  icon="UsersRound"
                  onPress={go({
                    pathname: "/workspace-access",
                    params: qa ? { qaState: qa } : {},
                  })}
                  title="Workspace access"
                  tone="sky"
                  value={
                    accessCount === undefined
                      ? accessError
                        ? "Unavailable"
                        : undefined
                      : `${accessCount} ${accessCount === 1 ? "user" : "users"}`
                  }
                />
              ) : null}
              {canManageAccess ? (
                <GroupedRow
                  disabled={offline}
                  icon="UserPlus"
                  onPress={() => setSheet("invite")}
                  primary
                  title="Invite user"
                />
              ) : null}
              {canManageOperation ? (
                <GroupedRow
                  icon="SlidersHorizontal"
                  onPress={go("/operation-profile")}
                  title="Operation profile"
                  tone="amber"
                />
              ) : null}
              {canManageOperation ? (
                <GroupedRow
                  icon="ListOrdered"
                  onPress={go("/payment-order")}
                  title="Payment order"
                  tone="sky"
                />
              ) : null}
            </SettingsGroup>
            {offline && canManageAccess ? (
              <Text className="mx-[16px] text-muted-foreground" variant="small">
                Inviting needs a connection.
              </Text>
            ) : null}
          </View>
        ) : null}
        <SettingsGroup title="App">
          <GroupedRow
            icon="LockKeyhole"
            onPress={go("/app-lock")}
            title="App lock"
            tone="neutral"
            value={appLockValue}
          />
          <GroupedRow
            icon="Smartphone"
            onPress={go("/sessions")}
            title="Device access"
            tone="sky"
          />
          <GroupedRow
            icon="Bell"
            onPress={go("/notifications")}
            title="Notifications"
            tone="danger"
          />
          <GroupedRow
            icon="RefreshCw"
            onPress={go("/updates")}
            title="App updates"
          />
          <GroupedRow
            accessibilityLabel={`About HalaalVest, version ${appVersion}`}
            icon="Info"
            onPress={go("/about")}
            title="About HalaalVest"
            tone="neutral"
            value={appVersion}
          />
        </SettingsGroup>
        <SettingsGroup title="Appearance">
          <View className="p-[8px]">
            <SegmentedControl
              accessibilityLabel="App appearance"
              onChange={(theme) => {
                setColorScheme(theme)
                void setThemeOverride(theme)
              }}
              options={themeOptions}
              value={themeOverride}
            />
          </View>
        </SettingsGroup>
        <SettingsGroup>
          <Pressable
            accessibilityRole="button"
            className="min-h-[52px] items-center justify-center active:bg-muted"
            haptic
            onPress={() => setSheet("signout")}
          >
            <Text className="font-semibold text-destructive" variant="body">
              Sign out
            </Text>
          </Pressable>
        </SettingsGroup>
        <QaAccessPanel inline />
      </ScreenShell>
      {isMember && !qa && (profile.availableRoles?.length ?? 0) < 2 ? (
        <DevQuickFill
          bottomOffset={92}
          label="Open isolated admin UI fixture"
          onPress={onOpenAdminFixture}
        />
      ) : null}
      <ConfirmSheet
        confirmLabel="Sign out"
        description={SIGN_OUT_CONFIRM_DESCRIPTION}
        error={signOutError}
        icon="LogOut"
        isConfirming={isSigningOut}
        onCancel={close}
        onConfirm={onSignOut}
        title="Sign out?"
        tone="destructive"
        visible={sheet === "signout"}
      />
      <AppSheet onClose={close} title="Profile" visible={sheet === "profile"}>
        <ReviewSummary title={profile.user.name}>
          <ReviewRow label="Cooperative" value={profile.tenant.name} />
          <ReviewRow
            label="Role"
            value={formatWorkspaceRoleLabel(
              profile.cooperativeRole ?? profile.role
            )}
          />
          {memberNumber ? (
            <ReviewRow label="Cooperative number" value={memberNumber} />
          ) : null}
          <ReviewRow label="Email" value={profile.user.email} />
          {member?.member ? (
            <ReviewRow
              label="KYC"
              value={formatMobileStatus(member.member.kycStatus)}
            />
          ) : null}
        </ReviewSummary>
      </AppSheet>
      {canManageAccess ? (
        <InviteUserSheet
          offline={offline}
          onClose={close}
          profile={profile}
          qa={qa}
          visible={sheet === "invite"}
        />
      ) : null}
    </>
  )
}
