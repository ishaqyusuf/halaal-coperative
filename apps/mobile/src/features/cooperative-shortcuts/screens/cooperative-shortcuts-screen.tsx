import { AppSheet } from "@/components/app/app-sheet"
import { ConfirmSheet } from "@/components/app/confirm-sheet"
import { GroupedRow, GroupedSection } from "@/components/app/grouped-section"
import { ScreenShell } from "@/components/app/screen-shell"
import { Icon } from "@/components/ui/icon"
import { ListSkeleton } from "@/components/ui/skeleton"
import { StatusBanner } from "@/components/ui/status-banner"
import { StatusPill } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { useColors } from "@/hooks/use-color"
import { useState } from "react"
import { ActivityIndicator, View } from "react-native"

import {
  formatMembershipRole,
  SHORTCUT_PRIVACY_NOTICE,
  SHORTCUT_REMOVAL_INSTRUCTIONS,
  type CooperativeWorkspace,
  type ShortcutPresentation,
} from "../model/shortcut-policy"
import {
  roleDescription,
  rolesLine,
  SHORTCUT_ACTION_ROWS,
  splitWorkspaces,
  workspaceMark,
} from "../model/shortcut-presentation"
import type { StatusTone } from "@/components/ui/status-pill"

export type ShortcutAction = ShortcutPresentation["actions"][number]

export type CooperativeShortcutsScreenProps = {
  activeMembershipId: string | null
  busyAction: ShortcutAction | null
  /** From the signed profile, shown before the list loads. */
  current: { mark: string; name: string; role: string } | null
  loadError: string | null
  loading: boolean
  message: string | null
  offline: boolean
  onAction: (action: ShortcutAction) => void
  onBack: () => void
  onRefresh: () => void
  onRetryLoad: () => void
  onSwitch: (membershipId: string) => void
  refreshing: boolean
  shortcut: (ShortcutPresentation & { checking: boolean; pill: { label: string; tone: StatusTone } }) | null
  switchError: string | null
  switchingMembershipId: string | null
  workspaces: CooperativeWorkspace[] | null
}

/**
 * Cooperatives & shortcuts on 03 Grouped settings (T27): Current (with the
 * other roles here), Other cooperatives, and on Android the Home screen
 * shortcut with its actions as rows. A cooperative with several roles opens
 * an "Open as" picker; disabling the shortcut asks first.
 */
export function CooperativeShortcutsScreen(props: CooperativeShortcutsScreenProps) {
  const colors = useColors()
  const [rolesFor, setRolesFor] = useState<CooperativeWorkspace | null>(null)
  const [confirmDisable, setConfirmDisable] = useState(false)
  const split = props.workspaces ? splitWorkspaces(props.workspaces, props.activeMembershipId) : null
  const switching = props.switchingMembershipId !== null
  const currentName = split?.current?.tenant.name ?? props.current?.name ?? "This cooperative"
  const currentMark = split?.current ? workspaceMark(split.current) : (props.current?.mark ?? "")
  const currentRole = split?.currentRole
    ? formatMembershipRole(split.currentRole.role)
    : (props.current?.role ?? "")
  const spinner = <ActivityIndicator color={colors.mutedForeground} size="small" />

  function openWorkspace(workspace: CooperativeWorkspace) {
    if (workspace.memberships.length > 1) setRolesFor(workspace)
    else if (workspace.memberships[0]) props.onSwitch(workspace.memberships[0].id)
  }

  return (
    <ScreenShell
      back={props.onBack}
      onRefresh={props.workspaces ? props.onRefresh : undefined}
      refreshing={props.refreshing}
      testID="cooperative-shortcuts-screen"
      title="Cooperatives & shortcuts"
    >
      <GroupedSection caption="Current">
        <GroupedRow
          accessibilityLabel={`${currentName}, ${currentRole}, open now`}
          detail={`${currentRole ? `${currentRole} · ` : ""}Open now`}
          key="current"
          mark={currentMark}
          markTone="solid"
          title={currentName}
          trailing={
            <View className="size-[26px] items-center justify-center rounded-full bg-primary">
              <Icon className="size-[15px] text-primary-foreground" name="Check" />
            </View>
          }
        />
        {(split?.otherRoles ?? []).map((membership) => {
          const busy = props.switchingMembershipId === membership.id
          return (
            <GroupedRow
              accessibilityLabel={`Open ${currentName} as ${formatMembershipRole(membership.role)}`}
              chevron={!busy}
              detail={busy ? "Opening…" : "Same cooperative, different role"}
              disabled={(switching && !busy) || props.offline}
              icon="ArrowLeftRight"
              key={membership.id}
              onPress={busy ? undefined : () => props.onSwitch(membership.id)}
              testID={`cooperative-role-${membership.id}`}
              title={`Open as ${formatMembershipRole(membership.role)}`}
              tone="sky"
              trailing={busy ? spinner : undefined}
            />
          )
        })}
      </GroupedSection>

      {props.switchError ? <StatusBanner kind="error" title={props.switchError} /> : null}
      {props.offline ? (
        <StatusBanner
          kind="offline"
          onRetry={props.onRetryLoad}
          title="Connect to the internet to see all your cooperatives."
        />
      ) : props.loadError ? (
        <StatusBanner kind="error" onRetry={props.onRetryLoad} title={props.loadError} />
      ) : null}

      {props.loading && !props.workspaces ? (
        <View className="gap-[7px]">
          <Text className="px-[16px] uppercase tracking-[0.8px] text-muted-foreground" variant="caption">
            Other cooperatives
          </Text>
          <ListSkeleton rows={2} />
        </View>
      ) : split ? (
        <GroupedSection caption={`Other cooperatives${split.others.length ? ` · ${split.others.length}` : ""}`}>
          {split.others.length ? (
            split.others.map((workspace) => {
              const busyRole = workspace.memberships.find(
                (membership) => membership.id === props.switchingMembershipId
              )
              return (
                <GroupedRow
                  accessibilityLabel={
                    workspace.memberships.length > 1
                      ? `${workspace.tenant.name}, choose a role`
                      : `Open ${workspace.tenant.name} as ${rolesLine(workspace)}`
                  }
                  chevron={!busyRole}
                  detail={busyRole ? "Opening…" : rolesLine(workspace)}
                  disabled={(switching && !busyRole) || props.offline}
                  key={workspace.tenant.id}
                  mark={workspaceMark(workspace)}
                  onPress={busyRole ? undefined : () => openWorkspace(workspace)}
                  testID={`cooperative-${workspace.tenant.id}`}
                  title={workspace.tenant.name}
                  trailing={busyRole ? spinner : undefined}
                />
              )
            })
          ) : (
            <GroupedRow
              icon="Users"
              key="only"
              title="This is the only cooperative on your account."
              tone="neutral"
            />
          )}
        </GroupedSection>
      ) : null}

      {props.shortcut ? (
        <View className="gap-[8px]">
          <GroupedSection
            caption="Home screen"
            footnote={`${SHORTCUT_REMOVAL_INSTRUCTIONS}\n${SHORTCUT_PRIVACY_NOTICE}`}
          >
            <GroupedRow
              detail={props.shortcut.description}
              key="state"
              mark={currentMark}
              markTone="solid"
              title={props.shortcut.title}
              trailing={
                props.shortcut.checking ? spinner : (
                  <StatusPill label={props.shortcut.pill.label} tone={props.shortcut.pill.tone} />
                )
              }
            />
            {props.shortcut.actions.map((action) => {
              const meta = SHORTCUT_ACTION_ROWS[action]
              const busy = props.busyAction === action
              return (
                <GroupedRow
                  chevron={!busy && action !== "disable"}
                  destructive={action === "disable"}
                  disabled={props.busyAction !== null && !busy}
                  icon={meta.icon}
                  key={action}
                  onPress={
                    busy
                      ? undefined
                      : action === "disable"
                        ? () => setConfirmDisable(true)
                        : () => props.onAction(action)
                  }
                  testID={`shortcut-action-${action}`}
                  title={busy ? meta.busy : meta.label}
                  tone={meta.tone}
                  trailing={busy ? spinner : undefined}
                />
              )
            })}
          </GroupedSection>
          {props.message ? (
            <Text accessibilityLiveRegion="polite" className="px-[16px] font-semibold" variant="small">
              {props.message}
            </Text>
          ) : null}
        </View>
      ) : null}

      <AppSheet
        accessibilityLabel="Open as"
        onClose={() => setRolesFor(null)}
        title="Open as"
        variant="picker"
        visible={rolesFor !== null}
      >
        {rolesFor ? (
          <View className="gap-[10px] pb-[16px]">
            <Text className="text-center text-muted-foreground" variant="small">
              {rolesFor.tenant.name}
            </Text>
            <GroupedSection>
              {rolesFor.memberships.map((membership) => (
                <GroupedRow
                  chevron
                  detail={roleDescription(membership)}
                  icon={membership.workspaceRole === "member" ? "UserRound" : "ShieldCheck"}
                  key={membership.id}
                  onPress={() => {
                    setRolesFor(null)
                    props.onSwitch(membership.id)
                  }}
                  testID={`open-as-${membership.id}`}
                  title={formatMembershipRole(membership.role)}
                  tone={membership.workspaceRole === "member" ? "mint" : "sky"}
                />
              ))}
            </GroupedSection>
          </View>
        ) : null}
      </AppSheet>

      <ConfirmSheet
        cancelLabel="Keep shortcut"
        confirmLabel="Disable shortcut"
        description={`The ${currentName} tile stops opening HalaalVest. You can then remove it from your launcher.`}
        icon="Ban"
        onCancel={() => setConfirmDisable(false)}
        onConfirm={() => {
          setConfirmDisable(false)
          props.onAction("disable")
        }}
        title="Disable this shortcut?"
        tone="destructive"
        visible={confirmDisable}
      />
    </ScreenShell>
  )
}
