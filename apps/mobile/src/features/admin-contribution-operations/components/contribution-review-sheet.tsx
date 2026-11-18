import { AppSheet } from "@/components/app/app-sheet"
import { ReviewRow } from "@/components/app/result-screen"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { StatusBanner } from "@/components/ui/status-banner"
import { Text } from "@/components/ui/text"
import { captureMobileError } from "@/lib/sentry"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { useCallback, useRef, useState } from "react"
import { View } from "react-native"

/** Keep showing the last value while a sheet animates closed. */
function useLastPresent<T>(value: T | null) {
  const last = useRef(value)
  if (value) last.current = value
  return last.current
}

/** One write, described for the 02 review sheet and its result. */
export type ContributionReview = {
  amount: string
  busyLabel: string
  cancelLabel?: string
  cta: string
  danger?: boolean
  failure: string
  rows: readonly (readonly [string, string])[]
  /** Runs online; resolve to finish, throw to show the failure. */
  run: () => Promise<unknown>
  sub: string
  success: readonly [string, string]
  title: string
}

type Phase = "review" | "submitting" | "error"

/**
 * Review → submitting → success, or error with retry (T18 screen 9, 02
 * Brand hero). The review floats over the form; on success the caller
 * closes its form and the result sheet stays until Done.
 */
export function useContributionReview({
  onSucceeded,
}: {
  onSucceeded: () => void
}) {
  const runtime = useMobileRuntime()
  const [review, setReview] = useState<ContributionReview | null>(null)
  const [phase, setPhase] = useState<Phase>("review")
  const [result, setResult] = useState<ContributionReview | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const running = useRef(false)

  const open = useCallback((next: ContributionReview) => {
    setMessage(null)
    setPhase("review")
    setReview(next)
  }, [])

  const confirm = useCallback(async () => {
    if (!review || running.current) return
    running.current = true
    setPhase("submitting")
    setMessage(null)
    try {
      await runtime.runOnlineOperation("command", review.run)
      setResult(review)
      setReview(null)
      setPhase("review")
      onSucceeded()
    } catch (failure) {
      captureMobileError(failure, "mobile.contribution_operations")
      setMessage(
        failure instanceof Error && failure.message
          ? `${review.failure} ${failure.message}`
          : review.failure
      )
      setPhase("error")
    } finally {
      running.current = false
    }
  }, [onSucceeded, review, runtime])

  const cancel = useCallback(() => {
    if (running.current) return
    setReview(null)
    setPhase("review")
  }, [])

  return {
    active: Boolean(review),
    cancel,
    confirm,
    dismissResult: () => setResult(null),
    message,
    open,
    phase,
    result,
    review,
  }
}

export function ContributionReviewSheet({
  flow,
}: {
  flow: ReturnType<typeof useContributionReview>
}) {
  const { phase } = flow
  const review = useLastPresent(flow.review)
  const busy = phase === "submitting"
  const failed = phase === "error"
  return (
    <AppSheet
      accessibilityLabel={review?.title}
      dismissible={!busy}
      footer={
        <View className="gap-[10px] px-[20px] pt-[8px] pb-[20px]">
          <Button
            loading={busy}
            onPress={() => void flow.confirm()}
            testID="contribution-review-confirm"
            variant={review?.danger ? "destructive" : "default"}
          >
            {failed ? (
              <Icon
                className="size-[18px] text-primary-foreground"
                name="RefreshCw"
              />
            ) : null}
            <Text>
              {busy ? review?.busyLabel : failed ? "Try again" : review?.cta}
            </Text>
          </Button>
          {busy ? null : (
            <Button onPress={flow.cancel} variant="ghost">
              <Text className="text-foreground">
                {review?.cancelLabel ?? "Keep editing"}
              </Text>
            </Button>
          )}
        </View>
      }
      isSubmitting={busy}
      onBackPress={flow.cancel}
      onClose={flow.cancel}
      title={review?.title}
      variant="confirm"
      visible={Boolean(flow.review)}
    >
      {review ? (
        <View className="gap-[14px]">
          <View className="items-center gap-[2px] pt-[2px]">
            <Text className="text-muted-foreground" variant="label">
              {review.sub}
            </Text>
            <Text className="text-center" variant="hero">
              {review.amount}
            </Text>
          </View>
          <View>
            {review.rows.map(([label, value]) => (
              <ReviewRow compact key={label} label={label} value={value} />
            ))}
          </View>
          {failed && flow.message ? (
            <StatusBanner kind="error" title={flow.message} />
          ) : null}
        </View>
      ) : null}
    </AppSheet>
  )
}

export function ContributionResultSheet({
  onDone,
  result: current,
}: {
  onDone: () => void
  result: ContributionReview | null
}) {
  const result = useLastPresent(current)
  return (
    <AppSheet
      accessibilityLabel={result?.success[0]}
      dismissible={false}
      footer={
        <View className="px-[20px] pt-[8px] pb-[20px]">
          <Button onPress={onDone} testID="contribution-result-done">
            <Text>Done</Text>
          </Button>
        </View>
      }
      onBackPress={onDone}
      onClose={onDone}
      variant="confirm"
      visible={Boolean(current)}
    >
      {result ? (
        <View className="items-center gap-[10px] pt-[8px]">
          <View className="size-[64px] items-center justify-center rounded-full bg-primary">
            <Icon className="size-md text-primary-foreground" name="Check" />
          </View>
          <Text
            accessibilityRole="header"
            className="text-center"
            variant="title"
          >
            {result.success[0]}
          </Text>
          <Text className="text-center text-muted-foreground" variant="body">
            {result.success[1]}
          </Text>
        </View>
      ) : null}
    </AppSheet>
  )
}
