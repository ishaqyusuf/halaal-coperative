import { CompactFormSheet } from "@/components/app/compact-form-sheet"
import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { FormStateBanner } from "@/components/app/form-state-banner"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Textarea } from "@/components/ui/textarea"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { mobileDevQuickFill } from "@/dev/mobile-dev-quick-fill"
import { View } from "react-native"
import {
  getOperationProfileService,
  isRestrictiveOperationProfileChange,
  operationProfileModeOptions,
} from "../model/operation-profile-policy"
import type {
  OperationProfileAccessMode,
  OperationProfileServiceKey,
} from "../model/operation-profile-types"

export function OperationProfileEditSheet({
  changeReason,
  currentAccessMode,
  error,
  isStale,
  nextAccessMode,
  onChangeReason,
  onClose,
  onDismissed,
  onNextAccessMode,
  onReview,
  serviceKey,
  visible,
}: {
  changeReason: string
  currentAccessMode: OperationProfileAccessMode
  error: string | null
  isStale: boolean
  nextAccessMode: OperationProfileAccessMode
  onChangeReason: (value: string) => void
  onClose: () => void
  onDismissed: () => void
  onNextAccessMode: (value: OperationProfileAccessMode) => void
  onReview: () => void
  serviceKey: OperationProfileServiceKey
  visible: boolean
}) {
  const service = getOperationProfileService(serviceKey)
  const restrictive = isRestrictiveOperationProfileChange({
    next: nextAccessMode,
    previous: currentAccessMode,
  })
  const dirty =
    nextAccessMode !== currentAccessMode || changeReason.trim().length > 0
  const canReview =
    nextAccessMode !== currentAccessMode &&
    (!restrictive || changeReason.trim().length > 0)

  return (
    <CompactFormSheet
      dirty={dirty}
      footer={
        <View className="flex-row items-center gap-3 px-5 pt-3 pb-5">
          <DevQuickFill
            label="Quick fill Operation Profile change reason"
            onPress={() =>
              onChangeReason(mobileDevQuickFill.operationProfile.changeReason)
            }
            placement="footer"
            portal={false}
          />
          <Button
            accessibilityLabel={`Review ${service.label} access change`}
            className={`min-h-11 min-w-0 flex-1 ${canReview ? "" : "bg-muted opacity-100"}`}
            disabled={!canReview}
            onPress={onReview}
          >
            <Text className={canReview ? undefined : "text-muted-foreground"}>
              Review change
            </Text>
            <Icon
              className={
                canReview
                  ? "size-base text-primary-foreground"
                  : "size-base text-muted-foreground"
              }
              name="ArrowRight"
            />
          </Button>
        </View>
      }
      onClose={onClose}
      onDismissed={onDismissed}
      title={service.label}
      visible={visible}
    >
      <View>
        {operationProfileModeOptions.map((option) => {
          const selected = option.value === nextAccessMode
          return (
            <Pressable
              accessibilityHint={option.description}
              accessibilityLabel={`${option.label}. ${option.summary}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              className="min-h-11 flex-row items-center gap-3 border-b border-border py-3 active:bg-accent/40"
              haptic
              key={option.value}
              onPress={() => onNextAccessMode(option.value)}
            >
              <View
                className={
                  selected
                    ? "h-5 w-5 items-center justify-center rounded-full border-2 border-primary"
                    : "h-5 w-5 rounded-full border border-border"
                }
              >
                {selected ? (
                  <View className="h-2.5 w-2.5 rounded-full bg-primary" />
                ) : null}
              </View>
              <View className="min-w-0 flex-1 flex-row flex-wrap items-center justify-between gap-2">
                <Text className="shrink text-sm font-semibold text-foreground">
                  {option.label}
                </Text>
                {option.value === currentAccessMode ? (
                  <Text className="text-xs text-muted-foreground">Current</Text>
                ) : null}
              </View>
            </Pressable>
          )
        })}
      </View>

      <View className="gap-2">
        <View className="flex-row flex-wrap items-center justify-between gap-2">
          <Text className="text-sm font-semibold text-foreground">
            Change reason
          </Text>
          <Text className="text-xs text-muted-foreground">
            {restrictive ? "Required" : "Optional"}
          </Text>
        </View>
        <Textarea
          accessibilityLabel="Operation Profile change reason"
          multiline
          numberOfLines={3}
          onChangeText={onChangeReason}
          placeholder="Why is this access mode changing?"
          returnKeyType="done"
          textAlignVertical="top"
          value={changeReason}
        />
      </View>

      <FormStateBanner hasDraft={false} isStale={isStale} />

      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          className="text-sm font-medium text-destructive"
        >
          {error}
        </Text>
      ) : null}
    </CompactFormSheet>
  )
}
