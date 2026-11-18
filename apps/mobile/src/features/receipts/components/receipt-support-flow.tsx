import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { mobileDevQuickFill } from "@/dev/mobile-dev-quick-fill"
import { AppSheet } from "@/components/app/app-sheet"
import { ResultScreen, SubmittingState } from "@/components/app/result-screen"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { Icon } from "@/components/ui/icon"
import { StatusBanner } from "@/components/ui/status-banner"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import { useRef, useState } from "react"
import { Keyboard, View } from "react-native"
import { createReceiptSupportCase } from "../api/member-receipts-api"
import type { MobilePaymentReceipt } from "../model/member-receipt-types"
import { receiptTitle } from "../model/receipt-presentation"
import { ReceiptCardLabel, ReceiptFinanceNote } from "./receipt-detail"

export function ReceiptSupportFlow({
  canSubmit,
  currency,
  description,
  offline,
  onClose,
  onEdit,
  onSent,
  receipt,
  stale,
  visible,
}: {
  canSubmit: boolean
  currency: string
  description: string
  offline: boolean
  onClose: () => void
  onEdit: (value: string) => void
  onSent: () => void
  receipt: MobilePaymentReceipt
  stale: boolean
  visible: boolean
}) {
  const [phase, setPhase] = useState<"edit" | "sending" | "success" | "error">(
    "edit"
  )
  const sending = useRef(false)
  const count = description.trim().length
  async function send() {
    if (!canSubmit || offline || stale || count < 5 || sending.current) return
    sending.current = true
    setPhase("sending")
    Keyboard.dismiss()
    try {
      await createReceiptSupportCase({
        description: description.trim(),
        receiptId: receipt.id,
      })
      setPhase("success")
      onSent()
    } catch {
      setPhase("error")
    } finally {
      sending.current = false
    }
  }
  const outcome = phase === "success" || phase === "error"
  return (
    <AppSheet
      footer={
        phase === "edit" ? (
          <View className="gap-[6px]">
            {offline || stale || count < 5 ? (
              <Text
                className="text-center text-muted-foreground"
                variant="small"
              >
                {offline
                  ? "Connect to open the case."
                  : stale
                    ? "Refresh receipts before opening a case."
                    : "Write at least 5 characters."}
              </Text>
            ) : null}
            <View className="flex-row items-center gap-[8px]">
              {!count ? (
                <DevQuickFill
                  label="Quick fill issue"
                  onPress={() =>
                    onEdit(mobileDevQuickFill.receiptSupport.description)
                  }
                  placement="footer"
                  portal={false}
                />
              ) : null}
              <Button
                className="flex-1"
                disabled={!canSubmit || offline || stale || count < 5}
                onPress={send}
              >
                <Icon
                  className="size-[18px] text-primary-foreground"
                  name="Send"
                />
                <Text>Open support case</Text>
              </Button>
            </View>
          </View>
        ) : null
      }
      isSubmitting={phase === "sending"}
      onClose={onClose}
      overlayActive={phase !== "edit"}
      overlay={
        phase !== "edit" ? (
          <View
            accessibilityViewIsModal
            className="absolute inset-0 bg-background"
          >
            {outcome ? (
              <ResultScreen
                compact
                description={
                  phase === "success"
                    ? "Finance will reply in Support. We’ll notify you when they do."
                    : "Your message is kept. Try again in a moment."
                }
                primary={
                  phase === "success"
                    ? { label: "Done", onPress: onClose }
                    : offline || stale
                      ? undefined
                      : { label: "Try again", onPress: send }
                }
                secondary={
                  phase === "error"
                    ? {
                        label: "Edit message",
                        onPress: () => setPhase("edit"),
                        variant: "ghost",
                      }
                    : undefined
                }
                title={
                  phase === "success"
                    ? "Support case opened"
                    : "Couldn’t open the case"
                }
                tone={phase === "success" ? "success" : "error"}
              />
            ) : (
              <SubmittingState
                title="Opening your case"
                description={`About ${receiptTitle(receipt)}`}
              />
            )}
          </View>
        ) : null
      }
      title="Receipt support"
      variant="form"
      visible={visible}
    >
      {offline ? (
        <StatusBanner
          kind="offline"
          title="You’re offline"
          description="Your message stays here until you send it."
        />
      ) : null}
      {!canSubmit && !offline ? (
        <StatusBanner kind="info" title="New support cases are off" />
      ) : null}
      <ReceiptCardLabel currency={currency} receipt={receipt} />
      <ReceiptFinanceNote receipt={receipt} />
      <FormField label="What’s wrong with this receipt?">
        <Textarea
          accessibilityLabel="What’s wrong with this receipt?"
          testID="receipt-support-description"
          className="min-h-[114px] rounded-[14px] px-[14px] py-[12px]"
          maxLength={2000}
          numberOfLines={4}
          onChangeText={onEdit}
          placeholder="For example: I paid ₦25,000 but the slip was cut off. Here is the full one."
          value={description}
        />
        <View className="flex-row justify-between gap-[8px]">
          <Text className="flex-1 text-muted-foreground" variant="small">
            Finance sees this receipt with your message.
          </Text>
          <Text className="text-muted-foreground" variant="caption">
            {count}/2000
          </Text>
        </View>
      </FormField>
    </AppSheet>
  )
}
