import { AppAutoUpdateStep } from "@/components/app-auto-update-step"
import { FloatingBottomSheet } from "@/components/floating-bottom-sheet"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { useColors } from "@/hooks/use-color"
import { useLaunchAutoUpdate } from "@/hooks/use-launch-auto-update"
import {
  AUTO_UPDATE_STEPS,
  getAutoUpdateStepState,
  getLaunchAutoUpdateProgress,
} from "@/lib/launch-auto-update"
import { View } from "react-native"

export function AppAutoUpdateModal() {
  const colors = useColors()
  const { dismissFailure, downloadProgress, errorMessage, phase, visible } =
    useLaunchAutoUpdate()

  const failed = phase === "failed"
  const progress = getLaunchAutoUpdateProgress(phase, downloadProgress)
  const title = failed
    ? "Update paused"
    : phase === "downloading"
      ? "Downloading update"
      : phase === "updating"
        ? "Applying update"
        : "Restarting app"
  const message = failed
    ? (errorMessage ?? "The update could not be applied.")
    : phase === "downloading"
      ? "A new version is available. Keep the app open while it downloads."
      : phase === "updating"
        ? "Preparing the new version and verifying the update."
        : "Restarting into the updated app."

  return (
    <FloatingBottomSheet
      accessibilityLabel={title}
      dismissible={failed}
      onClose={failed ? dismissFailure : () => undefined}
      presentation="compact"
      scrollable="auto"
      title={title}
      visible={visible}
    >
      <View className="items-center gap-5 px-5 pt-3 pb-6">
        <View
          className={
            failed
              ? "h-16 w-16 items-center justify-center rounded-full bg-destructive"
              : "h-16 w-16 items-center justify-center rounded-full bg-secondary"
          }
        >
          <Icon
            className={
              failed
                ? "size-xl text-destructive-foreground"
                : "size-xl text-primary"
            }
            name={failed ? "AlertCircle" : "Zap"}
          />
        </View>
        <Text className="text-center text-sm leading-5 text-muted-foreground">
          {message}
        </Text>

        {!failed ? (
          <View className="w-full gap-5">
            <View className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <View
                className="h-full rounded-full"
                style={{
                  backgroundColor: colors.primary,
                  width: `${Math.round(progress * 100)}%`,
                }}
              />
            </View>
            <View className="gap-4">
              {AUTO_UPDATE_STEPS.map((label) => {
                const state = getAutoUpdateStepState(phase, label)
                return (
                  <AppAutoUpdateStep key={label} label={label} {...state} />
                )
              })}
            </View>
          </View>
        ) : (
          <Button className="h-11 w-full" onPress={dismissFailure}>
            <Text>Continue</Text>
          </Button>
        )}
      </View>
    </FloatingBottomSheet>
  )
}
