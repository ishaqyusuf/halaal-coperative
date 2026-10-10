import { ConfirmationRow } from "@/components/app/confirmation-row"
import { FloatingBottomSheet } from "@/components/floating-bottom-sheet"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { cn } from "@/lib/utils"
import { useWindowDimensions, View } from "react-native"

export function OperationProfileConflictSheet({
  error,
  isRefreshing,
  nextModeLabel,
  onKeepEditing,
  onDismissed,
  onRefreshAndReview,
  reviewedModeLabel,
  serviceLabel,
  visible,
}: {
  error: string | null
  isRefreshing: boolean
  nextModeLabel: string
  onKeepEditing: () => void
  onDismissed: () => void
  onRefreshAndReview: () => void
  reviewedModeLabel: string
  serviceLabel: string
  visible: boolean
}) {
  const largeTextLayout = useLargeTextLayout()
  const { height } = useWindowDimensions()

  return (
    <FloatingBottomSheet
      accessibilityLabel="Settings changed"
      dismissible={!isRefreshing}
      footer={
        <View
          className={cn(
            "gap-2 px-5 pt-3 pb-5",
            largeTextLayout ? "items-stretch" : "flex-row"
          )}
        >
          <Button
            className={cn(
              "min-h-11 py-2",
              largeTextLayout ? "w-full" : "flex-1"
            )}
            disabled={isRefreshing}
            onPress={onKeepEditing}
            variant="outline"
          >
            <Text>Keep editing</Text>
          </Button>
          <Button
            className={cn(
              "min-h-11 py-2",
              largeTextLayout ? "w-full" : "flex-1"
            )}
            disabled={isRefreshing}
            onPress={onRefreshAndReview}
          >
            <Icon
              className="size-base text-primary-foreground"
              name={isRefreshing ? "LoaderCircle" : "RefreshCw"}
            />
            <Text>{isRefreshing ? "Refreshing" : "Refresh & review"}</Text>
          </Button>
        </View>
      }
      maxDynamicContentSize={
        largeTextLayout
          ? Math.max(480, height * 0.78)
          : Math.min(540, height * 0.64)
      }
      onClose={onKeepEditing}
      onDismissed={onDismissed}
      presentation="compact"
      scrollable="auto"
      title="Settings changed"
      visible={visible}
    >
      <View className="gap-4 px-5 pt-3 pb-4">
        <View className="bg-warn/10 h-11 w-11 items-center justify-center rounded-full">
          <Icon className="size-lg text-warn" name="TriangleAlert" />
        </View>

        <Text className="text-sm leading-5 text-muted-foreground">
          {serviceLabel} changed while you were reviewing. Refresh the latest
          setting before confirming.
        </Text>

        {error ? (
          <View className="flex-row items-start gap-3 rounded-xl bg-destructive/10 p-3">
            <Icon
              className="size-sm mt-0.5 text-destructive"
              name="AlertCircle"
            />
            <Text
              accessibilityLiveRegion="polite"
              className="min-w-0 flex-1 text-sm leading-5 font-medium text-destructive"
            >
              {error}
            </Text>
          </View>
        ) : null}

        <View className="border-t border-border">
          <ConfirmationRow
            className="min-h-11"
            label="Review based on"
            showIcon={false}
            value={reviewedModeLabel}
          />
          <ConfirmationRow
            className="min-h-11"
            label="Your change"
            showIcon={false}
            value={nextModeLabel}
          />
        </View>

        <View className="gap-1 border-l-2 border-primary pl-3">
          <Text className="text-sm font-bold text-foreground">
            Your draft is safe
          </Text>
          <Text className="text-xs leading-5 text-muted-foreground">
            The selected mode and audit reason will stay in the editor.
          </Text>
        </View>
      </View>
    </FloatingBottomSheet>
  )
}
