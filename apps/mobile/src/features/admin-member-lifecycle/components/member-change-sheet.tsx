import { AppSheet } from "@/components/app/app-sheet"
import { DevQuickFill } from "@/components/app/dev-quick-fill"
import {
  ResultScreen,
  ReviewRow,
  ReviewSummary,
} from "@/components/app/result-screen"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { TintedAvatar } from "@/components/ui/list-card"
import {
  SegmentedControl,
  type SegmentedOption,
} from "@/components/ui/segmented-control"
import { StatusBanner } from "@/components/ui/status-banner"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import { mobileDevQuickFill } from "@/dev/mobile-dev-quick-fill"
import { useEffect, useRef, useState } from "react"
import { BackHandler, Keyboard, View } from "react-native"

export function MemberChangeSheet<T extends string>({
  blocked,
  danger,
  from,
  initialValue,
  memberName,
  memberNumber,
  onClose,
  onSubmit,
  options,
  quickFillKind,
  title,
}: {
  blocked: boolean
  danger?: boolean
  from?: string
  initialValue: T
  memberName: string
  memberNumber: string
  onClose: () => void
  onSubmit: (value: T, notes: string) => Promise<void>
  options: readonly SegmentedOption<T>[]
  quickFillKind: keyof typeof mobileDevQuickFill.adminMemberReview
  title: string
}) {
  const [value, setValue] = useState(initialValue)
  const [notes, setNotes] = useState("")
  const [invalid, setInvalid] = useState(false)
  const [step, setStep] = useState<"form" | "review" | "success" | "error">(
    "form"
  )
  const [isSubmitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const submitting = useRef(false)
  const label = options.find((option) => option.value === value)?.label ?? title
  const form = step === "form"
  const outcome = step === "success" || step === "error"
  const destructive = danger || value === "rejected"
  const confirm = destructive ? "Confirm change" : "Save change"

  useEffect(() => {
    if (!outcome) return
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!submitting.current) onClose()
      return true
    })
    return () => listener.remove()
  }, [onClose, outcome])

  async function submit() {
    if (blocked || submitting.current) return
    submitting.current = true
    setSubmitting(true)
    try {
      await onSubmit(value, notes.trim())
      setStep("success")
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "The change could not be saved."
      )
      setStep("error")
    } finally {
      submitting.current = false
      setSubmitting(false)
    }
  }

  return (
    <AppSheet
      dirty={form && Boolean(notes.trim())}
      headerTrailing={form ? "1 of 2" : "2 of 2"}
      isSubmitting={isSubmitting}
      onBack={step === "review" ? () => setStep("form") : undefined}
      onClose={onClose}
      overlayActive={outcome}
      title={form ? title : "Review change"}
      variant="form"
      visible
      footer={
        <View className="flex-row gap-[10px]">
          {form ? (
            <DevQuickFill
              placement="footer"
              portal={false}
              onPress={() =>
                setNotes(mobileDevQuickFill.adminMemberReview[quickFillKind])
              }
            />
          ) : null}
          <Button
            className="flex-1"
            disabled={blocked}
            loading={isSubmitting}
            onPress={
              form
                ? () => {
                    if (notes.trim().length < 2) {
                      setInvalid(true)
                      return
                    }
                    Keyboard.dismiss()
                    setStep("review")
                  }
                : submit
            }
            variant={!form && destructive ? "destructive" : "default"}
          >
            <Text>
              {form ? "Review change" : isSubmitting ? "Saving…" : confirm}
            </Text>
          </Button>
        </View>
      }
      overlay={
        outcome ? (
          <View className="absolute inset-0 z-20">
            {step === "success" ? (
              <ResultScreen
                align="top"
                description={`${memberName} · ${label}`}
                onDone={onClose}
                primary={{ label: "Done", onPress: onClose }}
                title="Change saved"
                tone="success"
              />
            ) : (
              <ResultScreen
                align="top"
                description={error}
                primary={{
                  label: "Try again",
                  loading: isSubmitting,
                  onPress: submit,
                }}
                secondary={{
                  label: "Edit change",
                  onPress: () => setStep("form"),
                  variant: "secondary",
                }}
                title="Change not saved"
                tone="error"
              />
            )}
          </View>
        ) : undefined
      }
    >
      <View className="gap-[16px]">
        <View className="flex-row items-center gap-[12px] rounded-[20px] bg-card p-[14px]">
          <TintedAvatar name={memberName} />
          <View className="min-w-0 flex-1">
            <Text className="font-bold" variant="body">
              {memberName}
            </Text>
            <Text className="text-muted-foreground" variant="small">
              {memberNumber}
            </Text>
          </View>
        </View>
        {blocked ? (
          <StatusBanner
            kind="offline"
            title="Refresh before making changes"
            description="Reconnect and refresh this record to continue."
          />
        ) : null}
        {form ? (
          <>
            {options.length > 1 ? (
              <FormField label="Decision">
                <SegmentedControl
                  accessibilityLabel="Decision"
                  onChange={setValue}
                  options={options}
                  value={value}
                />
              </FormField>
            ) : null}
            {destructive ? (
              <StatusBanner
                kind="info"
                title={label}
                description="This decision may affect the member’s access to the cooperative."
              />
            ) : null}
            <FormField
              error={
                invalid && notes.trim().length < 2
                  ? "Enter a reason for this decision."
                  : undefined
              }
              helper="Required. Saved with this change in the audit record."
              label={
                quickFillKind === "onboardingNotes"
                  ? "Decision notes"
                  : "Reason"
              }
              trailingLabel={`${notes.length}/1000`}
            >
              <Textarea
                maxLength={1000}
                onChangeText={setNotes}
                placeholder="Why are you making this change?"
                value={notes}
              />
            </FormField>
          </>
        ) : step === "review" ? (
          <ReviewSummary title="Decision">
            {from ? <ReviewRow label="Current status" value={from} /> : null}
            <ReviewRow label="Change" value={label} />
            <ReviewRow label="Reason" value={notes.trim()} />
          </ReviewSummary>
        ) : null}
      </View>
    </AppSheet>
  )
}
