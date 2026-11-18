import { AppSheet } from "@/components/app/app-sheet"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import {
  RecordRow,
  rowPosition,
  type RowPosition,
} from "@/components/ui/list-card"
import { Pressable } from "@/components/ui/pressable"
import { StatusBanner } from "@/components/ui/status-banner"
import { Text } from "@/components/ui/text"
import { type MobileQaProfile } from "@/features/auth/api/mobile-qa-access"
import {
  filterQaProfiles,
  qaChooserLayout,
  qaRoleLabel,
} from "@/features/auth/model/qa-access-chooser"
import { useEffect, useMemo, useState } from "react"
import { ActivityIndicator, View } from "react-native"
import { useColors } from "@/hooks/use-color"

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
 * QA profile chooser (dev/QA builds only). Up to five profiles open as a
 * floating AppSheet; more open the full-screen form presentation with a
 * search field docked above the keyboard. Choosing a profile creates an
 * ordinary session.
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

  const rows =
    profiles.length > 0 ? (
      // Grouped RecordRows carry the AppList gutter; the sheet has its own.
      <View className="-mx-[18px]">
        {profiles.map((profile, index) => (
          <QaProfileRow
            disabled={props.enteringRef !== null}
            entering={props.enteringRef === profile.selectionRef}
            key={profile.selectionRef}
            onPress={() => props.onEnter(profile)}
            position={rowPosition(index, profiles.length)}
            profile={profile}
          />
        ))}
      </View>
    ) : null

  const body = (
    <>
      <QaDomainIntro
        environment={props.environment}
        qaDomain={props.qaDomain}
      />
      <QaProfilesState {...props} isEmpty={profiles.length === 0} />
      {rows}
    </>
  )

  if (full) {
    return (
      <AppSheet
        footer={
          <View className="gap-[12px]">
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
        variant="form"
        visible={props.visible}
      >
        <View className="gap-[16px]">{body}</View>
      </AppSheet>
    )
  }

  return (
    <AppSheet
      isSubmitting={props.enteringRef !== null}
      onClose={props.onClose}
      title="QA profiles"
      visible={props.visible}
    >
      {body}
      <QaDomainActions
        disabled={props.enteringRef !== null}
        onChangeDomain={props.onChangeDomain}
      />
    </AppSheet>
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
    <View className="gap-[4px]">
      <Text className="text-primary uppercase" variant="caption">
        QA access{environment ? ` · ${environment}` : ""}
      </Text>
      <Text className="text-foreground" variant="section">
        {qaDomain}
      </Text>
      <Text className="text-muted-foreground" variant="small">
        Choosing a profile creates a normal app session. No password is
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
  const colors = useColors()
  if (error) {
    return (
      <StatusBanner
        description={error}
        kind="error"
        onRetry={onRefresh}
        retryLabel="Try again"
        title="Profiles unavailable"
      />
    )
  }
  if (loading && profiles.length === 0) {
    return (
      <View className="min-h-[64px] items-center justify-center">
        <ActivityIndicator
          accessibilityLabel="Loading QA profiles"
          color={colors.primary}
        />
      </View>
    )
  }
  if (isEmpty) {
    return (
      <StatusBanner
        description={
          profiles.length
            ? "No QA profiles match this search."
            : "No eligible profiles are available for this QA domain."
        }
        kind="info"
        onRetry={onRefresh}
        retryLabel="Refresh"
        title="No QA profiles"
      />
    )
  }
  return null
}

function QaProfileRow({
  disabled,
  entering,
  onPress,
  position,
  profile,
}: {
  disabled: boolean
  entering: boolean
  onPress: () => void
  position: RowPosition
  profile: MobileQaProfile
}) {
  const colors = useColors()
  const role = qaRoleLabel(profile.role)
  return (
    <View
      accessibilityState={{
        busy: entering,
        disabled: disabled || !profile.eligible,
      }}
      className={profile.eligible ? undefined : "opacity-50"}
    >
      <RecordRow
        accessibilityLabel={`Open ${profile.identityLabel}, ${profile.cooperativeName}, as ${role}`}
        avatarName={profile.identityLabel}
        meta={`${profile.cooperativeName}${profile.memberCode ? ` · ${profile.memberCode}` : ""}`}
        onPress={disabled || !profile.eligible ? undefined : onPress}
        position={position}
        status={entering ? undefined : profile.eligible ? role : "Unavailable"}
        statusTone={profile.eligible ? "brand" : "neutral"}
        title={profile.identityLabel}
        trailing={
          entering ? (
            <ActivityIndicator
              accessibilityLabel="Opening profile"
              color={colors.primary}
            />
          ) : undefined
        }
      />
    </View>
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
    <View className="flex-row items-center justify-between gap-[12px]">
      <Text className="text-muted-foreground" variant="small">
        {total === undefined ? "" : `${total} profiles`}
      </Text>
      <Pressable
        accessibilityRole="button"
        className="min-h-[44px] justify-center px-[4px]"
        disabled={disabled}
        onPress={onChangeDomain}
      >
        <Text className="text-primary" variant="label">
          Change QA domain
        </Text>
      </Pressable>
    </View>
  )
}
