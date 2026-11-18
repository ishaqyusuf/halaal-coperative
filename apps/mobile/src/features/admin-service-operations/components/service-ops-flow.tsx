import { AppSheet } from "@/components/app/app-sheet"
import { ReviewRow } from "@/components/app/result-screen"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Elevated } from "@/components/ui/list-card"
import { StatusBanner } from "@/components/ui/status-banner"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"
import { useEffect, type ReactNode } from "react"
import { BackHandler, Keyboard, Pressable, View } from "react-native"
import Animated, { FadeIn, FadeOut, SlideInDown } from "react-native-reanimated"
import type { OpsResult, OpsReviewSpec } from "../model/service-ops-types"

export type OpsFlowStep = "closed" | "form" | "result" | "review"

function ReviewPanel({
  onConfirm,
  onEdit,
  spec,
  submitting,
}: {
  onConfirm: () => void
  onEdit: () => void
  spec: OpsReviewSpec
  submitting: boolean
}) {
  return (
    <View className="absolute inset-0 justify-end">
      <Animated.View
        entering={FadeIn.duration(180)}
        exiting={FadeOut.duration(160)}
        style={{ height: "100%", left: 0, position: "absolute", top: 0, width: "100%" }}
      >
        <Pressable
          accessibilityLabel="Back to edit"
          accessibilityRole="button"
          className="flex-1 bg-overlay"
          disabled={submitting}
          onPress={onEdit}
        />
      </Animated.View>
      <Animated.View entering={SlideInDown.duration(300)} style={{ margin: 8, marginBottom: 24 }}>
        <Elevated className="gap-[14px] rounded-[32px] bg-card p-[20px]" radius={32}>
          <View className="flex-row items-center justify-between">
            <Text accessibilityRole="header" variant="title">
              {spec.title}
            </Text>
            <Pressable
              accessibilityLabel="Back to edit"
              accessibilityRole="button"
              className="size-[44px] items-center justify-center rounded-full bg-surface-raised"
              disabled={submitting}
              onPress={onEdit}
            >
              <Icon className="size-[18px] text-foreground" name="X" />
            </Pressable>
          </View>
          <View>
            {spec.rows.map(([label, value], index) => (
              <View key={label}>
                {index ? <View className="h-px bg-border" /> : null}
                <ReviewRow compact label={label} value={value} />
              </View>
            ))}
          </View>
          {spec.note ? (
            <View className="flex-row items-start gap-[8px]">
              <Icon className="mt-[1px] size-[16px] text-muted-foreground" name="ShieldCheck" />
              <Text className="flex-1 text-muted-foreground" variant="small">
                {spec.note}
              </Text>
            </View>
          ) : null}
          <View className="gap-[6px]">
            <Button loading={submitting} onPress={onConfirm} testID="ops-confirm">
              <Text>{submitting ? "Saving" : spec.confirmLabel}</Text>
            </Button>
            <Button disabled={submitting} onPress={onEdit} variant="ghost">
              <Text>Edit</Text>
            </Button>
          </View>
        </Elevated>
      </Animated.View>
    </View>
  )
}

function ResultPanel({
  onDone,
  onRetry,
  onSecondary,
  result,
  retrying,
}: {
  onDone: () => void
  onRetry: () => void
  onSecondary: () => void
  result: OpsResult
  retrying: boolean
}) {
  const copy =
    result.kind === "success"
      ? { body: result.body, icon: "Check", surface: "bg-tint-success", text: "text-tint-success-foreground", title: result.title }
      : result.kind === "conflict"
        ? {
            body: "Someone else updated it while you were working. Nothing was saved.",
            icon: "RefreshCw",
            surface: "bg-tint-warm",
            text: "text-tint-warm-foreground",
            title: "This record changed",
          }
        : {
            body: "Nothing changed. Check your connection and try again.",
            icon: "CircleX",
            surface: "bg-tint-danger",
            text: "text-tint-danger-foreground",
            title: "Couldn’t save",
          }
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={{ height: "100%", left: 0, position: "absolute", top: 0, width: "100%" }}
    >
      <View className="flex-1 bg-background px-[24px] pt-[96px] pb-[34px]">
        <View className="flex-1 items-center justify-center gap-[14px]">
          <View className={cn("size-[72px] items-center justify-center rounded-full", copy.surface)}>
            <Icon className={cn("size-[32px]", copy.text)} name={copy.icon} />
          </View>
          <Text accessibilityRole="header" className="text-center" variant="screenTitle">
            {copy.title}
          </Text>
          <Text className="text-center text-muted-foreground" variant="body">
            {copy.body}
          </Text>
        </View>
        <View className="gap-[10px]">
          {result.kind === "success" ? (
            <>
              <Button onPress={onDone} testID="ops-result-done">
                <Text>Done</Text>
              </Button>
              {result.secondaryLabel ? (
                <Button onPress={onSecondary} variant="secondary">
                  <Text>{result.secondaryLabel}</Text>
                </Button>
              ) : null}
            </>
          ) : result.kind === "conflict" ? (
            <>
              <Button onPress={onSecondary}>
                <Text>Refresh record</Text>
              </Button>
              <Button onPress={onDone} variant="secondary">
                <Text>Close</Text>
              </Button>
            </>
          ) : (
            <>
              <Button loading={retrying} onPress={onRetry}>
                <Text>Try again</Text>
              </Button>
              <Button onPress={onDone} variant="secondary">
                <Text>Close</Text>
              </Button>
            </>
          )}
        </View>
      </View>
    </Animated.View>
  )
}

/**
 * The 02 write flow shared by the service-operations screens: a full-screen
 * form (inputs) → a floating review panel over it → a full-screen result.
 */
export function ServiceOpsFlowSheet({
  children,
  cta,
  dirty,
  footerExtra,
  headerTrailing,
  offline,
  onBack,
  onClose,
  onConfirm,
  onDismissed,
  onRetry,
  onReview,
  onSecondary,
  result,
  review,
  step,
  submitting,
  title,
  setStep,
}: {
  children: ReactNode
  cta: string
  dirty: boolean
  footerExtra?: ReactNode
  headerTrailing?: string
  offline: boolean
  onBack?: () => void
  onClose: () => void
  onConfirm: () => void
  onDismissed?: () => void
  onRetry: () => void
  onReview: () => void
  onSecondary: () => void
  result: OpsResult | null
  review: OpsReviewSpec | null
  setStep: (step: OpsFlowStep) => void
  step: OpsFlowStep
  submitting: boolean
  title: string
}) {
  useEffect(() => {
    if (step !== "review" && step !== "result") return
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (submitting) return true
      if (step === "review") setStep("form")
      else onClose()
      return true
    })
    return () => subscription.remove()
  }, [onClose, setStep, step, submitting])

  const overlay =
    step === "review" && review ? (
      <ReviewPanel onConfirm={onConfirm} onEdit={() => setStep("form")} spec={review} submitting={submitting} />
    ) : step === "result" && result ? (
      <ResultPanel onDone={onClose} onRetry={onRetry} onSecondary={onSecondary} result={result} retrying={submitting} />
    ) : null
  return (
    <AppSheet
      dirty={dirty && step === "form"}
      footer={
        <View className="gap-[6px]">
          {footerExtra}
          <Button
            disabled={offline}
            onPress={() => {
              Keyboard.dismiss()
              onReview()
            }}
            testID="ops-review"
          >
            <Text>{cta}</Text>
          </Button>
        </View>
      }
      headerTrailing={headerTrailing}
      isSubmitting={submitting}
      onBack={onBack}
      onClose={onClose}
      onDismissed={onDismissed}
      overlay={overlay}
      overlayActive={step === "review" || step === "result"}
      title={title}
      variant="form"
      visible={step !== "closed"}
    >
      <View className="gap-[18px]">
        {offline ? (
          <StatusBanner
            description="Your entries stay here until you reconnect."
            kind="offline"
            title="You’re offline"
          />
        ) : null}
        {children}
      </View>
    </AppSheet>
  )
}

/** Member / record context card at the top of a form (02). */
export function OpsContextCard({
  amount,
  subtitle,
  title,
}: {
  amount?: string
  subtitle: string
  title: string
}) {
  return (
    <Elevated className="flex-row items-center gap-[12px] rounded-[20px] bg-card px-[14px] py-[12px]" radius={20}>
      <View className="min-w-0 flex-1">
        <Text className="font-bold" numberOfLines={1} variant="body">
          {title}
        </Text>
        <Text className="text-muted-foreground" numberOfLines={1} variant="caption">
          {subtitle}
        </Text>
      </View>
      {amount ? <Text variant="money">{amount}</Text> : null}
    </Elevated>
  )
}
