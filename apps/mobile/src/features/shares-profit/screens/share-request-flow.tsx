import { AppSheet } from "@/components/app/app-sheet"
import { DevQuickFill } from "@/components/app/dev-quick-fill"
import {
  ResultScreen,
  ReviewRow,
  SubmittingState,
} from "@/components/app/result-screen"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { Icon } from "@/components/ui/icon"
import { Elevated } from "@/components/ui/list-card"
import { StatusBanner } from "@/components/ui/status-banner"
import { StatusPill } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import { mobileDevQuickFill } from "@/dev/mobile-dev-quick-fill"
import { useMobileFormDraft } from "@/hooks/use-mobile-form-draft"
import { cn } from "@/lib/utils"
import { MobileOfflineOperationError } from "@/runtime/mobile-runtime-state"
import { useEffect, useMemo, useRef, useState } from "react"
import { BackHandler, Keyboard, View, useWindowDimensions } from "react-native"
import {
  formatShareDate,
  formatShareUnitCount,
  describeOptionalShareUnits,
} from "../model/member-shares-presentation"
import type {
  MobileMemberShareApplication,
  MobileMemberShareApplicationCreateInput,
  MobileMemberSharePosition,
} from "../model/member-shares-types"
import { AfterApproval } from "./share-unit-visuals"

type RequestOutcome =
  | { kind: "success"; application: MobileMemberShareApplication }
  | { kind: "offline" | "error" | "limit" }

export function ShareRequestAction({
  money,
  offline,
  onViewRequest,
  persistDraft,
  position,
  refresh,
  refreshing,
  stale,
  submit,
}: {
  money: (value: number) => string
  offline: boolean
  onViewRequest: (application: MobileMemberShareApplication) => void
  persistDraft: boolean
  position: MobileMemberSharePosition
  refresh: () => void
  refreshing: boolean
  stale: boolean
  submit: (
    input: MobileMemberShareApplicationCreateInput
  ) => Promise<MobileMemberShareApplication>
}) {
  const [step, setStep] = useState<"closed" | "form" | "review" | "result">(
    "closed"
  )
  const [outcome, setOutcome] = useState<RequestOutcome | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const submitInFlight = useRef(false)
  const pendingDetail = useRef<MobileMemberShareApplication | null>(null)
  const showingResult = step === "result"
  const [requestedUnits, setRequestedUnits] = useState("1")
  const [notes, setNotes] = useState("")
  const { height } = useWindowDimensions()
  const remaining = position.remainingOptionalUnits
  const quantity = Number(requestedUnits)
  const visibleUnits = Math.min(Math.max(1, quantity), Math.max(1, remaining))
  const chips = [
    ...new Set(
      [1, 2, remaining].filter((value) => value > 0 && value <= remaining)
    ),
  ]
  const dirty = requestedUnits !== "1" || Boolean(notes.trim())
  const valid = quantity > 0 && quantity <= remaining
  const canSend = !offline && !stale && valid && !submitting
  const inReview = step === "review"
  const draft = useMemo(
    () => ({ notes, requestedUnits }),
    [notes, requestedUnits]
  )
  const clearDraft = useMobileFormDraft({
    enabled: persistDraft,
    key: "member.shares.create",
    onHydrate: (saved) => {
      const units = Number(saved.requestedUnits)
      if (Number.isSafeInteger(units) && units > 0)
        setRequestedUnits(String(units))
      if (typeof saved.notes === "string") setNotes(saved.notes.slice(0, 500))
    },
    value: draft,
  })

  useEffect(() => {
    if (!showingResult) return
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        setStep("closed")
        return true
      }
    )
    return () => subscription.remove()
  }, [showingResult])

  function choose(units: number) {
    setRequestedUnits(String(units))
  }

  async function send() {
    if (!canSend || submitInFlight.current) return
    submitInFlight.current = true
    setOutcome(null)
    setSubmitting(true)
    try {
      const application = await submit({
        notes: notes.trim() || undefined,
        requestedUnits: quantity,
      })
      void clearDraft().catch(() => undefined)
      setRequestedUnits("1")
      setNotes("")
      setStep("result")
      setOutcome({ application, kind: "success" })
    } catch (error) {
      setStep("result")
      const limitChanged =
        error instanceof Error &&
        error.message.includes("available optional share units")
      setOutcome({
        kind:
          error instanceof MobileOfflineOperationError
            ? "offline"
            : limitChanged
              ? "limit"
              : "error",
      })
      if (limitChanged) refresh()
    } finally {
      submitInFlight.current = false
      setSubmitting(false)
    }
  }

  const resultApplication =
    outcome?.kind === "success" ? outcome.application : null
  const footer = submitting ? undefined : (
    <View className="gap-[6px]">
      {!inReview && persistDraft ? (
        <DevQuickFill
          label="Quick fill share request"
          onPress={() => {
            choose(
              Math.min(
                Number(mobileDevQuickFill.shareRequest.requestedUnits),
                remaining
              )
            )
            setNotes(mobileDevQuickFill.shareRequest.notes)
          }}
          placement="footer"
          portal={false}
        />
      ) : null}
      <Button
        disabled={inReview ? !canSend : offline || stale || remaining === 0}
        onPress={
          inReview
            ? send
            : () => {
                Keyboard.dismiss()
                choose(visibleUnits)
                setStep("review")
              }
        }
      >
        <Icon className="size-base text-primary-foreground" name="Send" />
        <Text>{inReview ? "Submit request" : "Review request"}</Text>
      </Button>
    </View>
  )
  const result = outcome ? (
    <View className="absolute inset-0">
      <ResultScreen
        compact
        badgeIcon={outcome.kind === "offline" ? "WifiOff" : undefined}
        description={
          resultApplication
            ? `Your request for ${formatShareUnitCount(resultApplication.requestedUnits)} is waiting for review.`
            : outcome.kind === "offline"
              ? "Your request wasn’t sent. Your draft is kept, so you can try again when you’re connected."
              : outcome.kind === "limit"
                ? "The available units changed. Review your draft and choose a smaller number."
                : "Your draft is kept. Check your request and try again."
        }
        details={
          resultApplication ? (
            <>
              <ReviewRow
                compact
                label="Request value"
                tabular
                value={money(resultApplication.shareValueSnapshot)}
              />
              <View className="h-px bg-border" />
              <ReviewRow
                compact
                label="Status"
                value={<StatusPill label="Pending review" tone="warning" />}
              />
              <View className="h-px bg-border" />
              <ReviewRow
                compact
                label="Requested"
                value={formatShareDate(resultApplication.createdAt)}
              />
            </>
          ) : undefined
        }
        primary={{
          label: resultApplication
            ? "Done"
            : outcome.kind === "offline"
              ? "Try again"
              : "Edit request",
          onPress: () => {
            if (resultApplication) {
              setStep("closed")
            } else {
              setOutcome(null)
              setStep(outcome.kind === "offline" ? "review" : "form")
              if (outcome.kind === "offline" && canSend) void send()
            }
          },
        }}
        secondary={{
          label: resultApplication ? "View request" : "Close",
          onPress: () => {
            pendingDetail.current = resultApplication
            setStep("closed")
          },
          variant: "ghost",
        }}
        title={
          resultApplication
            ? "Request sent"
            : outcome.kind === "offline"
              ? "You’re offline"
              : "Request not sent"
        }
        tone={
          resultApplication
            ? "success"
            : outcome.kind === "offline"
              ? "warning"
              : "error"
        }
      />
    </View>
  ) : undefined
  return (
    <>
      <View className="gap-[6px]">
        <Button
          disabled={offline || remaining === 0}
          loading={stale && refreshing}
          onPress={stale ? refresh : () => setStep("form")}
        >
          <Icon
            className="size-base text-primary-foreground"
            name={stale && !offline ? "RefreshCw" : "Plus"}
          />
          <Text>
            {stale && !offline
              ? "Refresh to request"
              : dirty
                ? "Continue share request"
                : "Request optional shares"}
          </Text>
        </Button>
        {offline || remaining === 0 ? (
          <Text className="text-center text-muted-foreground" variant="caption">
            {offline
              ? "Connect to request shares"
              : position.pendingOptionalUnits
                ? `No units left · ${describeOptionalShareUnits(position.pendingOptionalUnits)}`
                : `You hold the maximum ${position.maximumUnits} units`}
          </Text>
        ) : null}
      </View>
      <AppSheet
        dirty={dirty}
        footer={footer}
        headerTrailing={inReview ? "2 of 2" : "1 of 2"}
        isSubmitting={submitting}
        onBack={inReview ? () => setStep("form") : undefined}
        onClose={() => {
          setOutcome(null)
          setStep("closed")
        }}
        onDismissed={() => {
          setOutcome(null)
          if (!pendingDetail.current) return
          onViewRequest(pendingDetail.current)
          pendingDetail.current = null
        }}
        overlay={result}
        overlayActive={showingResult}
        title={inReview ? "Review request" : "Request optional shares"}
        variant="form"
        visible={step !== "closed"}
      >
        {submitting ? (
          <View style={{ minHeight: height * 0.7 }}>
            <SubmittingState
              description="This takes a moment."
              title="Sending your request"
            />
          </View>
        ) : (
          <View className="gap-[18px]">
            {offline ? (
              <StatusBanner
                kind="offline"
                title="You’re offline"
                description="You can finish the form. Sending needs a connection."
              />
            ) : stale ? (
              <StatusBanner
                kind="stale"
                title="Refresh share data first"
                onRetry={refresh}
                retryLabel="Refresh"
                retrying={refreshing}
              />
            ) : inReview && !valid ? (
              <StatusBanner
                kind="error"
                title="Available units changed"
                description="Go back and adjust your request."
              />
            ) : null}
            {inReview ? (
              <>
                <View className="items-center gap-[4px] pt-[10px] pb-[4px]">
                  <Text className="text-muted-foreground" variant="label">
                    Optional shares
                  </Text>
                  <Text variant="hero">
                    {money(quantity * position.unitAmount)}
                  </Text>
                  <Text className="text-muted-foreground" variant="small">
                    {formatShareUnitCount(quantity)} ·{" "}
                    {money(position.unitAmount)} each
                  </Text>
                </View>
                <Elevated
                  className="overflow-hidden rounded-[20px] bg-card"
                  radius={20}
                >
                  <ReviewRow
                    compact
                    label="Units"
                    value={formatShareUnitCount(quantity)}
                  />
                  <View className="h-px bg-border" />
                  <ReviewRow
                    compact
                    label="Per unit"
                    tabular
                    value={money(position.unitAmount)}
                  />
                  <View className="h-px bg-border" />
                  <ReviewRow
                    compact
                    label="Request value"
                    tabular
                    value={money(quantity * position.unitAmount)}
                  />
                  {notes.trim() ? (
                    <>
                      <View className="h-px bg-border" />
                      <ReviewRow compact label="Context" value={notes.trim()} />
                    </>
                  ) : null}
                </Elevated>
                <AfterApproval position={position} requested={quantity} />
                <View className="flex-row items-start gap-[10px] px-[4px] pt-[12px]">
                  <Icon
                    className="size-base text-muted-foreground"
                    name="Info"
                  />
                  <Text
                    className="flex-1 text-muted-foreground"
                    variant="small"
                  >
                    Your cooperative reviews each request. You’ll see the
                    decision under Activity.
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Text
                  className="mb-[14px] text-center text-muted-foreground"
                  variant="small"
                >
                  {remaining} of {position.maximumUnits} units available ·{" "}
                  {money(position.unitAmount)} each
                </Text>
                <View className="mb-[20px] flex-row items-center gap-[8px] pt-[10px] pb-[2px]">
                  <StepperButton
                    disabled={visibleUnits <= 1}
                    icon="Minus"
                    label="One unit fewer"
                    onPress={() => choose(visibleUnits - 1)}
                  />
                  <View
                    className="flex-1 items-center"
                    accessibilityLiveRegion="polite"
                  >
                    <Text
                      className="text-[60px] leading-[66px] font-extrabold tracking-tight"
                      tabular
                    >
                      {visibleUnits}
                    </Text>
                    <Text className="text-muted-foreground" variant="label">
                      {visibleUnits === 1 ? "unit" : "units"}
                    </Text>
                  </View>
                  <StepperButton
                    disabled={visibleUnits >= remaining}
                    icon="Plus"
                    label="One unit more"
                    onPress={() => choose(visibleUnits + 1)}
                  />
                </View>
                <Text
                  className="mb-[14px] text-center text-[18px]"
                  variant="money"
                >
                  {money(visibleUnits * position.unitAmount)}{" "}
                  <Text className="text-muted-foreground" variant="small">
                    request value
                  </Text>
                </Text>
                <View className="flex-row flex-wrap justify-center gap-[8px]">
                  {chips.map((units) => (
                    <Button
                      accessibilityState={{ selected: units === visibleUnits }}
                      className={cn(
                        "min-h-[44px] rounded-full px-[14px]",
                        units === visibleUnits && "bg-accent"
                      )}
                      key={units}
                      onPress={() => choose(units)}
                      size="sm"
                      variant="outline"
                    >
                      <Text
                        className={
                          units === visibleUnits
                            ? "text-accent-foreground"
                            : undefined
                        }
                        variant="label"
                      >
                        {units === remaining && units > 2
                          ? `All ${units}`
                          : formatShareUnitCount(units)}
                      </Text>
                    </Button>
                  ))}
                </View>
                {visibleUnits === remaining ? (
                  <Text
                    className="text-tint-warm-foreground text-center"
                    variant="small"
                  >
                    That’s all {formatShareUnitCount(remaining)} you can request
                    now.
                  </Text>
                ) : null}
                <AfterApproval
                  position={position}
                  requested={remaining ? visibleUnits : 0}
                />
                <FormField label="Request context" trailingLabel="Optional">
                  <Textarea
                    accessibilityLabel="Request context"
                    className="min-h-[104px] rounded-[14px] px-[14px] py-[13px]"
                    maxLength={500}
                    onChangeText={setNotes}
                    placeholder="Add context for the finance reviewer"
                    value={notes}
                  />
                </FormField>
              </>
            )}
          </View>
        )}
      </AppSheet>
    </>
  )
}

function StepperButton({
  disabled,
  icon,
  label,
  onPress,
}: {
  disabled: boolean
  icon: string
  label: string
  onPress: () => void
}) {
  return (
    <Button
      accessibilityLabel={label}
      className="size-[56px] rounded-full p-0"
      disabled={disabled}
      onPress={onPress}
      size="icon"
      variant="secondary"
    >
      <Icon
        className="size-md text-accent-foreground"
        name={icon}
        strokeWidth={2.4}
      />
    </Button>
  )
}
