import { ScreenBackButton } from "@/components/app/screen-back-button"
import { ScreenHeader } from "@/components/app/screen-header"
import { Text } from "@/components/ui/text"
import type { NotificationPreference } from "@/features/notifications/model/notification-center-types"
import { useColors } from "@/hooks/use-color"
import { cn } from "@/lib/utils"
import { Pressable, View, type TextStyle } from "react-native"

function scaledTextStyle(
  accessibilityScale: number,
  fontSize: number,
  lineHeight: number,
  overrides?: Pick<TextStyle, "color" | "fontWeight">
) {
  return {
    fontSize: fontSize * accessibilityScale,
    lineHeight: lineHeight * accessibilityScale,
    ...overrides,
  }
}

function PreferenceRow({
  accessibilityScale,
  isLast,
  isUpdating,
  largeTextLayout,
  onChange,
  preference,
}: {
  accessibilityScale: number
  isLast: boolean
  isUpdating: boolean
  largeTextLayout: boolean
  onChange: (preference: NotificationPreference, enabled: boolean) => void
  preference: NotificationPreference
}) {
  const colors = useColors()
  const disabled = isUpdating || !preference.available

  return (
    <View
      className={cn(
        "relative gap-4 py-5",
        largeTextLayout
          ? "items-start"
          : "min-h-20 flex-row items-center justify-between"
      )}
    >
      <Text
        allowFontScaling={false}
        className={cn(
          "min-w-0 text-sm font-extrabold text-foreground",
          largeTextLayout ? "w-full" : "flex-1"
        )}
        style={scaledTextStyle(accessibilityScale, 14, 20, {
          color: colors.foreground,
          fontWeight: "800",
        })}
      >
        {preference.title}
      </Text>
      {preference.mandatory ? (
        <Text
          allowFontScaling={false}
          className="text-xs font-extrabold text-brand"
          style={scaledTextStyle(accessibilityScale, 12, 17, {
            color: colors.brand,
            fontWeight: "800",
          })}
        >
          Always on
        </Text>
      ) : (
        <Pressable
          accessibilityLabel={preference.title}
          accessibilityRole="switch"
          accessibilityState={{
            checked: preference.enabled,
            disabled,
          }}
          className={cn(
            "h-8 w-14 shrink-0 justify-center rounded-full p-1",
            preference.enabled ? "bg-brand" : "bg-input",
            disabled && "opacity-50"
          )}
          disabled={disabled}
          onPress={() => onChange(preference, !preference.enabled)}
          testID={`notification-preference-${preference.key}`}
        >
          <View
            className={cn(
              "size-6 rounded-full bg-brand-foreground",
              preference.enabled ? "self-end" : "self-start"
            )}
          />
        </Pressable>
      )}
      {!isLast ? (
        <View className="absolute right-0 bottom-0 left-0 h-px bg-border" />
      ) : null}
    </View>
  )
}

export function NotificationPreferencesScreen({
  accessibilityScale,
  error,
  isUpdatingPreference,
  largeTextLayout,
  onClose,
  onUpdatePreference,
  preferences,
}: {
  accessibilityScale: number
  error: string | null
  isUpdatingPreference: boolean
  largeTextLayout: boolean
  onClose: () => void
  onUpdatePreference: (
    preference: NotificationPreference,
    enabled: boolean
  ) => void
  preferences: NotificationPreference[]
}) {
  const colors = useColors()
  const required = preferences.filter((item) => item.mandatory)
  const optional = preferences.filter((item) => !item.mandatory)

  return (
    <View className="gap-5">
      <ScreenHeader
        leading={<ScreenBackButton onPress={onClose} />}
        title="Notification settings"
      />
      {error ? (
        <Text
          accessibilityLiveRegion="assertive"
          allowFontScaling={false}
          className="border-y border-destructive/40 py-3 text-sm font-semibold text-destructive"
          style={scaledTextStyle(accessibilityScale, 14, 20, {
            color: colors.destructive,
            fontWeight: "600",
          })}
        >
          {error}
        </Text>
      ) : null}
      {required.length ? (
        <View>
          <Text
            allowFontScaling={false}
            className="border-b border-border pb-2 text-xs font-extrabold tracking-widest text-muted-foreground uppercase"
            style={scaledTextStyle(accessibilityScale, 11, 16, {
              color: colors.mutedForeground,
              fontWeight: "800",
            })}
          >
            Required
          </Text>
          {required.map((preference, index) => (
            <PreferenceRow
              accessibilityScale={accessibilityScale}
              isLast={index === required.length - 1}
              isUpdating={isUpdatingPreference}
              key={preference.key}
              largeTextLayout={largeTextLayout}
              onChange={onUpdatePreference}
              preference={preference}
            />
          ))}
        </View>
      ) : null}
      {optional.length ? (
        <View>
          <Text
            allowFontScaling={false}
            className="border-b border-border pb-2 text-xs font-extrabold tracking-widest text-muted-foreground uppercase"
            style={scaledTextStyle(accessibilityScale, 11, 16, {
              color: colors.mutedForeground,
              fontWeight: "800",
            })}
          >
            Optional
          </Text>
          {optional.map((preference, index) => (
            <PreferenceRow
              accessibilityScale={accessibilityScale}
              isLast={index === optional.length - 1}
              isUpdating={isUpdatingPreference}
              key={preference.key}
              largeTextLayout={largeTextLayout}
              onChange={onUpdatePreference}
              preference={preference}
            />
          ))}
        </View>
      ) : null}
      {isUpdatingPreference ? (
        <Text
          accessibilityLiveRegion="polite"
          allowFontScaling={false}
          className="text-xs text-muted-foreground"
          style={scaledTextStyle(accessibilityScale, 12, 17, {
            color: colors.mutedForeground,
          })}
        >
          Saving…
        </Text>
      ) : null}
    </View>
  )
}
