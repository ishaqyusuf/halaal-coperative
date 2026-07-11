import { SectionCard } from "@/components/app/section-card"
import { LoadingSpinner } from "@/components/loading-spinner"
import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { useAuthContext } from "@/hooks/use-auth"
import { useColors } from "@/hooks/use-color"
import {
  getMobileAdminAccess,
  getMobileMemberMore,
  type MobileAdminAccess,
  type MobileAdminAccessRole,
  type MobileAdminAccessUser,
  type MobileMemberMore,
  type MobileMemberMoreRow,
} from "@/lib/mobile-home-api"
import { formatMobileMetricValue } from "@/lib/mobile-metrics"
import { isMockSessionToken } from "@/lib/session-store"
import { useRouter } from "expo-router"
import { useEffect, useMemo, useState } from "react"
import { ScrollView, View } from "react-native"

function formatRoleLabel(role: string) {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function formatMoreRowValue(row: MobileMemberMoreRow, currencyCode: string) {
  if (row.value === null || !row.format) return null

  return formatMobileMetricValue(
    {
      detail: row.detail,
      format: row.format,
      key: row.key,
      label: row.label,
      value: row.value,
    },
    currencyCode
  )
}

function formatErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback

  if (error.message.includes("tenant_admin")) {
    return "Workspace access requires Cooperative Admin."
  }

  return error.message || fallback
}

function AdminAccessStat({
  detail,
  label,
  value,
}: {
  detail: string
  label: string
  value: number
}) {
  return (
    <View className="gap-1 rounded-md bg-secondary p-3">
      <Text className="text-2xl font-black text-foreground">{value}</Text>
      <Text className="text-sm font-semibold text-foreground">{label}</Text>
      <Text className="text-xs leading-4 text-muted-foreground">{detail}</Text>
    </View>
  )
}

function AdminUserRow({ user }: { user: MobileAdminAccessUser }) {
  return (
    <View className="gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text className="text-sm font-semibold text-foreground">
            {user.fullName}
          </Text>
          <Text className="text-xs text-muted-foreground">{user.email}</Text>
        </View>
        <Text className="text-xs font-medium text-muted-foreground">
          {user.defaultRoleLabel
            ? `Default: ${user.defaultRoleLabel}`
            : "No default"}
        </Text>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {user.memberships.map((membership) => (
          <View
            className="rounded-md bg-secondary px-2 py-1"
            key={membership.id}
          >
            <Text className="text-xs font-medium text-foreground">
              {membership.label}
              {membership.isDefault ? " · default" : ""}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function AdminRoleRow({ role }: { role: MobileAdminAccessRole }) {
  return (
    <View className="gap-1 border-b border-border pb-3 last:border-b-0 last:pb-0">
      <View className="flex-row items-start justify-between gap-3">
        <Text className="flex-1 text-sm font-semibold text-foreground">
          {role.label}
        </Text>
        <Text className="text-xs font-medium text-muted-foreground">
          {role.usersCount} users
        </Text>
      </View>
      <Text className="text-sm leading-5 text-muted-foreground">
        {role.scope}
      </Text>
      <Text className="text-xs text-muted-foreground">
        {role.defaultUsersCount} default assignments
      </Text>
    </View>
  )
}

export function MoreScreen() {
  const { profile, signOut, switchRole } = useAuthContext()
  const colors = useColors()
  const router = useRouter()
  const [adminAccess, setAdminAccess] = useState<MobileAdminAccess | null>(null)
  const [isLoadingAdminAccess, setIsLoadingAdminAccess] = useState(false)
  const [adminAccessError, setAdminAccessError] = useState<string | null>(null)
  const [memberHub, setMemberHub] = useState<MobileMemberMore | null>(null)
  const [isLoadingMemberHub, setIsLoadingMemberHub] = useState(false)
  const [memberHubError, setMemberHubError] = useState<string | null>(null)
  const [switchingMembershipId, setSwitchingMembershipId] = useState<
    string | null
  >(null)
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)
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
  const availableRoles = useMemo(
    () => profile?.availableRoles ?? [],
    [profile?.availableRoles]
  )
  const canSwitchWorkspace = availableRoles.length > 1
  const canUseServerMemberHub = Boolean(
    profile?.role === "member" &&
    profile?.token &&
    !isMockSessionToken(profile.token)
  )
  const canUseServerAdminAccess = Boolean(
    profile?.role === "admin" &&
    profile?.token &&
    !isMockSessionToken(profile.token)
  )
  const currencyCode = profile?.tenant.currencyCode ?? "NGN"

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

    void getMobileMemberMore()
      .then((response) => {
        if (mounted) {
          setMemberHub(response)
        }
      })
      .catch(() => {
        if (mounted) {
          setMemberHubError("Member details are unavailable.")
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoadingMemberHub(false)
        }
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

    setIsLoadingAdminAccess(true)
    setAdminAccessError(null)

    void getMobileAdminAccess()
      .then((response) => {
        if (mounted) {
          setAdminAccess(response)
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
        if (mounted) {
          setIsLoadingAdminAccess(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [canUseServerAdminAccess, profile?.token])

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-5">
        <View className="gap-2">
          <Text className="text-3xl font-black text-foreground">More</Text>
          <Text className="text-base text-muted-foreground">
            {profile?.role === "admin" ? "Admin workspace" : "Member workspace"}
          </Text>
        </View>

        {profile && canSwitchWorkspace ? (
          <View className="gap-3 rounded-md border border-border bg-card p-4">
            <View className="gap-1">
              <Text className="text-lg font-semibold text-foreground">
                Workspace
              </Text>
              <Text className="text-sm text-muted-foreground">
                {profile.tenant.name}
              </Text>
            </View>
            <View className="gap-2">
              {availableRoles.map((role) => {
                const isActive = role.id === profile.activeMembershipId
                const isSwitching = switchingMembershipId === role.id

                return (
                  <Button
                    className="h-11 justify-start"
                    disabled={isActive || Boolean(switchingMembershipId)}
                    key={role.id}
                    onPress={async () => {
                      setWorkspaceError(null)
                      setSwitchingMembershipId(role.id)

                      try {
                        await switchRole(role.id)
                        router.replace("/")
                      } catch {
                        setWorkspaceError("Workspace switch failed.")
                      } finally {
                        setSwitchingMembershipId(null)
                      }
                    }}
                    variant={isActive ? "secondary" : "outline"}
                  >
                    <Icon
                      name={
                        role.workspaceRole === "admin" ? "ShieldCheck" : "User"
                      }
                      className="size-base text-foreground"
                    />
                    <Text>
                      {isSwitching
                        ? "Switching"
                        : isActive
                          ? `${formatRoleLabel(role.role)} active`
                          : formatRoleLabel(role.role)}
                    </Text>
                  </Button>
                )
              })}
              {workspaceError ? (
                <Text className="text-sm font-medium text-destructive">
                  {workspaceError}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {canUseServerMemberHub ? (
          isLoadingMemberHub ? (
            <SectionCard icon="LoaderCircle" title="Member details">
              <LoadingSpinner />
            </SectionCard>
          ) : (
            <>
              {memberHub?.sections.map((section) => (
                <SectionCard
                  icon={section.icon}
                  key={section.key}
                  title={section.title}
                >
                  <View className="gap-3">
                    {section.rows.map((row) => {
                      const formattedValue = formatMoreRowValue(
                        row,
                        currencyCode
                      )

                      return (
                        <View
                          className="flex-row items-start gap-3"
                          key={row.key}
                        >
                          <View className="h-8 w-8 items-center justify-center rounded-md bg-secondary">
                            <Icon
                              name={
                                formattedValue ? "CircleDollarSign" : "Info"
                              }
                              className="size-sm text-foreground"
                            />
                          </View>
                          <View className="flex-1 gap-1">
                            <View className="flex-row items-start justify-between gap-3">
                              <Text className="flex-1 text-sm font-semibold text-foreground">
                                {row.label}
                              </Text>
                              {formattedValue ? (
                                <Text className="text-sm font-semibold text-foreground">
                                  {formattedValue}
                                </Text>
                              ) : null}
                            </View>
                            <Text className="text-sm leading-5 text-muted-foreground">
                              {row.detail}
                            </Text>
                            {row.status ? (
                              <Text className="text-xs font-medium text-muted-foreground">
                                {row.status}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      )
                    })}
                    {section.key === "support" ? (
                      <Button
                        className="h-11"
                        onPress={() => router.push(supportHref)}
                      >
                        <Icon
                          name="MessageCirclePlus"
                          className="size-base text-primary-foreground"
                        />
                        <Text>Open support</Text>
                      </Button>
                    ) : null}
                    {section.key === "receipts" ? (
                      <Button
                        className="h-11"
                        onPress={() => router.push(receiptsHref)}
                      >
                        <Icon
                          name="ReceiptText"
                          className="size-base text-primary-foreground"
                        />
                        <Text>Submit receipt</Text>
                      </Button>
                    ) : null}
                    {section.key === "statement" ? (
                      <Button
                        className="h-11"
                        onPress={() => router.push(statementHref)}
                      >
                        <Icon
                          name="FileText"
                          className="size-base text-primary-foreground"
                        />
                        <Text>Open statement</Text>
                      </Button>
                    ) : null}
                    {section.key === "procurement" ? (
                      <Button
                        className="h-11"
                        onPress={() => router.push(procurementHref)}
                      >
                        <Icon
                          name="PackageSearch"
                          className="size-base text-primary-foreground"
                        />
                        <Text>Open procurement</Text>
                      </Button>
                    ) : null}
                    {section.key === "projectFinancing" ? (
                      <Button
                        className="h-11"
                        onPress={() => router.push(projectFinancingHref)}
                      >
                        <Icon
                          name="BriefcaseBusiness"
                          className="size-base text-primary-foreground"
                        />
                        <Text>Open projects</Text>
                      </Button>
                    ) : null}
                    {section.key === "foodPurchase" ? (
                      <Button
                        className="h-11"
                        onPress={() => router.push(foodPurchaseHref)}
                      >
                        <Icon
                          name="ShoppingBasket"
                          className="size-base text-primary-foreground"
                        />
                        <Text>Open Foodstuff</Text>
                      </Button>
                    ) : null}
                    {section.key === "guarantors" ? (
                      <Button
                        className="h-11"
                        onPress={() => router.push(guarantorApprovalsHref)}
                      >
                        <Icon
                          name="ShieldCheck"
                          className="size-base text-primary-foreground"
                        />
                        <Text>Review requests</Text>
                      </Button>
                    ) : null}
                  </View>
                </SectionCard>
              ))}
              {memberHubError ? (
                <SectionCard icon="CircleAlert" title="Member details">
                  <Text className="text-sm font-medium text-destructive">
                    {memberHubError}
                  </Text>
                </SectionCard>
              ) : null}
            </>
          )
        ) : canUseServerAdminAccess ? (
          isLoadingAdminAccess ? (
            <SectionCard icon="LoaderCircle" title="Workspace access">
              <LoadingSpinner />
            </SectionCard>
          ) : (
            <>
              {adminAccess ? (
                <>
                  <SectionCard icon="ShieldCheck" title="Workspace access">
                    <View className="gap-3">
                      <AdminAccessStat
                        detail="Users loaded for this cooperative"
                        label="Workspace users"
                        value={adminAccess.summary.workspaceUsers}
                      />
                      <AdminAccessStat
                        detail="Staff with non-member workspace access"
                        label="Staff users"
                        value={adminAccess.summary.staffUsers}
                      />
                      <AdminAccessStat
                        detail="Role memberships across all users"
                        label="Assignments"
                        value={adminAccess.summary.roleAssignments}
                      />
                      <AdminAccessStat
                        detail="Users with a default workspace role"
                        label="Default roles"
                        value={adminAccess.summary.defaultRoles}
                      />
                      <AdminAccessStat
                        detail="Users with member self-service access"
                        label="Member users"
                        value={adminAccess.summary.memberUsers}
                      />
                    </View>
                  </SectionCard>

                  <SectionCard icon="Users" title="Users and roles">
                    <View className="gap-3">
                      {adminAccess.users.slice(0, 8).map((user) => (
                        <AdminUserRow key={user.id} user={user} />
                      ))}
                      {adminAccess.users.length === 0 ? (
                        <Text className="text-sm text-muted-foreground">
                          No workspace users are available.
                        </Text>
                      ) : null}
                    </View>
                  </SectionCard>

                  <SectionCard icon="KeyRound" title="Role coverage">
                    <View className="gap-3">
                      {adminAccess.roles.map((role) => (
                        <AdminRoleRow key={role.role} role={role} />
                      ))}
                    </View>
                  </SectionCard>
                </>
              ) : null}
              {adminAccessError ? (
                <SectionCard icon="CircleAlert" title="Workspace access">
                  <Text className="text-sm font-medium text-destructive">
                    {adminAccessError}
                  </Text>
                </SectionCard>
              ) : null}
            </>
          )
        ) : (
          <View className="gap-3 rounded-md border border-border bg-card p-4">
            {[
              "Profile",
              "Receipts",
              "Statements",
              "Notifications",
              "Support",
            ].map((item) => (
              <View className="flex-row items-center gap-3 py-2" key={item}>
                <Icon
                  name="ChevronRight"
                  className="size-sm text-muted-foreground"
                />
                <Text className="text-base text-foreground">{item}</Text>
              </View>
            ))}
          </View>
        )}

        <Button
          className="h-12"
          onPress={async () => {
            await signOut()
            router.replace("/")
          }}
          variant="outline"
        >
          <Icon name="LogOut" className="size-base text-foreground" />
          <Text>Sign out</Text>
        </Button>
      </ScrollView>
    </SafeArea>
  )
}
