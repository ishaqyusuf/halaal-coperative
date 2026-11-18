import { AppSheet } from "@/components/app/app-sheet"
import { ReviewRow } from "@/components/app/result-screen"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { cn } from "@/lib/utils"
import { View } from "react-native"
import { ProfileBanner } from "./operation-profile-ui"

export function OperationProfileConflictSheet({
  error,
  isRefreshing,
  nextModeLabel,
  onKeepEditing,
  onRefreshAndReview,
  reviewedModeLabel,
  serviceLabel,
  visible,
}: {
  error: string | null
  isRefreshing: boolean
  nextModeLabel: string
  onKeepEditing: () => void
  onRefreshAndReview: () => void
  reviewedModeLabel: string
  serviceLabel: string
  visible: boolean
}) {
  const largeText = useLargeTextLayout()
  return (
    <AppSheet
      accessibilityLabel="Settings changed"
      dismissible={!isRefreshing}
      expandedTitle="Settings changed"
      footer={
        <View className={cn("gap-[10px]", !largeText && "flex-row")}>
          <Button
            className={cn("bg-surface-raised", !largeText && "flex-1 px-[8px]")}
            disabled={isRefreshing}
            onPress={onKeepEditing}
            variant="secondary"
          >
            <Text className="text-foreground">Keep editing</Text>
          </Button>
          <Button
            className={largeText ? undefined : "flex-1 gap-[4px] px-[8px]"}
            loading={isRefreshing}
            onPress={onRefreshAndReview}
          >
            {isRefreshing ? null : (
              <Icon
                className="size-sm text-primary-foreground"
                name="RefreshCw"
              />
            )}
            <Text>{isRefreshing ? "Refreshing" : "Refresh & review"}</Text>
          </Button>
        </View>
      }
      insetFloatingFooter
      isSubmitting={isRefreshing}
      onClose={onKeepEditing}
      visible={visible}
    >
      <View className="flex-row items-center justify-between gap-[8px]">
        <Text
          accessibilityRole="header"
          className="min-w-0 flex-1"
          variant="title"
        >
          Settings changed
        </Text>
        <Button
          accessibilityLabel="Keep editing"
          className="bg-surface-raised"
          disabled={isRefreshing}
          onPress={onKeepEditing}
          size="icon"
          variant="ghost"
        >
          <Icon className="size-base text-foreground" name="X" />
        </Button>
      </View>
      <Text className="text-muted-foreground" variant="small">
        {serviceLabel} changed on another device while you were reviewing.
        Refresh the latest setting before confirming.
      </Text>
      {error ? (
        <ProfileBanner icon="CircleAlert" title={error} tone="error" />
      ) : null}
      <View>
        <ReviewRow compact label="Review based on" value={reviewedModeLabel} />
        <View className="mx-[16px] h-px bg-border" />
        <ReviewRow compact label="Your change" value={nextModeLabel} />
      </View>
      <View className="flex-row items-start gap-[10px]">
        <Icon className="size-base text-success mt-px" name="ShieldCheck" />
        <Text className="min-w-0 flex-1 text-muted-foreground" variant="small">
          <Text className="font-bold" variant="small">
            Your draft is safe.
          </Text>
          {" The selected mode and audit reason stay in the editor."}
        </Text>
      </View>
    </AppSheet>
  )
}
