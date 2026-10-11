import { QaAccessPanel } from "@/features/auth/public/qa-access"
import { LegalLinks } from "@/components/app/legal-links"
import { CachedReadBanner } from "@/components/app/cached-read-banner"
import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { EmptyState } from "@/components/app/empty-state"
import { FormStateBanner } from "@/components/app/form-state-banner"
import { FullScreenFormSheet } from "@/components/app/full-screen-form-sheet"
import { FloatingBottomSheet } from "@/components/floating-bottom-sheet"
import { ScreenHeader } from "@/components/app/screen-header"
import { ThemeSelector } from "@/components/app/theme-selector"
import { LoadingSpinner } from "@/components/loading-spinner"
import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Text } from "@/components/ui/text"
import { useColors } from "@/hooks/use-color"
import { useMobileFormDraft } from "@/hooks/use-mobile-form-draft"
import type {
  AdminAccess,
  AdminAccessInviteInput,
  AdminAccessInviteResult,
} from "@/features/admin-reports-access/public/admin-access-types"
import { MemberMoreDirectory } from "@/features/settings-access/components/member-more-directory"
import { AdminMoreIdentity } from "@/features/settings-access/components/admin-more-identity"
import {
  MoreContentList,
  type MoreContentListHandle,
} from "@/features/settings-access/components/more-content-list"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { cn } from "@/lib/utils"
import { WorkspaceRoleSection } from "@/features/settings-access/components/workspace-role-section"
import type { MobileMemberMore } from "@/features/settings-access/model/member-more-types"
import type { SettingsAccessQaState } from "@/features/settings-access/model/settings-access-qa"
import { formatWorkspaceRoleLabel } from "@/features/settings-access/presentation/workspace-role-presentation"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { mobileDevQuickFill } from "@/dev/mobile-dev-quick-fill"
import type { MobileProfile } from "@/lib/session-store"
import { useRouter } from "expo-router"
import { ScreenStatusBar } from "@/components/app/screen-status-bar"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { View } from "react-native"

function AdminDirectoryRow({
  detail,
  icon,
  onPress,
  title,
  value,
}: {
  detail?: string
  icon: string
  onPress: () => void
  title: string
  value?: string
}) {
  return (
    <Button
      accessibilityLabel={detail ? `${title}. ${detail}` : title}
      className="h-auto min-h-16 justify-start rounded-none border-b border-border px-0 py-3"
      onPress={onPress}
      variant="ghost"
    >
      <View className="h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent">
        <Icon className="size-sm text-accent-foreground" name={icon} />
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-left text-sm font-semibold text-foreground">
          {title}
        </Text>
        {detail ? (
          <Text className="text-left text-xs leading-4 text-muted-foreground">
            {detail}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text className="max-w-[28%] text-right text-xs font-medium text-muted-foreground">
          {value}
        </Text>
      ) : null}
      <Icon
        className="size-sm shrink-0 text-muted-foreground"
        name="ChevronRight"
      />
    </Button>
  )
}

function AdminAccessMetricStrip({ access }: { access: AdminAccess }) {
  const stacked = useLargeTextLayout()
  const metrics = [
    { label: "Users", value: access.summary.workspaceUsers },
    { label: "Staff", value: access.summary.staffUsers },
    { label: "Assignments", value: access.summary.roleAssignments },
  ]

  return (
    <View
      className={cn(
        "border-y border-border",
        stacked ? "flex-col" : "flex-row"
      )}
    >
      {metrics.map((metric, index) => (
        <View
          className={cn(
            "min-w-0 gap-1 py-4",
            stacked
              ? index > 0 && "border-t border-border"
              : [
                  "flex-1",
                  index > 0 && "border-l border-border pl-3",
                  index < metrics.length - 1 && "pr-3",
                ]
          )}
          key={metric.label}
        >
          <Text className="text-xs text-muted-foreground">{metric.label}</Text>
          <Text className="text-xl font-extrabold tracking-tight text-foreground">
            {metric.value}
          </Text>
        </View>
      ))}
    </View>
  )
}

export function MoreScreen({
  adminAccess,
  adminAccessError,
  canManageOperationProfile,
  canManageSubscription,
  canUseServerAdminAccess,
  canUseServerMemberHub,
  isInviting,
  isLoadingAdminAccess,
  isLoadingMemberHub,
  isSigningOut,
  memberHub,
  memberHubError,
  onInviteUser,
  onOpenAdminFixture,
  onRefreshAdminAccess,
  onSignOut,
  onSwitchWorkspace,
  profile,
  qaState = null,
  signOutError,
  showLegalReminder,
  switchingMembershipId,
  workspaceError,
}: {
  adminAccess: AdminAccess | null
  adminAccessError: string | null
  canManageOperationProfile: boolean
  canManageSubscription: boolean
  canUseServerAdminAccess: boolean
  canUseServerMemberHub: boolean
  isInviting: boolean
  isLoadingAdminAccess: boolean
  isLoadingMemberHub: boolean
  isSigningOut: boolean
  memberHub: MobileMemberMore | null
  memberHubError: string | null
  onInviteUser: (
    input: AdminAccessInviteInput
  ) => Promise<
    | { message: string; result: null }
    | { message: null; result: AdminAccessInviteResult }
  >
  onOpenAdminFixture: () => void
  onRefreshAdminAccess: () => void
  onSignOut: () => void
  onSwitchWorkspace: (membershipId: string) => void
  profile: MobileProfile | null
  qaState?: SettingsAccessQaState | null
  signOutError: string | null
  showLegalReminder: boolean
  switchingMembershipId: string | null
  workspaceError: string | null
}) {
  const colors = useColors()
  const router = useRouter()
  const scrollRef = useRef<MoreContentListHandle>(null)
  const [accessSectionY, setAccessSectionY] = useState(0)
  const [inviteFullName, setInviteFullName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] =
    useState<AdminAccessInviteInput["role"]>("member")
  const [inviteMakeDefault, setInviteMakeDefault] = useState(false)
  const [inviteMessage, setInviteMessage] = useState<string | null>(null)
  const [isInviteSheetOpen, setIsInviteSheetOpen] = useState(false)
  const [inviteResult, setInviteResult] =
    useState<AdminAccessInviteResult | null>(null)
  const [isInviteHandoffVisible, setIsInviteHandoffVisible] = useState(false)
  const showInviteHandoffAfterDismissRef = useRef(false)
  const guarantorApprovalsHref = "/guarantor-approvals" as Parameters<
    typeof router.push
  >[0]
  const foodPurchaseHref = "/food-purchase" as Parameters<typeof router.push>[0]
  const procurementHref = "/procurement" as Parameters<typeof router.push>[0]
  const projectFinancingHref = "/project-financing" as Parameters<
    typeof router.push
  >[0]
  const receiptsHref = "/receipts" as Parameters<typeof router.push>[0]
  const statementHref = "/statement" as Parameters<typeof router.push>[0]
  const supportHref = "/support" as Parameters<typeof router.push>[0]
  const subscriptionHref = "/subscription" as Parameters<typeof router.push>[0]
  const operationProfileHref = "/operation-profile" as Parameters<
    typeof router.push
  >[0]
  const appLockHref = "/app-lock" as Parameters<typeof router.push>[0]
  const notificationsHref = "/notifications" as Parameters<
    typeof router.push
  >[0]
  const updatesHref = "/updates" as Parameters<typeof router.push>[0]
  const sessionsHref = "/sessions" as Parameters<typeof router.push>[0]
  const availableRoles = useMemo(
    () => profile?.availableRoles ?? [],
    [profile?.availableRoles]
  )
  const canSwitchWorkspace = availableRoles.length > 1
  const invitableRoles = useMemo(
    () =>
      adminAccess?.roles.filter((role) => role.role !== "super_admin") ?? [],
    [adminAccess?.roles]
  )
  const currencyCode = profile?.tenant.currencyCode ?? "NGN"
  const hasStaleAdminAccess = isMobileReadCacheStale(adminAccess?.cache)
  const hasInviteDraft = Boolean(
    inviteFullName.trim() || inviteEmail.trim() || inviteMakeDefault
  )
  const adminInviteDraft = useMemo(
    () => ({
      inviteEmail,
      inviteFullName,
      inviteMakeDefault,
      inviteRole,
    }),
    [inviteEmail, inviteFullName, inviteMakeDefault, inviteRole]
  )
  const clearAdminInviteDraft = useMobileFormDraft({
    enabled: canUseServerAdminAccess,
    key: "admin.access.invite",
    onHydrate: (draft) => {
      setInviteFullName(draft.inviteFullName)
      setInviteEmail(draft.inviteEmail)
      setInviteRole(draft.inviteRole)
      setInviteMakeDefault(draft.inviteMakeDefault)
    },
    value: adminInviteDraft,
  })

  useEffect(() => {
    if (canUseServerAdminAccess) return
    showInviteHandoffAfterDismissRef.current = false
    setIsInviteSheetOpen(false)
    setInviteResult(null)
    setIsInviteHandoffVisible(false)
  }, [canUseServerAdminAccess])
  const handleOpenOwnDeviceAccess = useCallback(() => {
    router.push(sessionsHref)
  }, [router, sessionsHref])
  const handleOpenManagedDeviceAccess = useCallback(
    (userId: string) => {
      router.push({ pathname: "/sessions", params: { userId } })
    },
    [router]
  )
  async function handleInviteAccessUser() {
    if (isInviting) return
    if (hasStaleAdminAccess) {
      setInviteMessage("Refresh workspace access data before inviting a user.")
      return
    }

    const fullName = inviteFullName.trim()
    const email = inviteEmail.trim()

    if (!fullName || !email) {
      setInviteMessage("Enter a full name and email address.")
      return
    }

    setInviteMessage(null)
    const outcome = await onInviteUser({
      email,
      fullName,
      makeDefault: inviteMakeDefault,
      role: inviteRole,
    })

    if (outcome.message || !outcome.result) {
      setInviteMessage(outcome.message)
      return
    }

    await clearAdminInviteDraft()
    setInviteFullName("")
    setInviteEmail("")
    setInviteRole("member")
    setInviteMakeDefault(false)
    setInviteResult(outcome.result)
    showInviteHandoffAfterDismissRef.current = true
    setIsInviteSheetOpen(false)
  }

  const workspaceSection =
    profile && canSwitchWorkspace ? (
      <WorkspaceRoleSection
        activeMembershipId={profile.activeMembershipId}
        disabled={Boolean(switchingMembershipId)}
        onSwitchWorkspace={onSwitchWorkspace}
        roles={availableRoles}
        switchingMembershipId={switchingMembershipId}
        tenantName={profile.tenant.name}
        workspaceError={workspaceError}
      />
    ) : null

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <ScreenStatusBar />
      <MoreContentList
        access={
          profile?.role !== "member" && canUseServerAdminAccess
            ? adminAccess
            : null
        }
        footer={
          <>
            <QaAccessPanel inline />
            <LegalLinks />
            {signOutError ? (
              <Text className="text-sm font-medium text-destructive">
                {signOutError}
              </Text>
            ) : null}
            <Button
              className="h-12 border-t border-border"
              disabled={isSigningOut}
              onPress={onSignOut}
              variant="ghost"
            >
              <Icon name="LogOut" className="size-base text-foreground" />
              <Text>{isSigningOut ? "Signing out" : "Sign out"}</Text>
            </Button>
          </>
        }
        onOpenDeviceAccess={handleOpenManagedDeviceAccess}
        ref={scrollRef}
      >
        <ScreenHeader title="More" />
        {showLegalReminder ? (
          <View className="gap-3 rounded-xl border border-border bg-card p-4">
            <Text className="text-sm leading-6 text-foreground">
              Current platform terms and privacy notice are ready for your
              review. You can keep using your account.
            </Text>
            <Button
              accessibilityLabel="Review platform documents"
              className="self-start"
              onPress={() => router.push("/legal-agreements")}
              size="sm"
              variant="outline"
            >
              <Text>Review platform documents</Text>
            </Button>
          </View>
        ) : null}

        {profile?.role === "admin" ? (
          <>
            <AdminMoreIdentity
              name={profile.user.name}
              tenantName={profile.tenant.name}
              roleLabel={formatWorkspaceRoleLabel(
                profile.cooperativeRole ?? "admin"
              )}
            />

            <View className="gap-2">
              <View className="flex-row items-end justify-between gap-4">
                <Text className="text-lg font-bold tracking-tight text-foreground">
                  Administration
                </Text>
              </View>
              <View>
                {canUseServerAdminAccess ? (
                  <AdminDirectoryRow
                    icon="UsersRound"
                    onPress={() =>
                      scrollRef.current?.scrollTo({
                        animated: true,
                        y: Math.max(0, accessSectionY - 16),
                      })
                    }
                    title="Workspace access"
                  />
                ) : null}
                <AdminDirectoryRow
                  icon="LockKeyhole"
                  onPress={() => router.push(appLockHref)}
                  title="App lock"
                />
                <AdminDirectoryRow
                  icon="ShieldCheck"
                  onPress={handleOpenOwnDeviceAccess}
                  title="Device access"
                />
                {canManageSubscription ? (
                  <AdminDirectoryRow
                    icon="CreditCard"
                    onPress={() => router.push(subscriptionHref)}
                    title="Plan & billing"
                  />
                ) : null}
                {canManageOperationProfile ? (
                  <AdminDirectoryRow
                    icon="SlidersHorizontal"
                    onPress={() => router.push(operationProfileHref)}
                    title="Operation Profile"
                  />
                ) : null}
                <AdminDirectoryRow
                  icon="Bell"
                  onPress={() => router.push(notificationsHref)}
                  title="Notifications"
                />
                <AdminDirectoryRow
                  icon="RefreshCw"
                  onPress={() => router.push(updatesHref)}
                  title="App updates"
                />
              </View>
            </View>

            {workspaceSection}

            <View className="gap-3">
              <Text className="text-lg font-bold tracking-tight text-foreground">
                Appearance
              </Text>
              <ThemeSelector />
            </View>
          </>
        ) : null}

        {profile?.role === "admin" && qaState === "denied" ? (
          <EmptyState
            description="Your current workspace role does not include access administration."
            icon="ShieldX"
            title="Workspace access is restricted"
          />
        ) : null}

        {canUseServerMemberHub ? (
          <MemberMoreDirectory
            currencyCode={currencyCode}
            error={memberHubError}
            hub={memberHub}
            isLoading={isLoadingMemberHub}
            onOpenAppLock={() => router.push(appLockHref)}
            onOpenDeviceAccess={handleOpenOwnDeviceAccess}
            onOpenNotifications={() => router.push(notificationsHref)}
            onOpenSection={(key) => {
              switch (key) {
                case "statement":
                  router.push(statementHref)
                  break
                case "receipts":
                  router.push(receiptsHref)
                  break
                case "procurement":
                  router.push(procurementHref)
                  break
                case "projectFinancing":
                  router.push(projectFinancingHref)
                  break
                case "foodPurchase":
                  router.push(foodPurchaseHref)
                  break
                case "guarantors":
                  router.push(guarantorApprovalsHref)
                  break
                case "support":
                  router.push(supportHref)
                  break
              }
            }}
            onOpenUpdates={() => router.push(updatesHref)}
            workspace={workspaceSection}
          />
        ) : canUseServerAdminAccess ? (
          <View
            className="gap-5"
            onLayout={({ nativeEvent }) =>
              setAccessSectionY(nativeEvent.layout.y)
            }
          >
            <View className="gap-2">
              <View className="gap-2">
                <Text className="text-lg font-bold tracking-tight text-foreground">
                  Workspace access
                </Text>
                {adminAccess ? (
                  <Text className="pb-0.5 text-xs text-muted-foreground">
                    {adminAccess.summary.defaultRoles} default assignments
                  </Text>
                ) : null}
              </View>
              <CachedReadBanner
                action="inviting users or changing roles"
                cache={adminAccess?.cache}
                label="workspace access data"
              />
              {isLoadingAdminAccess && !adminAccess ? <LoadingSpinner /> : null}
              {adminAccess ? (
                <>
                  <AdminAccessMetricStrip access={adminAccess} />
                  <Text className="text-xs leading-5 text-muted-foreground">
                    {adminAccess.summary.memberUsers} members
                  </Text>
                  <FormStateBanner
                    hasDraft={hasInviteDraft}
                    isStale={hasStaleAdminAccess}
                  />
                  <Button
                    accessibilityLabel="Open invite form"
                    disabled={hasStaleAdminAccess}
                    onPress={() => {
                      setInviteMessage(null)
                      setIsInviteSheetOpen(true)
                    }}
                  >
                    <Icon
                      className="size-base text-primary-foreground"
                      name="UserPlus"
                    />
                    <Text>Invite user</Text>
                  </Button>
                </>
              ) : null}
              {adminAccessError ? (
                <View className="gap-3 border-y border-border py-4">
                  <Text className="text-sm font-medium text-destructive">
                    {adminAccessError}
                  </Text>
                  <Button
                    className="self-start"
                    onPress={onRefreshAdminAccess}
                    size="sm"
                    variant="outline"
                  >
                    <Icon className="size-sm" name="RefreshCw" />
                    <Text>Retry</Text>
                  </Button>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}
      </MoreContentList>
      {profile?.role === "member" && !canSwitchWorkspace ? (
        <DevQuickFill
          bottomOffset={92}
          label="Open isolated admin UI fixture"
          onPress={onOpenAdminFixture}
        />
      ) : null}
      <FullScreenFormSheet
        dirty={hasInviteDraft}
        footer={
          <Button
            disabled={hasStaleAdminAccess || isInviting}
            onPress={handleInviteAccessUser}
            size="lg"
          >
            <Icon name="Send" className="size-base text-primary-foreground" />
            <Text>{isInviting ? "Saving" : "Send invite"}</Text>
          </Button>
        }
        isSubmitting={isInviting}
        onClose={() => setIsInviteSheetOpen(false)}
        onDismissed={() => {
          if (!showInviteHandoffAfterDismissRef.current) return
          showInviteHandoffAfterDismissRef.current = false
          setIsInviteHandoffVisible(true)
        }}
        overlay={
          <DevQuickFill
            bottomOffset={92}
            label="Quick fill access invitation"
            onPress={() => {
              setInviteFullName(mobileDevQuickFill.adminInvite.fullName)
              setInviteEmail(mobileDevQuickFill.adminInvite.email)
              setInviteRole("finance_officer")
              setInviteMakeDefault(true)
            }}
            portal={false}
          />
        }
        title="Invite user"
        visible={isInviteSheetOpen}
      >
        <FormStateBanner
          hasDraft={hasInviteDraft}
          isStale={hasStaleAdminAccess}
        />
        <Text className="text-sm leading-5 text-muted-foreground">
          {profile?.tenant.name}
        </Text>
        <View className="gap-2">
          <Text className="text-sm font-semibold text-foreground">
            Full name
          </Text>
          <Input
            accessibilityLabel="Invite full name"
            editable={!isInviting}
            onChangeText={setInviteFullName}
            placeholder="Full name"
            value={inviteFullName}
          />
        </View>
        <View className="gap-2">
          <Text className="text-sm font-semibold text-foreground">
            Email address
          </Text>
          <Input
            accessibilityLabel="Invite email address"
            autoCapitalize="none"
            editable={!isInviting}
            keyboardType="email-address"
            onChangeText={setInviteEmail}
            placeholder="Email address"
            value={inviteEmail}
          />
        </View>
        <View className="gap-2">
          <Text className="text-sm font-semibold text-foreground">
            Workspace role
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {invitableRoles.map((role) => (
              <Button
                disabled={hasStaleAdminAccess || isInviting}
                key={role.role}
                onPress={() =>
                  setInviteRole(role.role as AdminAccessInviteInput["role"])
                }
                size="sm"
                variant={inviteRole === role.role ? "secondary" : "outline"}
              >
                <Text>{role.label}</Text>
              </Button>
            ))}
          </View>
          {invitableRoles.find((role) => role.role === inviteRole)?.scope ? (
            <Text className="text-xs leading-5 text-muted-foreground">
              {invitableRoles.find((role) => role.role === inviteRole)?.scope}
            </Text>
          ) : null}
        </View>
        <Button
          className="justify-start"
          disabled={hasStaleAdminAccess || isInviting}
          onPress={() => setInviteMakeDefault((current) => !current)}
          variant={inviteMakeDefault ? "secondary" : "outline"}
        >
          <Icon name="Star" className="size-base text-foreground" />
          <Text>
            {inviteMakeDefault ? "Default role" : "Set as default role"}
          </Text>
        </Button>
        {inviteMessage ? (
          <Text className="text-sm font-medium text-muted-foreground">
            {inviteMessage}
          </Text>
        ) : null}
      </FullScreenFormSheet>
      <FloatingBottomSheet
        accessibilityLabel="Workspace access handoff"
        footer={
          <View className="px-5 pt-3 pb-5">
            <Button onPress={() => setIsInviteHandoffVisible(false)} size="lg">
              <Text>Done</Text>
            </Button>
          </View>
        }
        onClose={() => setIsInviteHandoffVisible(false)}
        presentation="compact"
        scrollable="auto"
        title="Access invitation"
        visible={isInviteHandoffVisible && inviteResult !== null}
      >
        {inviteResult ? (
          <View className="gap-4 px-5 pb-4">
            <View className="gap-1">
              <Text className="text-xl font-extrabold tracking-tight text-foreground">
                {inviteResult.fullName}
              </Text>
              <Text className="text-sm leading-5 text-muted-foreground">
                {formatWorkspaceRoleLabel(inviteResult.role)} ·{" "}
                {inviteResult.email}
              </Text>
            </View>
            <View className="border-y border-border py-4">
              <Text className="text-xs font-medium text-muted-foreground">
                Cooperative number
              </Text>
              <Text
                accessibilityLabel={`Cooperative number ${inviteResult.cooperativeNumber}`}
                className="mt-1 text-2xl font-extrabold tracking-tight text-foreground"
                selectable
              >
                {inviteResult.cooperativeNumber}
              </Text>
            </View>
            <View className="flex-row items-start gap-2">
              <Icon
                className={`size-sm mt-0.5 ${
                  inviteResult.deliveryStatus === "sent" ||
                  inviteResult.deliveryStatus === "queued"
                    ? "text-success"
                    : inviteResult.deliveryStatus === "development_fixture"
                      ? "text-brand"
                      : "text-warn"
                }`}
                name="Mail"
              />
              <View className="flex-1 gap-1">
                <Text className="text-sm font-semibold text-foreground">
                  {inviteResult.deliveryStatus === "sent"
                    ? "Setup email sent"
                    : inviteResult.deliveryStatus === "queued"
                      ? "Setup email queued"
                      : inviteResult.deliveryStatus === "development_fixture"
                        ? "Development fixture only"
                        : "Share the number manually"}
                </Text>
                <Text className="text-xs leading-5 text-muted-foreground">
                  {inviteResult.deliveryStatus === "sent" ||
                  inviteResult.deliveryStatus === "queued"
                    ? "The recipient can open the setup link, request a recovery code, and choose a password."
                    : inviteResult.deliveryStatus === "development_fixture"
                      ? "No email was sent. This deterministic handoff exists only for native UI verification."
                      : "Email delivery was not confirmed. Give the recipient this cooperative number and ask them to use Forgot password with the invited email address."}
                </Text>
              </View>
            </View>
          </View>
        ) : null}
      </FloatingBottomSheet>
    </SafeArea>
  )
}
