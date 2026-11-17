import { AppSheet } from "@/components/app/app-sheet"
import { Pressable } from "@/components/ui/pressable"
import { Icon } from "@/components/ui/icon"
import { ListCard } from "@/components/ui/list-card"
import { StatusBanner } from "@/components/ui/status-banner"
import { Text } from "@/components/ui/text"
import type { NotificationPreference } from "@/features/notifications/model/notification-center-types"
import { cn } from "@/lib/utils"
import { View } from "react-native"
import {
  NotificationPermissionRow,
  type NotificationPushControls,
} from "./notification-permission-row"

const preferenceIcons = {
  financing: ["HandCoins", "bg-tint-sky", "text-tint-sky-foreground"],
  cooperative: ["Megaphone", "bg-tint-vivid", "text-tint-vivid-foreground"],
  support: ["Headphones", "bg-accent", "text-accent-foreground"],
} as const

export function NotificationPreferencesScreen({
  error,
  onClose,
  onUpdatePreference,
  preferences,
  push,
  saving,
  visible,
}: {
  error: string | null
  onClose: () => void
  onUpdatePreference: (
    preference: NotificationPreference,
    enabled: boolean
  ) => void
  preferences: NotificationPreference[]
  push: NotificationPushControls
  saving: NotificationPreference["key"] | null
  visible: boolean
}) {
  return (
    <AppSheet onClose={onClose} title="Notification settings" visible={visible}>
      {push.disabled ? (
        <StatusBanner
          kind="offline"
          title="Settings are read-only"
          description="Connect to change notification settings."
        />
      ) : null}
      {error ? (
        <StatusBanner
          kind="error"
          title={`Couldn’t save ${error}`}
          description="Try again to save your change."
        />
      ) : null}
      <ListCard className="bg-muted dark:bg-surface-raised">
        <NotificationPermissionRow {...push} inSettings />
        {preferences.map((preference) => {
          if (preference.mandatory || !(preference.key in preferenceIcons))
            return null
          const [icon, surface, ink] =
            preferenceIcons[preference.key as keyof typeof preferenceIcons]
          const disabled =
            push.disabled || saving !== null || !preference.available
          return (
            <View
              className="min-h-[64px] flex-row items-center gap-[12px] px-[14px] py-[11px]"
              key={preference.key}
            >
              <View
                className={cn(
                  "size-[40px] shrink-0 items-center justify-center rounded-[14px]",
                  surface
                )}
              >
                <Icon className={cn("size-[20px]", ink)} name={icon} />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="font-bold" variant="body">
                  {preference.title}
                </Text>
                <Text
                  className="text-[13px] leading-[18px] text-muted-foreground"
                  variant="small"
                >
                  {saving === preference.key
                    ? "Saving…"
                    : preference.available
                      ? preference.description
                      : "Turned off by your cooperative"}
                </Text>
              </View>
              <Pressable
                accessibilityLabel={preference.title}
                accessibilityRole="switch"
                accessibilityState={{
                  checked: preference.enabled,
                  busy: saving === preference.key,
                }}
                className={cn(
                  "h-[31px] w-[51px] shrink-0 justify-center rounded-full px-[2px]",
                  preference.enabled
                    ? "items-end bg-primary"
                    : "items-start bg-border",
                  disabled && "opacity-50"
                )}
                disabled={disabled}
                haptic
                hitSlop={7}
                noRipple
                onPress={() =>
                  onUpdatePreference(preference, !preference.enabled)
                }
                testID={`notification-preference-${preference.key}`}
              >
                <View className="size-[27px] rounded-full bg-primary-foreground dark:bg-foreground" />
              </Pressable>
            </View>
          )
        })}
      </ListCard>
      <View className="flex-row items-start gap-[8px] px-[6px]">
        <Icon className="mt-px size-[15px] text-muted-foreground" name="Lock" />
        <Text
          className="flex-1 text-[13px] leading-[18px] text-muted-foreground"
          variant="small"
        >
          Security and transactions alerts are always on.
        </Text>
      </View>
    </AppSheet>
  )
}
