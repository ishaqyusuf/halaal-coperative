import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { useAuthContext } from "@/hooks/use-auth"
import { useColors } from "@/hooks/use-color"
import { useRouter } from "expo-router"
import { useMemo, useState } from "react"
import { ScrollView, View } from "react-native"

function formatRoleLabel(role: string) {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function MoreScreen() {
  const { profile, signOut, switchRole } = useAuthContext()
  const colors = useColors()
  const router = useRouter()
  const [switchingMembershipId, setSwitchingMembershipId] = useState<
    string | null
  >(null)
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)
  const availableRoles = useMemo(
    () => profile?.availableRoles ?? [],
    [profile?.availableRoles]
  )
  const canSwitchWorkspace = availableRoles.length > 1

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

        <View className="gap-3 rounded-md border border-border bg-card p-4">
          {["Profile", "Notifications", "Documents", "Support"].map((item) => (
            <View className="flex-row items-center gap-3 py-2" key={item}>
              <Icon
                name="ChevronRight"
                className="size-sm text-muted-foreground"
              />
              <Text className="text-base text-foreground">{item}</Text>
            </View>
          ))}
        </View>

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
