import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import {
  projectBootstrapPresentation,
  type BootstrapScreenMode,
} from "@/features/bootstrap/model/bootstrap-presentation"
import { useColors } from "@/hooks/use-color"
import { ActivityIndicator, View } from "react-native"

type BootstrapScreenProps = {
  mode?: BootstrapScreenMode
  onRetry?: () => void
  retrying?: boolean
}

export function BootstrapScreen({
  mode = "loading",
  onRetry,
  retrying = false,
}: BootstrapScreenProps) {
  const colors = useColors()
  const presentation = projectBootstrapPresentation({ mode, retrying })
  const isFatal = mode === "fatal"

  return (
    <SafeArea className="bg-background">
      <View className="flex-1 px-6 pt-8 pb-6">
        <View className="flex-1 items-center justify-center pb-12">
          <View
            className={
              isFatal
                ? "size-[58px] items-center justify-center rounded-full bg-destructive/10"
                : "bg-brand size-[58px] items-center justify-center rounded-full"
            }
          >
            {isFatal ? (
              <Icon className="size-md text-destructive" name="WifiOff" />
            ) : (
              <Text className="text-brand-foreground text-[27px] font-black tracking-tighter">
                H
              </Text>
            )}
          </View>

          <Text
            accessibilityRole="header"
            className="mt-6 max-w-sm text-center text-[38px] leading-[40px] font-black tracking-tighter text-foreground"
          >
            {presentation.title}
          </Text>
          <Text className="mt-4 max-w-sm text-center text-[15px] leading-6 text-muted-foreground">
            {presentation.description}
          </Text>

          {isFatal ? (
            <Button
              accessibilityLabel={presentation.actionLabel ?? undefined}
              className="mt-8 w-full max-w-sm"
              disabled={retrying}
              onPress={onRetry}
              size="lg"
            >
              {retrying ? (
                <ActivityIndicator
                  accessibilityLabel="Retrying workspace verification"
                  color={colors.primaryForeground}
                  size="small"
                />
              ) : (
                <Icon
                  className="size-base text-primary-foreground"
                  name="RefreshCw"
                />
              )}
              <Text accessibilityLiveRegion="polite">
                {presentation.actionLabel}
              </Text>
            </Button>
          ) : (
            <View
              accessible
              accessibilityLabel="Verifying workspace access"
              accessibilityRole="progressbar"
              className="mt-8 flex-row items-center gap-1.5"
            >
              <View className="bg-brand h-1.5 w-7 rounded-full" />
              <View className="bg-brand/30 size-1.5 rounded-full" />
              <View className="bg-brand/20 size-1.5 rounded-full" />
            </View>
          )}
        </View>

        <View className="flex-row items-start gap-2.5 border-t border-border pt-5">
          <View className="bg-success/10 size-6 items-center justify-center rounded-full">
            <Icon className="size-sm text-success" name="ShieldCheck" />
          </View>
          <Text className="flex-1 text-xs leading-[18px] text-muted-foreground">
            {presentation.note}
          </Text>
        </View>
      </View>
    </SafeArea>
  )
}
