import { CompactFormSheet } from "@/components/app/compact-form-sheet"
import { FullScreenFormSheet } from "@/components/app/full-screen-form-sheet"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { type MobileQaProfile } from "@/features/auth/api/mobile-qa-access"
import {
  filterQaProfiles,
  qaChooserLayout,
  qaProfileInitials,
  qaRoleLabel,
} from "@/features/auth/model/qa-access-chooser"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { cn } from "@/lib/utils"
import { useEffect, useMemo, useState } from "react"
import { View } from "react-native"

type QaProfileChooserProps = {
  enteringRef: string | null
  environment: string
  error: string | null
  loading: boolean
  onChangeDomain: () => void
  onClose: () => void
  onEnter: (profile: MobileQaProfile) => void
  onRefresh: () => void
  profiles: MobileQaProfile[]
  qaDomain: string
  visible: boolean
}

/**
 * QA profile chooser. A few profiles sit in a compact sheet sized to its
 * rows; more than five open a full-screen list with search docked at the
 * bottom. Either way, selecting a profile creates an ordinary session.
 */
export function QaProfileChooser(props: QaProfileChooserProps) {
  const [search, setSearch] = useState("")
  const full = qaChooserLayout(props.profiles.length) === "full"
  const profiles = useMemo(
    () => (full ? filterQaProfiles(props.profiles, search) : props.profiles),
    [full, props.profiles, search]
  )

  useEffect(() => {
    if (!props.visible) setSearch("")
  }, [props.visible])

  const body = (
    <>
      <QaDomainIntro
        environment={props.environment}
        qaDomain={props.qaDomain}
      />
      <QaProfilesState {...props} isEmpty={profiles.length === 0} />
      {profiles.length > 0 ? (
        <View className="gap-2">
          {profiles.map((profile) => (
            <QaProfileRow
              disabled={props.enteringRef !== null}
              entering={props.enteringRef === profile.selectionRef}
              key={profile.selectionRef}
              onPress={() => props.onEnter(profile)}
              profile={profile}
            />
          ))}
        </View>
      ) : null}
    </>
  )

  if (full) {
    return (
      <FullScreenFormSheet
        footer={
          <View className="gap-3">
            <Input
              accessibilityLabel="Search QA profiles"
              autoCapitalize="none"
              autoCorrect={false}
              leading={
                <Icon className="size-sm text-muted-foreground" name="Search" />
              }
              onChangeText={setSearch}
              placeholder="Cooperative, name, role or member code"
              returnKeyType="search"
              value={search}
            />
            <QaDomainActions
              disabled={props.enteringRef !== null}
              onChangeDomain={props.onChangeDomain}
              total={props.profiles.length}
            />
          </View>
        }
        isSubmitting={props.enteringRef !== null}
        onClose={props.onClose}
        title="QA profiles"
        visible={props.visible}
      >
        {body}
      </FullScreenFormSheet>
    )
  }

  return (
    <CompactFormSheet
      isSubmitting={props.enteringRef !== null}
      onClose={props.onClose}
      title="QA profiles"
      visible={props.visible}
    >
      <View className="gap-4">
        {body}
        <QaDomainActions
          disabled={props.enteringRef !== null}
          onChangeDomain={props.onChangeDomain}
        />
      </View>
    </CompactFormSheet>
  )
}

function QaDomainIntro({
  environment,
  qaDomain,
}: {
  environment: string
  qaDomain: string
}) {
  return (
    <View className="gap-1">
      <Text className="text-success text-xs font-bold tracking-widest uppercase">
        QA access{environment ? ` · ${environment}` : ""}
      </Text>
      <Text className="text-sm font-semibold text-foreground">{qaDomain}</Text>
      <Text className="text-xs leading-5 text-muted-foreground">
        Selecting a profile creates a normal app session. No password is
        returned, displayed, or filled.
      </Text>
    </View>
  )
}

function QaProfilesState({
  error,
  isEmpty,
  loading,
  onRefresh,
  profiles,
}: QaProfileChooserProps & { isEmpty: boolean }) {
  if (error) {
    return (
      <QaStatus
        actionLabel="Try again"
        icon="TriangleAlert"
        message={error}
        onAction={onRefresh}
        title="Profiles unavailable"
        tone="destructive"
      />
    )
  }
  if (loading && profiles.length === 0) {
    return (
      <QaStatus
        icon="RefreshCw"
        message="Loading the eligible profiles for this exact QA Domain."
        title="Loading QA profiles"
      />
    )
  }
  if (isEmpty) {
    return (
      <QaStatus
        actionLabel="Refresh"
        icon="Users"
        message={
          profiles.length
            ? "No QA profiles match this search."
            : "No eligible profiles are available for this QA Domain."
        }
        onAction={onRefresh}
        title="No QA profiles"
      />
    )
  }
  return null
}

function QaStatus({
  actionLabel,
  icon,
  message,
  onAction,
  title,
  tone = "primary",
}: {
  actionLabel?: string
  icon: string
  message: string
  onAction?: () => void
  title: string
  tone?: "destructive" | "primary"
}) {
  const destructive = tone === "destructive"
  return (
    <View
      accessibilityLiveRegion="polite"
      className={cn(
        "flex-row items-start gap-3 rounded-2xl border px-4 py-3",
        destructive
          ? "border-destructive/30 bg-destructive/5"
          : "border-border bg-muted"
      )}
    >
      <Icon
        className={cn(
          "size-sm mt-0.5",
          destructive ? "text-destructive" : "text-brand"
        )}
        name={icon}
      />
      <View className="min-w-0 flex-1 gap-1">
        <Text className="text-sm font-bold text-foreground">{title}</Text>
        <Text className="text-xs leading-5 text-muted-foreground">
          {message}
        </Text>
        {actionLabel && onAction ? (
          <Pressable
            accessibilityRole="button"
            className="min-h-11 justify-center self-start"
            onPress={onAction}
          >
            <Text className="text-brand text-sm font-bold">{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

function QaProfileRow({
  disabled,
  entering,
  onPress,
  profile,
}: {
  disabled: boolean
  entering: boolean
  onPress: () => void
  profile: MobileQaProfile
}) {
  const largeTextLayout = useLargeTextLayout()
  const role = qaRoleLabel(profile.role)
  return (
    <Pressable
      accessibilityHint="Signs in through the ordinary app session"
      accessibilityLabel={`Open ${profile.identityLabel}, ${profile.cooperativeName}, as ${role}`}
      accessibilityRole="button"
      accessibilityState={{
        busy: entering,
        disabled: disabled || !profile.eligible,
      }}
      className={cn(
        "min-h-16 gap-3 rounded-2xl border border-border bg-card px-4 py-3 active:bg-muted",
        largeTextLayout ? "items-start" : "flex-row items-center",
        !profile.eligible && "opacity-50"
      )}
      disabled={disabled || !profile.eligible}
      haptic
      onPress={onPress}
      transition
    >
      <View className="bg-brand/10 size-10 items-center justify-center rounded-xl">
        <Text className="text-brand text-xs font-black">
          {qaProfileInitials(profile.identityLabel)}
        </Text>
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text
          className="font-bold text-foreground"
          numberOfLines={largeTextLayout ? undefined : 1}
        >
          {profile.identityLabel}
        </Text>
        <Text
          className="text-xs text-muted-foreground"
          numberOfLines={largeTextLayout ? undefined : 1}
        >
          {profile.cooperativeName}
          {profile.memberCode ? ` · ${profile.memberCode}` : ""}
        </Text>
      </View>
      <View className="rounded-full bg-muted px-2.5 py-1">
        <Text className="text-[10px] font-black text-muted-foreground uppercase">
          {entering ? "Opening…" : profile.eligible ? role : "Unavailable"}
        </Text>
      </View>
    </Pressable>
  )
}

function QaDomainActions({
  disabled,
  onChangeDomain,
  total,
}: {
  disabled: boolean
  onChangeDomain: () => void
  total?: number
}) {
  return (
    <View className="flex-row items-center justify-between gap-3 border-t border-border pt-3">
      <Text className="text-xs text-muted-foreground">
        {total === undefined ? "" : `${total} profiles`}
      </Text>
      <Pressable
        accessibilityRole="button"
        className="min-h-11 justify-center px-1"
        disabled={disabled}
        onPress={onChangeDomain}
      >
        <Text className="text-brand text-sm font-bold">Change QA Domain</Text>
      </Pressable>
    </View>
  )
}
