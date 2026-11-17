import { AppSheet } from "@/components/app/app-sheet"
import { ConfirmSheet } from "@/components/app/confirm-sheet"
import { ResultScreen, ReviewRow } from "@/components/app/result-screen"
import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { Icon } from "@/components/ui/icon"
import { Elevated, ListCard } from "@/components/ui/list-card"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import { mobileDevQuickFill } from "@/dev/mobile-dev-quick-fill"
import { useColors } from "@/hooks/use-color"
import { useMobileFormDraft } from "@/hooks/use-mobile-form-draft"
import { THEME } from "@/lib/theme"
import { cn } from "@/lib/utils"
import { useEffect, useRef, useState } from "react"
import { BackHandler, Keyboard, View } from "react-native"
import { resolveOperationProfileConflictRefresh } from "../model/operation-profile-conflict"
import {
  getOperationProfileMode,
  getOperationProfileService,
  getOperationProfileServiceConsequence,
  isRestrictiveOperationProfileChange,
  operationProfileModeOptions,
} from "../model/operation-profile-policy"
import type {
  MobileOperationProfileService,
  MobileOperationProfileSnapshot,
  UpdateMobileOperationProfileServiceInput,
  UpdateMobileOperationProfileServiceResult,
} from "../model/operation-profile-types"
import { OperationProfileConflictSheet } from "./operation-profile-conflict-sheet"
import {
  AuditReason,
  ModePill,
  ModeTransition,
  ProfileBanner,
  ServiceTile,
} from "./operation-profile-ui"

type Draft = UpdateMobileOperationProfileServiceInput & { changeReason: string }
type Stage = "edit" | "review" | "conflict" | "success"

function Steps({ reviewing }: { reviewing: boolean }) {
  return (
    <View accessible={false} className="flex-row gap-[6px]">
      <View className="h-[4px] flex-1 rounded-full bg-primary" />
      <View
        className={cn(
          "h-[4px] flex-1 rounded-full",
          reviewing ? "bg-primary" : "bg-surface-raised"
        )}
      />
    </View>
  )
}

function ReviewHero({
  draft,
  serviceLabel,
}: {
  draft: Draft
  serviceLabel: string
}) {
  const colors = useColors()
  return (
    <View
      style={{
        backgroundColor: colors.heroMid,
        borderRadius: 28,
        experimental_backgroundImage: `linear-gradient(160deg, ${colors.heroStart} 0%, ${colors.heroMid} 55%, ${colors.heroEnd} 100%)`,
        overflow: "hidden",
      }}
    >
      <View className="gap-[12px] p-[18px]">
        <View
          pointerEvents="none"
          style={{
            backgroundColor: THEME.light.card,
            borderRadius: 90,
            height: 180,
            opacity: 0.07,
            position: "absolute",
            right: -70,
            top: -70,
            width: 180,
          }}
        />
        <Text className="text-hero-foreground/80" variant="caption">
          {serviceLabel}
        </Text>
        <ModeTransition
          from={draft.expectedAccessMode}
          inverse
          to={draft.nextAccessMode}
        />
        <Text className="text-hero-foreground/80" variant="small">
          {getOperationProfileServiceConsequence({
            accessMode: draft.nextAccessMode,
            serviceKey: draft.serviceKey,
          })}
        </Text>
      </View>
    </View>
  )
}

export function OperationProfileEditSheet({
  actorName,
  isOnline,
  isReadOnly,
  isSubmitting,
  onClose,
  onRefresh,
  onUpdate,
  service,
  submitError,
}: {
  actorName?: string
  isOnline: boolean
  isReadOnly: boolean
  isSubmitting: boolean
  onClose: () => void
  onRefresh: () => Promise<MobileOperationProfileSnapshot | null>
  onUpdate: (
    input: UpdateMobileOperationProfileServiceInput
  ) => Promise<UpdateMobileOperationProfileServiceResult>
  service: MobileOperationProfileService
  submitError: string | null
}) {
  const definition = getOperationProfileService(service.serviceKey)
  const [visible, setVisible] = useState(true)
  const [stage, setStage] = useState<Stage>("edit")
  const [discard, setDiscard] = useState(false)
  const [restored, setRestored] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [reviewNotice, setReviewNotice] = useState<string | null>(null)
  const [conflictError, setConflictError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const operationPending = useRef(false)
  const [draft, setDraft] = useState<Draft>({
    changeReason: "",
    expectedAccessMode: service.accessMode,
    nextAccessMode: service.accessMode,
    serviceKey: service.serviceKey,
  })
  const changed = draft.nextAccessMode !== draft.expectedAccessMode
  const hasReason = draft.changeReason.trim().length > 0
  const restrictive = isRestrictiveOperationProfileChange({
    next: draft.nextAccessMode,
    previous: draft.expectedAccessMode,
  })
  const canReview = changed && (!restrictive || hasReason)
  const reviewing = stage === "review" || stage === "conflict"
  const clearDraft = useMobileFormDraft({
    enabled: visible && stage !== "success",
    key: `operation-profile.${service.serviceKey}`,
    onHydrate: (saved: Draft) => {
      if (
        changed ||
        hasReason ||
        saved.serviceKey !== service.serviceKey ||
        saved.expectedAccessMode !== service.accessMode
      )
        return
      if (
        saved.nextAccessMode === saved.expectedAccessMode &&
        !saved.changeReason.trim()
      )
        return
      setDraft(saved)
      setRestored(true)
    },
    value: draft,
  })

  useEffect(() => {
    if (stage !== "success" || !visible) return
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        setVisible(false)
        return true
      }
    )
    return () => subscription.remove()
  }, [stage, visible])

  function closeEditor() {
    if (operationPending.current || isSubmitting) return
    if (reviewing) {
      setStage("edit")
      return
    }
    if (changed || hasReason) setDiscard(true)
    else setVisible(false)
  }

  async function discardChange() {
    if (operationPending.current) return
    operationPending.current = true
    try {
      await clearDraft()
      setDiscard(false)
      setVisible(false)
    } catch {
      setDiscard(false)
      setNotice("Could not discard this draft. Try again.")
    } finally {
      operationPending.current = false
    }
  }

  async function confirmChange() {
    if (operationPending.current || isReadOnly || !canReview) return
    operationPending.current = true
    try {
      const result = await onUpdate({
        ...draft,
        changeReason: draft.changeReason.trim() || undefined,
      })
      if (result.status === "conflict") {
        setConflictError(null)
        setStage("conflict")
      }
      if (result.status === "saved") {
        await clearDraft().catch(() => undefined)
        setStage("success")
      }
    } finally {
      operationPending.current = false
    }
  }

  async function refreshConflict() {
    if (operationPending.current || !isOnline) return
    operationPending.current = true
    setRefreshing(true)
    setConflictError(null)
    try {
      const snapshot = await onRefresh()
      if (!snapshot)
        throw new Error("The latest setting couldn’t be refreshed. Try again.")
      const resolution = resolveOperationProfileConflictRefresh({
        changeReason: draft.changeReason,
        nextAccessMode: draft.nextAccessMode,
        serviceKey: service.serviceKey,
        snapshot,
      })
      if (resolution.status === "service_missing") {
        throw new Error(
          "This service is no longer available in Operation Profile."
        )
      }
      const { expectedAccessMode } = resolution
      setDraft((current) => ({ ...current, expectedAccessMode }))
      const currentLabel =
        getOperationProfileMode(expectedAccessMode).label.toLowerCase()
      if (resolution.status === "already_current") {
        await clearDraft().catch(() => undefined)
        setDraft((current) => ({ ...current, changeReason: "" }))
        setRestored(false)
        setNotice(
          `${definition.label} is already ${currentLabel}. No new change is needed.`
        )
        setStage("edit")
        return
      }
      const updated = `${definition.label} is now ${currentLabel}.`
      setReviewNotice(updated)
      if (resolution.status === "reason_required") {
        setNotice(`${updated} Enter an audit reason for the new change.`)
        setStage("edit")
      } else {
        setStage("review")
      }
    } catch (error) {
      setConflictError(
        error instanceof Error
          ? error.message
          : "The latest setting couldn’t be refreshed. Try again."
      )
    } finally {
      setRefreshing(false)
      operationPending.current = false
    }
  }

  const busy = isSubmitting || refreshing
  const formLocked = isReadOnly && stage !== "conflict"
  const completed = stage === "success"
  return (
    <AppSheet
      contentClassName="gap-[18px] px-[18px] pt-[14px]"
      contentKey={reviewing ? "review" : "edit"}
      footer={
        reviewing ? (
          <View className="gap-[6px]">
            <Button
              disabled={formLocked}
              loading={isSubmitting}
              onPress={() => void confirmChange()}
            >
              <Text>
                {isSubmitting
                  ? "Saving"
                  : submitError
                    ? "Try again"
                    : "Confirm change"}
              </Text>
            </Button>
            <Button
              disabled={busy}
              onPress={closeEditor}
              size="sm"
              variant="ghost"
            >
              <Text className="text-foreground-soft">Back to edit</Text>
            </Button>
          </View>
        ) : (
          <View className="flex-row gap-[8px]">
            <DevQuickFill
              label="Quick fill Operation Profile change reason"
              onPress={() =>
                setDraft((current) => ({
                  ...current,
                  changeReason:
                    mobileDevQuickFill.operationProfile.changeReason,
                }))
              }
              placement="footer"
              portal={false}
            />
            <Button
              accessibilityLabel={`Review ${definition.label} access change`}
              className="min-w-0 flex-1"
              disabled={!canReview || formLocked}
              onPress={() => {
                Keyboard.dismiss()
                setStage("review")
              }}
            >
              <Text>Review change</Text>
              <Icon
                className="size-base text-primary-foreground"
                name="ArrowRight"
              />
            </Button>
          </View>
        )
      }
      footerOnCard
      headerOnCard
      headerTrailing={reviewing ? "2 of 2" : "1 of 2"}
      isSubmitting={busy}
      onBack={reviewing ? closeEditor : undefined}
      onClose={closeEditor}
      onDismissed={onClose}
      overlay={
        <>
          {completed ? (
            <View className="absolute inset-0">
              <ResultScreen
                compact
                description={`${definition.label} is now ${getOperationProfileMode(draft.nextAccessMode).label.toLowerCase()}. Existing records remain readable.`}
                details={
                  <>
                    <ReviewRow
                      compact
                      label="Access mode"
                      value={
                        <View className="max-w-[65%] shrink">
                          <ModeTransition
                            from={draft.expectedAccessMode}
                            to={draft.nextAccessMode}
                          />
                        </View>
                      }
                    />
                    <View className="mx-[16px] h-px bg-border" />
                    <AuditReason reason={draft.changeReason} />
                  </>
                }
                headerTitle={definition.label}
                primary={{ label: "Done", onPress: () => setVisible(false) }}
                title="Service access saved"
                titleVariant="screenTitle"
                tone="success"
              />
            </View>
          ) : null}
          <OperationProfileConflictSheet
            error={conflictError}
            isRefreshing={refreshing}
            nextModeLabel={getOperationProfileMode(draft.nextAccessMode).label}
            onKeepEditing={() => {
              if (!operationPending.current) setStage("edit")
            }}
            onRefreshAndReview={() => {
              if (isOnline) void refreshConflict()
              else setConflictError("Reconnect to refresh the latest setting.")
            }}
            reviewedModeLabel={
              getOperationProfileMode(draft.expectedAccessMode).label
            }
            serviceLabel={definition.label}
            visible={visible && stage === "conflict"}
          />
          <ConfirmSheet
            cancelLabel="Keep editing"
            confirmLabel="Discard"
            description="The selected access mode and reason won’t be saved."
            icon="Trash2"
            onCancel={() => setDiscard(false)}
            onConfirm={() => void discardChange()}
            title="Discard this change?"
            tone="destructive"
            visible={visible && discard}
          />
        </>
      }
      overlayActive={completed || discard || stage === "conflict"}
      title={reviewing ? "Review change" : definition.label}
      variant="form"
      visible={visible}
    >
      <Steps reviewing={reviewing} />
      {formLocked ? (
        <ProfileBanner
          icon={isOnline ? "Lock" : "WifiOff"}
          title={isOnline ? "Latest settings required" : "You’re offline"}
          description="Reconnect and refresh the operation profile before saving. Your draft stays here."
          tone="warning"
        />
      ) : null}
      {reviewing ? (
        <>
          {reviewNotice ? (
            <ProfileBanner
              icon="RefreshCw"
              title="Updated to the latest setting"
              description={`${reviewNotice} Review again before confirming.`}
            />
          ) : null}
          {submitError ? (
            <ProfileBanner
              icon="CircleAlert"
              title={submitError}
              tone="error"
            />
          ) : null}
          <ReviewHero draft={draft} serviceLabel={definition.label} />
          <ListCard inset={false}>
            <ReviewRow compact label="Service" value={definition.label} />
            {actorName ? (
              <ReviewRow
                compact
                label="Changed by"
                value={`${actorName} · Admin`}
              />
            ) : null}
            <AuditReason reason={draft.changeReason} />
          </ListCard>
        </>
      ) : (
        <>
          {notice ? <ProfileBanner icon="Info" title={notice} /> : null}
          {restored ? (
            <ProfileBanner
              icon="History"
              title="Draft restored"
              description="Your selected mode and reason were kept on this phone."
            />
          ) : null}
          <View className="bg-surface-raised flex-row items-center gap-[10px] rounded-[18px] px-[14px] py-[12px]">
            <ServiceTile serviceKey={service.serviceKey} />
            <View className="min-w-0 flex-1 gap-[6px]">
              <Text className="text-muted-foreground" variant="caption">
                Access mode
              </Text>
              <View className="flex-row flex-wrap items-center gap-[6px]">
                <ModePill mode={draft.expectedAccessMode} />
                {changed ? (
                  <>
                    <Icon
                      className="size-base text-muted-foreground"
                      name="ArrowRight"
                    />
                    <ModePill mode={draft.nextAccessMode} />
                  </>
                ) : null}
              </View>
            </View>
          </View>
          <View accessibilityRole="radiogroup" className="gap-[10px]">
            {operationProfileModeOptions.map((option) => {
              const selected = draft.nextAccessMode === option.value
              return (
                <Elevated key={option.value} radius={18}>
                  <Pressable
                    accessibilityLabel={`${option.label}. ${option.summary}`}
                    accessibilityHint={option.description}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    className={cn(
                      "flex-row items-start gap-[12px] rounded-[18px] border-[1.5px] px-[14px] py-[13px]",
                      selected
                        ? "border-primary bg-accent/45"
                        : "border-transparent bg-card dark:border-border"
                    )}
                    onPress={() => {
                      setDraft((current) => ({
                        ...current,
                        nextAccessMode: option.value,
                      }))
                      setNotice(null)
                    }}
                    testID={`operation-profile-mode-${option.value}`}
                  >
                    <View
                      className={cn(
                        "mt-[2px] size-[20px] items-center justify-center rounded-full border-2",
                        selected ? "border-primary" : "border-input"
                      )}
                    >
                      {selected ? (
                        <View className="size-[10px] rounded-full bg-primary" />
                      ) : null}
                    </View>
                    <View className="min-w-0 flex-1 gap-[3px]">
                      <View className="flex-row items-start justify-between gap-[8px]">
                        <Text className="shrink font-bold" variant="body">
                          {option.label}
                        </Text>
                        {option.value === draft.expectedAccessMode ? (
                          <Text
                            className="text-muted-foreground"
                            variant="caption"
                          >
                            Current
                          </Text>
                        ) : null}
                      </View>
                      <Text className="text-muted-foreground" variant="small">
                        {option.description}
                      </Text>
                    </View>
                  </Pressable>
                </Elevated>
              )
            })}
          </View>
          <FormField
            helper={
              restrictive
                ? hasReason
                  ? "Saved with the change in the audit log."
                  : "Members or staff lose access with this change."
                : "Optional. Saved with the change in the audit log."
            }
            label="Change reason"
            trailingLabel={
              <Text
                className={
                  restrictive
                    ? "text-tint-warm-foreground"
                    : "text-muted-foreground"
                }
                variant="caption"
              >
                {restrictive ? "Required" : "Optional"}
              </Text>
            }
          >
            <Textarea
              accessibilityLabel="Operation Profile change reason"
              className="min-h-[104px] rounded-[14px] border-border bg-card px-[14px] py-[13px] text-[16px]"
              maxLength={1000}
              numberOfLines={3}
              onChangeText={(changeReason) =>
                setDraft((current) => ({ ...current, changeReason }))
              }
              placeholder="Why is this access mode changing?"
              testID="operation-profile-change-reason"
              value={draft.changeReason}
            />
          </FormField>
        </>
      )}
    </AppSheet>
  )
}
