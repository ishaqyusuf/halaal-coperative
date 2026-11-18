import { AppList } from "@/components/app/app-list"
import { EmptyState } from "@/components/app/empty-state"
import { ScreenHeaderButton } from "@/components/app/screen-shell"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { StatusBanner } from "@/components/ui/status-banner"
import { Text } from "@/components/ui/text"
import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import { canManageMobileAdminAccess } from "@/features/admin-reports-access/public/admin-access-policy"
import { useAppInfiniteQuery, useAppQuery } from "@/hooks/use-app-query"
import { useAuthContext } from "@/hooks/use-auth"
import { useDebounce } from "@/hooks/use-debounce"
import { cn } from "@/lib/utils"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { Redirect, useLocalSearchParams, useRouter } from "expo-router"
import { useState } from "react"
import { View } from "react-native"
import {
  getWorkspaceAccessPage,
  getWorkspaceAccessStats,
  settingsAccessKey,
  type WorkspaceAccessCursor,
} from "../api/workspace-access-api"
import {
  GroupedRow,
  GroupHeading,
  SettingsDivider,
} from "../components/grouped-settings"
import { InviteUserSheet } from "../components/invite-user-sheet"
import { getSettingsAccessQaState } from "../model/settings-access-qa"
import {
  buildWorkspaceAccessItems,
  formatAccessCount,
  formatAccessMemberships,
} from "../presentation/workspace-access-list"

type AccessPage = Awaited<ReturnType<typeof getWorkspaceAccessPage>>

const roleIcons = {
  finance_officer: "Landmark",
  member: "UserRound",
  operations_officer: "Headphones",
  super_admin: "ShieldCheck",
  tenant_admin: "ShieldCheck",
}

export function WorkspaceAccessScreen() {
  const router = useRouter()
  const { profile } = useAuthContext()
  const runtime = useMobileRuntime()
  const { qaState } = useLocalSearchParams<{ qaState?: string }>()
  const qa = getSettingsAccessQaState(qaState)
  const [search, setSearch] = useState("")
  const [inviting, setInviting] = useState(false)
  const term = useDebounce(search.trim(), 275)
  const offline = qa === "offline" || runtime.state.connectivity === "offline"
  const serverTerm = offline ? "" : term
  const account = profile
    ? `${profile.user.id}:${profile.tenant.id}:${profile.activeMembershipId}`
    : null
  const allowed =
    canUseMobileFeatureData(profile, "admin") &&
    canManageMobileAdminAccess(profile?.cooperativeRole) &&
    qa !== "denied"
  const enabled =
    allowed && qa !== "error" && qa !== "loading" && qa !== "empty"
  const stats = useAppQuery({
    enabled,
    networkMode: "always",
    placeholderData: undefined,
    queryFn: getWorkspaceAccessStats,
    queryKey: settingsAccessKey(account, "stats"),
  })
  const directory = useAppInfiniteQuery<
    AccessPage,
    AccessPage["users"][number],
    Error,
    ReturnType<typeof settingsAccessKey>,
    WorkspaceAccessCursor | null
  >({
    enabled,
    getNextPageParam: (page) => page.nextCursor,
    initialPageParam: null,
    networkMode: "always",
    placeholderData: undefined,
    queryFn: ({ pageParam }) => getWorkspaceAccessPage(pageParam, serverTerm),
    queryKey: settingsAccessKey(account, "directory", serverTerm),
    selectItems: (page) => page.users,
  })

  if (!profile || !allowed) return <Redirect href="/(admin)/(tabs)/more" />

  const loading = qa === "loading" || directory.isLoading
  const hasPage = Boolean(directory.data?.pages.length)
  const failed = qa === "error" || directory.isError || stats.isError
  const stale =
    qa === "stale" ||
    stats.data?.cache?.status === "stale" ||
    directory.data?.pages[0]?.cache?.status === "stale"
  const summary = stats.data?.summary
  const users =
    offline && search.trim()
      ? directory.items.filter((user) =>
          [user.fullName, user.email].some((value) =>
            value.toLowerCase().includes(search.trim().toLowerCase())
          )
        )
      : directory.items
  const items =
    !hasPage || qa === "empty"
      ? []
      : buildWorkspaceAccessItems({
          users,
          roles:
            search.trim() || directory.hasNextPage
              ? []
              : (stats.data?.roles ?? []),
          staffCount: search.trim() ? undefined : summary?.staffUsers,
          workspaceCount: search.trim() ? undefined : summary?.workspaceUsers,
        })
  const refresh = () => {
    if (!enabled || offline) return
    void stats.refetch()
    void directory.refetch()
  }
  const invite = (
    <Button
      accessibilityLabel="Invite user"
      disabled={offline}
      onPress={() => setInviting(true)}
      size="sm"
      variant="ghost"
    >
      <Icon className="size-base text-primary" name="UserPlus" />
      <Text className="text-primary">Invite</Text>
    </Button>
  )

  return (
    <>
      <AppList
        compactHeader={
          <View className="min-h-[52px] flex-row items-center justify-between gap-[8px] px-[18px]">
            <ScreenHeaderButton
              accessibilityLabel="Go back"
              icon="ChevronLeft"
              onPress={() => router.back()}
            />
            <Text
              accessibilityRole="header"
              className="min-w-0 shrink"
              variant="section"
            >
              Workspace access
            </Text>
            {invite}
          </View>
        }
        data={items}
        empty={
          <EmptyState
            icon={term ? "Search" : "UsersRound"}
            title={term ? "No matching users" : "No workspace users"}
            description={term ? "Try another name or email." : undefined}
          />
        }
        error={
          failed
            ? "Workspace access is unavailable. Check your connection and try again."
            : null
        }
        estimatedItemSize={62}
        header={
          <>
            {summary ? (
              <Text className="text-muted-foreground" variant="small">
                {formatAccessCount(summary.workspaceUsers, "user")} ·{" "}
                {summary.staffUsers} staff ·{" "}
                {formatAccessCount(summary.roleAssignments, "role assignment")}
              </Text>
            ) : null}
            {offline || stale ? (
              <StatusBanner
                description={
                  hasPage
                    ? "Showing saved workspace users."
                    : "Connect to load workspace users."
                }
                kind={offline ? "offline" : "stale"}
                title={offline ? "You’re offline" : "Showing saved data"}
              />
            ) : null}
          </>
        }
        headerActions={invite}
        isFetchingNextPage={directory.isFetchingNextPage}
        isLoading={loading}
        keyExtractor={(item) => item.id}
        onEndReached={offline || stale ? undefined : directory.onEndReached}
        onRefresh={offline ? undefined : refresh}
        onRetry={offline ? undefined : refresh}
        refreshing={
          stats.isRefetching ||
          (directory.isRefetching && !directory.isFetchingNextPage)
        }
        renderItem={({ item }) => {
          if (item.type === "heading") {
            return (
              <View className="mx-[18px] mt-[12px]">
                <GroupHeading>{item.title}</GroupHeading>
              </View>
            )
          }
          return (
            <View
              className={cn(
                "mx-[18px] overflow-hidden bg-card",
                item.first && "rounded-t-[14px]",
                item.last && "rounded-b-[14px]"
              )}
            >
              {item.first ? null : <SettingsDivider />}
              {item.type === "user" ? (
                <GroupedRow
                  avatar={item.user.fullName}
                  detail={formatAccessMemberships(item.user)}
                  onPress={() =>
                    router.push({
                      pathname: "/sessions",
                      params: { userId: item.user.id },
                    })
                  }
                  title={item.user.fullName}
                />
              ) : (
                <GroupedRow
                  detail={item.role.scope}
                  icon={roleIcons[item.role.role]}
                  title={item.role.label}
                  value={String(item.role.usersCount)}
                />
              )}
            </View>
          )
        }}
        search={
          summary
            ? {
                accessibilityLabel: "Search workspace users",
                localSearch: offline,
                onChangeText: (value) => setSearch(value.slice(0, 120)),
                placeholder: "Search name or email",
                totalCount: summary.workspaceUsers,
                value: search,
              }
            : undefined
        }
        testID="workspace-access"
        title="Workspace access"
      />
      <InviteUserSheet
        offline={offline}
        onClose={() => setInviting(false)}
        profile={profile}
        qa={qa}
        visible={inviting}
      />
    </>
  )
}
