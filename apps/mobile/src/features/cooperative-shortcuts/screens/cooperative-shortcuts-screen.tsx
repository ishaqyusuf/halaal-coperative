import { ScreenBackButton } from "@/components/app/screen-back-button"
import { ScreenHeader } from "@/components/app/screen-header"
import { LoadingSpinner } from "@/components/loading-spinner"
import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Text } from "@/components/ui/text"
import { ScrollView, View } from "react-native"

import { CooperativeShortcutTile } from "../components/cooperative-shortcut-tile"
import {
  formatMembershipRole,
  SHORTCUT_PRIVACY_NOTICE,
  SHORTCUT_REMOVAL_INSTRUCTIONS,
  type CooperativeWorkspace,
  type ShortcutPresentation,
} from "../model/shortcut-policy"
import type { ShortcutEnvironment } from "../platform/cooperative-shortcut-platform"

export type CooperativeShortcutsScreenProps = {
  activeMembershipId: string | null
  busyAction: string | null
  current: { mark: string; name: string } | null
  environment: ShortcutEnvironment
  loadError: string | null
  loading: boolean
  message: string | null
  onAction: (action: ShortcutPresentation["actions"][number]) => void
  onBack: () => void
  onRetryLoad: () => void
  onSwitch: (membershipId: string) => void
  shortcut: ShortcutPresentation | null
  switchError: string | null
  switchingMembershipId: string | null
  workspaces: CooperativeWorkspace[] | null
}

const ACTION_LABELS: Record<ShortcutPresentation["actions"][number], string> = {
  add: "Add to home screen",
  disable: "Disable shortcut",
  refresh: "Refresh icon",
  retry: "Try again",
}

export function CooperativeShortcutsScreen(
  props: CooperativeShortcutsScreenProps
) {
  return (
    <SafeArea className="bg-background">
      <View className="flex-1 gap-5 px-5 pt-5 pb-2">
        <ScreenHeader
          description="Cooperatives your account can open, and this phone's home-screen shortcut."
          leading={<ScreenBackButton onPress={props.onBack} />}
          title="Cooperatives"
        />
        <ScrollView contentContainerClassName="gap-6 pb-10">
          {props.shortcut && props.current ? (
            <View className="gap-3 rounded-xl border border-border bg-card p-4">
              <View className="flex-row items-center gap-4">
                <CooperativeShortcutTile
                  cooperativeName={props.current.name}
                  environment={props.environment}
                  mark={props.current.mark}
                />
                <View className="min-w-0 flex-1 gap-1">
                  <Text
                    accessibilityRole="header"
                    className="text-base font-bold text-foreground"
                  >
                    {props.shortcut.title}
                  </Text>
                  <Text className="text-sm leading-5 text-muted-foreground">
                    {props.shortcut.description}
                  </Text>
                </View>
              </View>
              {props.message ? (
                <Text
                  accessibilityLiveRegion="polite"
                  className="text-sm font-semibold text-foreground"
                >
                  {props.message}
                </Text>
              ) : null}
              {props.shortcut.actions.length > 0 ? (
                <View className="gap-2">
                  {props.shortcut.actions.map((action) => (
                    <Button
                      disabled={props.busyAction !== null}
                      key={action}
                      onPress={() => props.onAction(action)}
                      variant={action === "disable" ? "outline" : "default"}
                    >
                      <Text>
                        {props.busyAction === action
                          ? "Working…"
                          : ACTION_LABELS[action]}
                      </Text>
                    </Button>
                  ))}
                </View>
              ) : null}
              <Text className="text-xs leading-5 text-muted-foreground">
                {SHORTCUT_REMOVAL_INSTRUCTIONS}
              </Text>
              <Text className="text-xs leading-5 text-muted-foreground">
                {SHORTCUT_PRIVACY_NOTICE}
              </Text>
            </View>
          ) : null}

          <View className="gap-3">
            <Text
              accessibilityRole="header"
              className="text-lg font-bold tracking-tight text-foreground"
            >
              Your cooperatives
            </Text>
            {props.loading ? <LoadingSpinner /> : null}
            {props.loadError ? (
              <View className="gap-2">
                <Text className="text-sm text-muted-foreground">
                  {props.loadError}
                </Text>
                <Button onPress={props.onRetryLoad} variant="outline">
                  <Text>Try again</Text>
                </Button>
              </View>
            ) : null}
            {props.switchError ? (
              <Text
                accessibilityLiveRegion="polite"
                className="text-sm font-semibold text-destructive"
              >
                {props.switchError}
              </Text>
            ) : null}
            {(props.workspaces ?? []).map((workspace) => (
              <View
                className="gap-3 border-b border-border pb-4"
                key={workspace.tenant.id}
              >
                <View className="flex-row items-center gap-3">
                  <CooperativeShortcutTile
                    cooperativeName={workspace.tenant.name}
                    environment="production"
                    mark={workspace.tenant.mark}
                    size="small"
                  />
                  <View className="min-w-0 flex-1">
                    <Text
                      className="text-base font-bold text-foreground"
                      numberOfLines={2}
                    >
                      {workspace.tenant.name}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {workspace.isCurrent
                        ? "Open now"
                        : `${workspace.memberships.length} role${workspace.memberships.length === 1 ? "" : "s"}`}
                    </Text>
                  </View>
                </View>
                <View className="flex-row flex-wrap gap-2">
                  {workspace.memberships.map((membership) => {
                    const label = formatMembershipRole(membership.role)
                    const active = membership.id === props.activeMembershipId
                    return (
                      <Button
                        accessibilityLabel={
                          active
                            ? `${label} in ${workspace.tenant.name}, current`
                            : `Open ${workspace.tenant.name} as ${label}`
                        }
                        disabled={
                          active || props.switchingMembershipId !== null
                        }
                        key={membership.id}
                        onPress={() => props.onSwitch(membership.id)}
                        size="sm"
                        variant={active ? "secondary" : "outline"}
                      >
                        <Text>
                          {props.switchingMembershipId === membership.id
                            ? "Opening…"
                            : active
                              ? `${label} · Current`
                              : label}
                        </Text>
                      </Button>
                    )
                  })}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeArea>
  )
}
