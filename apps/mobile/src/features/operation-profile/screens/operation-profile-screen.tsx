import { CachedReadBanner } from "@/components/app/cached-read-banner"
import { EmptyState } from "@/components/app/empty-state"
import { ScreenHeader } from "@/components/app/screen-header"
import {
  StatusBadge,
  type StatusBadgeTone,
} from "@/components/app/status-badge"
import { SubmissionReviewSheet } from "@/components/app/submission-review-sheet"
import { SubmissionSuccessSheet } from "@/components/app/submission-success-sheet"
import { LoadingSpinner } from "@/components/loading-spinner"
import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { useColors } from "@/hooks/use-color"
import { useMobileFormDraft } from "@/hooks/use-mobile-form-draft"
import { useEffect, useMemo, useRef, useState } from "react"
import { ScrollView, View } from "react-native"
import { OperationProfileConflictSheet } from "../components/operation-profile-conflict-sheet"
import { OperationProfileEditSheet } from "../components/operation-profile-edit-sheet"
import { resolveOperationProfileConflictRefresh } from "../model/operation-profile-conflict"
import {
  getOperationProfileCounts,
  getOperationProfileMode,
  getOperationProfileService,
  getOperationProfileServiceConsequence,
  isOperationProfileReadOnly,
  isRestrictiveOperationProfileChange,
  operationProfileSections,
  operationProfileServices,
} from "../model/operation-profile-policy"
import type {
  MobileOperationProfileSnapshot,
  OperationProfileAccessMode,
  OperationProfileServiceKey,
  UpdateMobileOperationProfileServiceInput,
  UpdateMobileOperationProfileServiceResult,
} from "../model/operation-profile-types"

const reviewedAtFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  month: "short",
  year: "numeric",
})

type SheetStage =
  | "closed"
  | "edit"
  | "closing_edit"
  | "closing_edit_for_review"
  | "review"
  | "closing_review_for_edit"
  | "closing_review_for_conflict"
  | "closing_review_for_success"
  | "conflict"
  | "closing_conflict_for_edit"
  | "closing_conflict_for_review"
  | "success"

type OperationProfileDraft = {
  changeReason: string
  expectedAccessMode: OperationProfileAccessMode
  nextAccessMode: OperationProfileAccessMode
  serviceKey: OperationProfileServiceKey
}

function modeTone(mode: OperationProfileAccessMode): StatusBadgeTone {
  if (mode === "member_self_service") return "success"
  if (mode === "read_only") return "warning"
  if (mode === "disabled") return "neutral"
  return "muted"
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <View className="min-w-0 flex-1 gap-1 border-r border-border py-4 pr-3 last:border-r-0 last:pr-0">
      <Text className="text-[10px] leading-4 font-bold text-muted-foreground uppercase">
        {label}
      </Text>
      <Text className="text-xl font-extrabold tracking-tight text-foreground">
        {value}
      </Text>
    </View>
  )
}

function OperationProfileServiceRow({
  disabled,
  onPress,
  service,
}: {
  disabled: boolean
  onPress: () => void
  service: MobileOperationProfileSnapshot["services"][number]
}) {
  const definition = getOperationProfileService(service.serviceKey)
  const mode = getOperationProfileMode(service.effectiveAccessMode)
  const configuredDiffers = service.effectiveAccessMode !== service.accessMode

  return (
    <Pressable
      accessibilityHint={
        disabled
          ? "Service settings are currently read-only"
          : "Opens the service access editor"
      }
      accessibilityLabel={`${definition.label}. ${mode.label}. ${getOperationProfileServiceConsequence(
        {
          accessMode: service.effectiveAccessMode,
          serviceKey: service.serviceKey,
        }
      )}`}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className="min-h-[92px] flex-row items-start gap-3 border-b border-border py-4 active:bg-accent/30"
      disabled={disabled}
      haptic={!disabled}
      onPress={onPress}
    >
      <View className="h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Icon className="size-base text-primary" name={definition.icon} />
      </View>
      <View className="min-w-0 flex-1 gap-1">
        <View className="flex-row items-start justify-between gap-2">
          <Text className="min-w-0 flex-1 text-sm font-bold text-foreground">
            {definition.label}
          </Text>
          <StatusBadge
            label={mode.label}
            tone={modeTone(service.effectiveAccessMode)}
          />
        </View>
        <Text className="text-xs leading-5 text-muted-foreground">
          {getOperationProfileServiceConsequence({
            accessMode: service.effectiveAccessMode,
            serviceKey: service.serviceKey,
          })}
        </Text>
        {configuredDiffers ? (
          <Text className="text-warn text-xs font-medium">
            Configured as {getOperationProfileMode(service.accessMode).label};
            subscription restriction is stricter.
          </Text>
        ) : null}
      </View>
      <Icon
        className="size-sm mt-3 shrink-0 text-muted-foreground"
        name="ChevronRight"
      />
    </Pressable>
  )
}

export function OperationProfileScreen({
  canManage,
  error,
  isLoading,
  isOnline,
  isRefreshing,
  isSubmitting,
  onBack,
  onRefresh,
  onRefreshForConflict,
  onRetry,
  onUpdateService,
  snapshot,
  submitError,
}: {
  canManage: boolean
  error: string | null
  isLoading: boolean
  isOnline: boolean
  isRefreshing: boolean
  isSubmitting: boolean
  onBack: () => void
  onRefresh: () => void
  onRefreshForConflict: () => Promise<MobileOperationProfileSnapshot | null>
  onRetry: () => void
  onUpdateService: (
    input: UpdateMobileOperationProfileServiceInput
  ) => Promise<UpdateMobileOperationProfileServiceResult>
  snapshot: MobileOperationProfileSnapshot | null
  submitError: string | null
}) {
  const colors = useColors()
  const transitionRef = useRef<SheetStage>("closed")
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [stage, setStage] = useState<SheetStage>("closed")
  const [serviceKey, setServiceKey] =
    useState<OperationProfileServiceKey | null>(null)
  const [expectedAccessMode, setExpectedAccessMode] =
    useState<OperationProfileAccessMode>("disabled")
  const [nextAccessMode, setNextAccessMode] =
    useState<OperationProfileAccessMode>("disabled")
  const [changeReason, setChangeReason] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [conflictError, setConflictError] = useState<string | null>(null)
  const [isResolvingConflict, setIsResolvingConflict] = useState(false)
  const draft: OperationProfileDraft = {
    changeReason,
    expectedAccessMode,
    nextAccessMode,
    serviceKey: serviceKey ?? "payment_receipts",
  }
  const clearDraft = useMobileFormDraft({
    enabled: serviceKey !== null,
    freezeAfterClear: true,
    key: `operation-profile.${serviceKey ?? "none"}`,
    onHydrate: (saved: OperationProfileDraft) => {
      if (
        saved.serviceKey === serviceKey &&
        saved.expectedAccessMode === expectedAccessMode
      ) {
        setNextAccessMode(saved.nextAccessMode)
        setChangeReason(saved.changeReason)
      }
    },
    value: draft,
  })
  const counts = useMemo(
    () => (snapshot ? getOperationProfileCounts(snapshot) : null),
    [snapshot]
  )
  const selectedDefinition = serviceKey
    ? getOperationProfileService(serviceKey)
    : null
  const readOnly = snapshot
    ? isOperationProfileReadOnly({
        cacheStatus: snapshot.cache?.status,
        isOnline,
        subscriptionAccessEnabled: snapshot.subscription.accessEnabled,
      })
    : true

  useEffect(
    () => () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current)
      }
    },
    []
  )

  function startTransition(nextStage: SheetStage) {
    transitionRef.current = nextStage
    setStage(nextStage)
  }

  function finishTransition(expected: SheetStage, next: SheetStage) {
    if (transitionRef.current !== expected) return
    transitionRef.current = next
    setStage(next)
  }

  function queueSheetTransition(closing: SheetStage, next: SheetStage) {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current)
    }
    startTransition(closing)
    transitionTimerRef.current = setTimeout(() => {
      transitionTimerRef.current = null
      finishTransition(closing, next)
    }, 420)
  }

  function openService(nextServiceKey: OperationProfileServiceKey) {
    const service = snapshot?.services.find(
      (candidate) => candidate.serviceKey === nextServiceKey
    )
    if (!service || readOnly) return
    setServiceKey(nextServiceKey)
    setExpectedAccessMode(service.accessMode)
    setNextAccessMode(service.accessMode)
    setChangeReason("")
    setFormError(null)
    setConflictError(null)
    transitionRef.current = "edit"
    setStage("edit")
  }

  function reviewChange() {
    if (nextAccessMode === expectedAccessMode) {
      setFormError("Choose a different access mode before continuing.")
      return
    }
    if (
      isRestrictiveOperationProfileChange({
        next: nextAccessMode,
        previous: expectedAccessMode,
      }) &&
      changeReason.trim().length === 0
    ) {
      setFormError("Enter an audit reason for this restrictive change.")
      return
    }
    setFormError(null)
    queueSheetTransition("closing_edit_for_review", "review")
  }

  async function confirmChange() {
    if (!serviceKey) return
    const result = await onUpdateService({
      changeReason: changeReason.trim() || undefined,
      expectedAccessMode,
      nextAccessMode,
      serviceKey,
    })
    if (result.status === "failed") return
    if (result.status === "conflict") {
      setConflictError(null)
      queueSheetTransition("closing_review_for_conflict", "conflict")
      return
    }
    await clearDraft()
    queueSheetTransition("closing_review_for_success", "success")
  }

  function keepEditingAfterConflict() {
    if (transitionRef.current !== "conflict" || isResolvingConflict) return
    setConflictError(null)
    queueSheetTransition("closing_conflict_for_edit", "edit")
  }

  async function refreshAndReviewConflict() {
    if (
      !serviceKey ||
      transitionRef.current !== "conflict" ||
      isResolvingConflict
    ) {
      return
    }

    setIsResolvingConflict(true)
    setConflictError(null)
    try {
      const refreshedSnapshot = await onRefreshForConflict()
      if (!refreshedSnapshot) {
        setConflictError(
          "The latest setting could not be refreshed. Try again."
        )
        return
      }

      const resolution = resolveOperationProfileConflictRefresh({
        nextAccessMode,
        serviceKey,
        snapshot: refreshedSnapshot,
      })

      if (resolution.status === "service_missing") {
        setConflictError(
          "This service is no longer available in Operation Profile."
        )
        return
      }

      setExpectedAccessMode(resolution.expectedAccessMode)
      if (resolution.status === "already_current") {
        setFormError(
          `${selectedDefinition?.label ?? "This service"} is already ${getOperationProfileMode(nextAccessMode).label.toLowerCase()}. No new change is needed.`
        )
        queueSheetTransition("closing_conflict_for_edit", "edit")
        return
      }

      setFormError(null)
      queueSheetTransition("closing_conflict_for_review", "review")
    } finally {
      setIsResolvingConflict(false)
    }
  }

  async function discardEditor() {
    if (transitionRef.current !== "edit") return
    try {
      await clearDraft()
      if (transitionRef.current === "edit") startTransition("closing_edit")
    } catch {
      setFormError("Could not discard this draft. Keep editing and try again.")
    }
  }

  if (!canManage) {
    return (
      <SafeArea style={{ backgroundColor: colors.background }}>
        <View className="flex-1 gap-6 px-5 pt-5 pb-8">
          <ScreenHeader
            leading={
              <Button
                accessibilityLabel="Go back"
                onPress={onBack}
                size="icon"
                variant="ghost"
              >
                <Icon className="size-base text-foreground" name="ArrowLeft" />
              </Button>
            }
            title="Operation Profile"
          />
          <EmptyState
            description="Only Cooperative Admins can view or change service access settings."
            icon="ShieldAlert"
            title="Cooperative Admin access required"
          />
        </View>
      </SafeArea>
    )
  }

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <ScrollView
        contentContainerClassName="gap-6 px-5 pt-5 pb-10"
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={undefined}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          action={
            <Button
              accessibilityLabel="Refresh Operation Profile"
              disabled={isRefreshing}
              onPress={onRefresh}
              size="icon"
              variant="ghost"
            >
              <Icon
                className="size-base text-foreground"
                name={isRefreshing ? "LoaderCircle" : "RefreshCw"}
              />
            </Button>
          }
          leading={
            <Button
              accessibilityLabel="Go back"
              onPress={onBack}
              size="icon"
              variant="ghost"
            >
              <Icon className="size-base text-foreground" name="ArrowLeft" />
            </Button>
          }
          title="Operation Profile"
        />

        {isLoading && !snapshot ? <LoadingSpinner /> : null}

        {error && !snapshot ? (
          <View className="gap-4 border-y border-border py-5">
            <EmptyState
              description={error}
              icon="TriangleAlert"
              title="Operation Profile unavailable"
            />
            <Button className="self-center" onPress={onRetry} variant="outline">
              <Icon className="size-base text-foreground" name="RefreshCw" />
              <Text>Try again</Text>
            </Button>
          </View>
        ) : null}

        {snapshot && counts ? (
          <>
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">
                {snapshot.tenant.name}
              </Text>
              {snapshot.reviewedAt ? (
                <View className="flex-row items-center gap-2">
                  <View className="bg-success h-2 w-2 rounded-full" />
                  <Text className="text-success text-xs font-semibold">
                    Reviewed{" "}
                    {reviewedAtFormatter.format(new Date(snapshot.reviewedAt))}
                  </Text>
                </View>
              ) : (
                <StatusBadge label="Not reviewed" tone="warning" />
              )}
              <CachedReadBanner
                cache={snapshot.cache}
                label="Operation Profile"
              />
            </View>

            {!isOnline || snapshot.cache?.status === "stale" ? (
              <View className="border-warn/40 bg-warn/10 gap-1 border-y py-3">
                <Text className="text-sm font-semibold text-foreground">
                  Read-only until refreshed
                </Text>
                <Text className="text-xs leading-5 text-muted-foreground">
                  Existing service settings remain visible. Reconnect and
                  refresh before changing access.
                </Text>
              </View>
            ) : null}

            {!snapshot.subscription.accessEnabled ? (
              <View className="border-warn/40 gap-2 border-y py-4">
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="text-sm font-bold text-foreground">
                    Subscription restriction
                  </Text>
                  <StatusBadge
                    label={snapshot.subscription.planName}
                    tone="warning"
                  />
                </View>
                <Text className="text-xs leading-5 text-muted-foreground">
                  The stricter rule wins. Existing records remain readable, but
                  new work and Operation Profile changes are unavailable until
                  subscription access returns.
                </Text>
              </View>
            ) : null}

            <View className="flex-row gap-3 border-y border-border">
              <SummaryMetric
                label="Member self-service"
                value={counts.memberSelfService}
              />
              <SummaryMetric label="Office only" value={counts.officeOnly} />
              <SummaryMetric label="Restricted" value={counts.restricted} />
            </View>

            {operationProfileSections.map((section) => {
              const definitions = operationProfileServices.filter(
                (service) => service.section === section.key
              )
              return (
                <View className="gap-1" key={section.key}>
                  <View className="flex-row items-end justify-between gap-3 pb-2">
                    <Text className="text-xl font-extrabold tracking-tight text-foreground">
                      {section.label}
                    </Text>
                    <Text className="pb-0.5 text-xs font-semibold text-muted-foreground">
                      {definitions.length} services
                    </Text>
                  </View>
                  <View className="border-t border-border">
                    {definitions.map((definition) => {
                      const service = snapshot.services.find(
                        (candidate) => candidate.serviceKey === definition.key
                      )!
                      return (
                        <OperationProfileServiceRow
                          disabled={readOnly}
                          key={definition.key}
                          onPress={() => openService(definition.key)}
                          service={service}
                        />
                      )
                    })}
                  </View>
                </View>
              )
            })}

            <View className="gap-3 border-y border-border py-4">
              <View className="flex-row items-start gap-3">
                <Icon className="size-sm mt-0.5 text-primary" name="Info" />
                <Text className="min-w-0 flex-1 text-xs leading-5 text-muted-foreground">
                  The stricter rule wins. A subscription can make a service
                  read-only, but it cannot override this cooperative&apos;s
                  operating choice.
                </Text>
              </View>
              <View className="gap-2 border-t border-border pt-3">
                <Text className="text-sm font-bold text-foreground">
                  Operating limits
                </Text>
                <Text className="text-xs leading-5 text-muted-foreground">
                  Procurement:{" "}
                  {snapshot.policy.procurementMaximumActiveObligationsPerMember}{" "}
                  active obligation per member
                </Text>
                <Text className="text-xs leading-5 text-muted-foreground">
                  Foodstuff Purchase:{" "}
                  {
                    snapshot.policy
                      .foodPurchaseMaximumActiveObligationsPerMember
                  }{" "}
                  active obligation per member ·{" "}
                  {snapshot.policy.foodPurchaseRequiresOpenCycle
                    ? "open cycle required"
                    : "open cycle not required"}
                </Text>
                <Text className="text-xs leading-5 text-muted-foreground">
                  Detailed finance and policy editing remains web-first.
                </Text>
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>

      {serviceKey ? (
        <>
          <OperationProfileEditSheet
            changeReason={changeReason}
            currentAccessMode={expectedAccessMode}
            error={formError}
            isStale={snapshot?.cache?.status === "stale"}
            nextAccessMode={nextAccessMode}
            onChangeReason={setChangeReason}
            onClose={() => void discardEditor()}
            onDismissed={() => {
              if (transitionRef.current === "closing_edit_for_review") {
                finishTransition("closing_edit_for_review", "review")
              } else if (transitionRef.current === "review") {
                return
              } else {
                transitionRef.current = "closed"
                setStage("closed")
                setServiceKey(null)
              }
            }}
            onNextAccessMode={setNextAccessMode}
            onReview={reviewChange}
            serviceKey={serviceKey}
            visible={stage === "edit"}
          />

          <SubmissionReviewSheet
            confirmLabel="Confirm change"
            description={getOperationProfileMode(nextAccessMode).description}
            error={submitError}
            isSubmitting={isSubmitting}
            onClose={() => {
              if (transitionRef.current === "review") {
                queueSheetTransition("closing_review_for_edit", "edit")
              }
            }}
            onConfirm={() => void confirmChange()}
            onDismissed={() => {
              if (transitionRef.current === "closing_review_for_success") {
                finishTransition("closing_review_for_success", "success")
              } else if (transitionRef.current === "closing_review_for_edit") {
                finishTransition("closing_review_for_edit", "edit")
              } else if (
                transitionRef.current === "closing_review_for_conflict"
              ) {
                finishTransition("closing_review_for_conflict", "conflict")
              }
            }}
            rows={[
              {
                label: "Service",
                value: selectedDefinition?.label ?? "",
                className: "min-h-11",
                showIcon: false,
              },
              {
                label: "From",
                className: "min-h-11",
                showIcon: false,
                value: getOperationProfileMode(expectedAccessMode).label,
              },
              {
                label: "To",
                className: "min-h-11",
                showIcon: false,
                value: getOperationProfileMode(nextAccessMode).label,
              },
              {
                label: "Audit reason",
                className: "min-h-11",
                showIcon: false,
                detail: changeReason.trim() || "Not required",
              },
            ]}
            title="Review service access"
            visible={stage === "review"}
          />

          <OperationProfileConflictSheet
            error={conflictError}
            isRefreshing={isResolvingConflict}
            nextModeLabel={getOperationProfileMode(nextAccessMode).label}
            onKeepEditing={keepEditingAfterConflict}
            onDismissed={() => {
              if (transitionRef.current === "closing_conflict_for_edit") {
                finishTransition("closing_conflict_for_edit", "edit")
              } else if (
                transitionRef.current === "closing_conflict_for_review"
              ) {
                finishTransition("closing_conflict_for_review", "review")
              }
            }}
            onRefreshAndReview={() => void refreshAndReviewConflict()}
            reviewedModeLabel={
              getOperationProfileMode(expectedAccessMode).label
            }
            serviceLabel={selectedDefinition?.label ?? "Service"}
            visible={stage === "conflict"}
          />

          <SubmissionSuccessSheet
            description={`${selectedDefinition?.label ?? "Service"} is now ${getOperationProfileMode(nextAccessMode).label.toLowerCase()}. Existing records remain readable.`}
            onClose={() => {
              transitionRef.current = "closed"
              setStage("closed")
              setServiceKey(null)
              setChangeReason("")
            }}
            title="Service access saved"
            visible={stage === "success"}
          />
        </>
      ) : null}
    </SafeArea>
  )
}
