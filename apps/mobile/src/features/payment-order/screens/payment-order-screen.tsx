import { ConfirmSheet } from "@/components/app/confirm-sheet"
import { EmptyState } from "@/components/app/empty-state"
import { ResultScreen } from "@/components/app/result-screen"
import { ScreenShell, useScreenBack } from "@/components/app/screen-shell"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { ListCard } from "@/components/ui/list-card"
import { Pressable } from "@/components/ui/pressable"
import { StatusBanner } from "@/components/ui/status-banner"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"
import { useNavigation } from "expo-router"
import { useEffect, useRef, useState } from "react"
import { View } from "react-native"
import { PaymentOrderList } from "../components/payment-order-list"
import {
  isSamePaymentOrderSettings,
  paymentOrderLeftovers,
  paymentOrderModes,
  type PaymentOrderSettings,
} from "../model/payment-order-model"

export type PaymentOrderSaveResult = "saved" | "failed"

function ModeOption({
  description,
  disabled,
  label,
  onPress,
  selected,
  value,
}: {
  description: string
  disabled: boolean
  label: string
  onPress: () => void
  selected: boolean
  value: string
}) {
  return (
    <Pressable
      accessibilityLabel={`${label}. ${description}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      className={cn(
        "flex-row items-start gap-[12px] p-[14px]",
        !disabled && "active:bg-accent"
      )}
      disabled={disabled}
      haptic={!disabled}
      onPress={onPress}
      testID={`payment-order-mode-${value}`}
    >
      <View
        className={cn(
          "mt-[1px] size-[22px] rounded-full",
          selected ? "border-[7px] border-primary" : "border-2 border-border"
        )}
      />
      <View className="min-w-0 flex-1 gap-[2px]">
        <Text className="font-bold" variant="body">
          {label}
        </Text>
        <Text className="text-muted-foreground" variant="small">
          {description}
        </Text>
      </View>
    </Pressable>
  )
}

function SectionTitle({ hint, title }: { hint?: string; title: string }) {
  return (
    <View className="flex-row items-end justify-between gap-[12px]">
      <Text accessibilityRole="header" variant="section">
        {title}
      </Text>
      {hint ? (
        <Text className="text-muted-foreground" variant="label">
          {hint}
        </Text>
      ) : null}
    </View>
  )
}

export function PaymentOrderScreen({
  canManage,
  hasError,
  isLoading,
  isOnline,
  isRefreshing,
  isRetrying,
  onRefresh,
  onRetry,
  onSave,
  saved,
}: {
  canManage: boolean
  hasError: boolean
  isLoading: boolean
  isOnline: boolean
  isRefreshing: boolean
  isRetrying: boolean
  onRefresh: () => void
  onRetry: () => void
  onSave: (settings: PaymentOrderSettings) => Promise<PaymentOrderSaveResult>
  saved?: PaymentOrderSettings
}) {
  const goBack = useScreenBack(true)
  const navigation = useNavigation()
  const [draft, setDraft] = useState<PaymentOrderSettings | undefined>(saved)
  const [stage, setStage] = useState<"form" | "saving" | "success">("form")
  const [saveError, setSaveError] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const leaving = useRef(false)

  // Adopt the server copy while the admin hasn't changed anything.
  const untouched = useRef(true)
  useEffect(() => {
    if (saved && untouched.current) setDraft(saved)
  }, [saved])

  const dirty = Boolean(
    draft && saved && !isSamePaymentOrderSettings(draft, saved)
  )
  const saving = stage === "saving"
  const editable = canManage && isOnline && !saving

  useEffect(
    () =>
      navigation.addListener("beforeRemove", (event) => {
        if (!dirty || leaving.current || stage === "success") return
        event.preventDefault()
        setConfirmLeave(true)
      }),
    [dirty, navigation, stage]
  )

  function edit(next: PaymentOrderSettings) {
    untouched.current = false
    setSaveError(false)
    setDraft(next)
  }

  async function save() {
    if (!draft || saving) return
    setStage("saving")
    setSaveError(false)
    const result = await onSave(draft)
    if (result === "saved") {
      untouched.current = true
      setStage("success")
    } else {
      setStage("form")
      setSaveError(true)
    }
  }

  if (stage === "success" && draft) {
    const mode = paymentOrderModes.find((option) => option.value === draft.mode)
    return (
      <ResultScreen
        description={
          draft.mode === "automatic"
            ? "New member payments are applied in this order from now on."
            : "Members pick what they pay for. Anything extra follows this order."
        }
        headerTitle="Payment order"
        primary={{
          label: "Done",
          onPress: () => {
            leaving.current = true
            goBack?.()
          },
        }}
        title="Payment order saved"
        titleVariant="screenTitle"
        tone="success"
        details={
          <Text className="text-center text-muted-foreground" variant="small">
            {mode?.label}
          </Text>
        }
      />
    )
  }

  return (
    <>
      <ScreenShell
        footer={
          canManage && draft ? (
            <Button
              accessibilityLabel={saving ? "Saving payment order" : "Save payment order"}
              disabled={!dirty || !isOnline}
              loading={saving}
              onPress={() => void save()}
              testID="payment-order-save"
            >
              <Text>{saving ? "Saving…" : "Save"}</Text>
            </Button>
          ) : undefined
        }
        onRefresh={canManage && isOnline && !saving && !dirty ? onRefresh : undefined}
        refreshing={isRefreshing}
        title="Payment order"
        testID="payment-order-screen"
      >
        {!canManage ? (
          <EmptyState
            action={{ label: "Go back", onPress: () => goBack?.() }}
            description="Only Cooperative Admins can view or change the payment order."
            icon="ShieldAlert"
            title="Cooperative Admin access required"
          />
        ) : draft ? (
          <>
            <Text className="text-muted-foreground" variant="body">
              How member payments are applied to what they owe.
            </Text>
            {!isOnline ? (
              <StatusBanner
                description="Reconnect to change the payment order."
                kind="offline"
                title="You’re offline"
              />
            ) : null}
            {saveError ? (
              <StatusBanner
                description="Nothing changed. Your edits are still here."
                kind="error"
                onRetry={() => void save()}
                retryLabel="Try again"
                title="Payment order not saved"
              />
            ) : null}
            <ListCard inset={false}>
              {paymentOrderModes.map((option) => (
                <ModeOption
                  description={option.description}
                  disabled={!editable}
                  key={option.value}
                  label={option.label}
                  onPress={() => edit({ ...draft, mode: option.value })}
                  selected={draft.mode === option.value}
                  value={option.value}
                />
              ))}
            </ListCard>
            <View className="gap-[9px]">
              <SectionTitle
                hint={editable ? "Hold and drag to change" : undefined}
                title="Order"
              />
              <PaymentOrderList
                disabled={!editable}
                onChange={(order) => edit({ ...draft, order })}
                order={draft.order}
              />
            </View>
            <View className="gap-[9px]">
              <SectionTitle title="Anything left over" />
              <ListCard inset={false}>
                <View
                  accessibilityLabel={`Anything left over goes to ${paymentOrderLeftovers[draft.leftoverDestination].label}`}
                  accessible
                  className="flex-row items-center gap-[12px] p-[14px]"
                >
                  <View className="size-[36px] items-center justify-center rounded-[12px] bg-tint-success">
                    <Icon
                      className="size-base text-tint-success-foreground"
                      name="PiggyBank"
                    />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="font-bold" variant="body">
                      {paymentOrderLeftovers[draft.leftoverDestination].label}
                    </Text>
                    <Text className="text-muted-foreground" variant="small">
                      {paymentOrderLeftovers[draft.leftoverDestination].description}
                    </Text>
                  </View>
                </View>
              </ListCard>
            </View>
          </>
        ) : isLoading ? (
          <View
            accessibilityLabel="Loading payment order"
            accessibilityRole="progressbar"
            className="gap-[14px]"
          >
            <View className="h-[20px] w-[70%] rounded-[8px] bg-surface-raised" />
            <View className="h-[150px] rounded-[20px] bg-surface-raised" />
            <View className="h-[408px] rounded-[20px] bg-surface-raised" />
          </View>
        ) : hasError ? (
          <EmptyState
            action={
              isOnline
                ? { label: "Try again", loading: isRetrying, onPress: onRetry }
                : undefined
            }
            description={
              isOnline
                ? "The payment order could not be loaded. Nothing changed."
                : "Reconnect to load the payment order."
            }
            icon={isOnline ? "CircleAlert" : "WifiOff"}
            title={isOnline ? "Payment order unavailable" : "You’re offline"}
            tone={isOnline ? "error" : "warning"}
          />
        ) : null}
      </ScreenShell>
      <ConfirmSheet
        cancelLabel="Keep editing"
        confirmLabel="Discard"
        description="Your changes to the payment order won’t be saved."
        icon="Trash2"
        onCancel={() => setConfirmLeave(false)}
        onConfirm={() => {
          leaving.current = true
          setConfirmLeave(false)
          goBack?.()
        }}
        title="Discard changes?"
        tone="destructive"
        visible={confirmLeave}
      />
    </>
  )
}
