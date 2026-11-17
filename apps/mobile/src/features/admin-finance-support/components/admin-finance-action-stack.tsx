import { AppSheet } from "@/components/app/app-sheet"
import { DevQuickFill } from "@/components/app/dev-quick-fill"
import {
  ResultScreen,
  ReviewRow,
  SubmittingState,
} from "@/components/app/result-screen"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { ListCard } from "@/components/ui/list-card"
import { StatusBanner } from "@/components/ui/status-banner"
import { Text } from "@/components/ui/text"
import { useEffect } from "react"
import { BackHandler, View } from "react-native"
import type { useAdminFinanceSupportController } from "../hooks/use-admin-finance-support-controller"
import { financeActionCopy } from "../model/admin-finance-support-action"
import { adminFinanceQueueFilters } from "../model/admin-finance-support-presentation"
import { AdminFinanceActionForm } from "./admin-finance-action-form"

type Props = ReturnType<typeof useAdminFinanceSupportController>["actionStack"]

export function AdminFinanceActionStack({
  blocked,
  currencyCode,
  draft,
  error,
  failure,
  intent,
  nextItem,
  nextCount,
  onChange,
  onClose,
  onConfirm,
  onEdit,
  onNext,
  onQuickFill,
  onReload,
  onReview,
  phase,
  restored,
  reviewRows,
}: Props) {
  const showingResult =
    Boolean(intent) && (phase === "success" || phase === "error")
  useEffect(() => {
    if (!showingResult) return
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        onClose()
        return true
      }
    )
    return () => subscription.remove()
  }, [onClose, showingResult])

  const action = intent?.action
  const copy = action ? financeActionCopy[action.key] : undefined
  const title = action?.label
  const reviewing = phase === "review"
  const submitting = phase === "submitting"
  const nextLane = adminFinanceQueueFilters.find(
    ({ value }) => value === nextItem?.queueKey
  )?.label

  return (
    <AppSheet
      footer={
        intent && (phase === "form" || reviewing) ? (
          <View className="flex-row items-center gap-[8px]">
            {!reviewing ? (
              <DevQuickFill
                onPress={onQuickFill}
                placement="footer"
                portal={false}
              />
            ) : null}
            <Button
              className="flex-1"
              disabled={blocked}
              onPress={reviewing ? onConfirm : onReview}
              testID={
                reviewing
                  ? "admin-finance-confirm-review"
                  : "admin-finance-review-action"
              }
              variant={
                reviewing && action?.destructive ? "destructive" : "default"
              }
            >
              <Text>{reviewing ? copy?.confirm : "Review action"}</Text>
            </Button>
          </View>
        ) : undefined
      }
      headerTrailing={
        reviewing ? (
          <Text className="text-muted-foreground" variant="caption">
            Review
          </Text>
        ) : undefined
      }
      isSubmitting={submitting}
      onBack={
        reviewing && action?.key !== "mark_under_review" ? onEdit : undefined
      }
      onClose={onClose}
      overlayActive={showingResult}
      overlay={
        showingResult ? (
          <View
            accessibilityViewIsModal
            className="absolute inset-0 bg-background"
          >
            {phase === "success" ? (
              <ResultScreen
                description={`${copy?.success} for ${intent?.item.title}. The server confirmed it.`}
                onDone={onClose}
                primary={
                  nextItem && nextLane
                    ? {
                        label: `Next in ${nextLane} (${nextCount})`,
                        onPress: onNext,
                      }
                    : { label: "Back to queue", onPress: onClose }
                }
                secondary={
                  nextItem
                    ? {
                        label: "Back to queue",
                        onPress: onClose,
                        variant: "ghost",
                      }
                    : undefined
                }
                title={copy?.success ?? "Review recorded"}
                tone="success"
              />
            ) : (
              <ResultScreen
                badgeIcon={failure?.conflict ? "RefreshCw" : "CircleAlert"}
                description={
                  failure?.conflict
                    ? "Someone updated this record after you opened it. Reload the queue to review its current state."
                    : failure?.message
                }
                primary={
                  failure?.conflict
                    ? { label: "Reload queue", onPress: onReload }
                    : failure?.retryable && !blocked
                      ? { label: "Try again", onPress: onConfirm }
                      : undefined
                }
                secondary={
                  failure?.conflict ||
                  failure?.retryable ||
                  action?.key === "mark_under_review"
                    ? {
                        label: "Back to queue",
                        onPress: onClose,
                        variant: "ghost",
                      }
                    : {
                        label: "Back to the form",
                        onPress: onEdit,
                        variant: "ghost",
                      }
                }
                title={
                  failure?.conflict
                    ? "This record changed"
                    : "Couldn’t complete this action"
                }
                tone={failure?.conflict ? "warning" : "error"}
              />
            )}
          </View>
        ) : undefined
      }
      title={title}
      variant="form"
      visible={Boolean(intent)}
    >
      {intent && phase === "form" ? (
        <AdminFinanceActionForm
          blocked={blocked}
          currencyCode={currencyCode}
          draft={draft}
          error={error}
          intent={intent}
          onChange={onChange}
          restored={restored}
        />
      ) : null}
      {reviewing ? (
        <View className="gap-[16px]">
          {blocked ? (
            <StatusBanner
              kind="stale"
              title="Reviews are paused"
              description="Refresh online before continuing."
            />
          ) : null}
          <ListCard inset={false}>
            {reviewRows.map(({ label, value }) => (
              <ReviewRow key={label} label={label} value={value} />
            ))}
          </ListCard>
          <View className="flex-row items-start gap-[8px]">
            <Icon
              className="size-[18px] text-muted-foreground"
              name="ShieldCheck"
            />
            <Text className="flex-1 text-muted-foreground" variant="small">
              We check the record before applying this action. Nothing is saved
              until you confirm.
            </Text>
          </View>
        </View>
      ) : null}
      {submitting ? (
        <SubmittingState
          description="Checking the record and saving your decision."
          title={`Applying ${title?.toLowerCase()}…`}
        />
      ) : null}
    </AppSheet>
  )
}
