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
import { Input } from "@/components/ui/input"
import { ListCard } from "@/components/ui/list-card"
import { Pressable } from "@/components/ui/pressable"
import { StatusBanner } from "@/components/ui/status-banner"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import { mobileDevQuickFill } from "@/dev/mobile-dev-quick-fill"
import { useColors } from "@/hooks/use-color"
import { cn } from "@/lib/utils"
import { useRef, useState } from "react"
import { Keyboard, Switch, View } from "react-native"
import { supportCategories } from "../model/member-support-presentation"
import type {
  MobileSupportCase,
  MobileSupportCategory,
  MobileSupportCreateInput,
} from "../model/member-support-types"

export type SupportFormDraft = {
  category: MobileSupportCategory | null
  subject: string
  description: string
  moneyImpactRequested: boolean
}

export const emptySupportForm: SupportFormDraft = {
  category: null,
  subject: "",
  description: "",
  moneyImpactRequested: false,
}

export function hasSupportFormDraft(form: SupportFormDraft) {
  return Boolean(
    form.category ||
    form.subject.trim() ||
    form.description.trim() ||
    form.moneyImpactRequested
  )
}

export function MemberSupportCreate({
  cooperative,
  visible,
  online,
  form,
  change,
  close,
  create,
  viewCase,
}: {
  cooperative: string
  visible: boolean
  online: boolean
  form: SupportFormDraft
  change: (next: SupportFormDraft) => void
  close: () => void
  create: (input: MobileSupportCreateInput) => Promise<MobileSupportCase>
  viewCase: (id: string) => void
}) {
  const colors = useColors()
  const [step, setStep] = useState<
    "form" | "review" | "submitting" | "success" | "error"
  >("form")
  const [validating, setValidating] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const submitting = useRef(false)
  const { category, description, moneyImpactRequested, subject } = form
  const dirty = hasSupportFormDraft(form)
  const errors = {
    category: !category ? "Choose a category." : undefined,
    subject:
      subject.trim().length < 3
        ? "Enter a subject of at least 3 characters."
        : undefined,
    description:
      description.trim().length < 5
        ? "Enter a description of at least 5 characters."
        : undefined,
  }
  const reset = () => {
    setStep("form")
    setValidating(false)
    setConfirmLeave(false)
    setCreatedId(null)
  }
  const requestClose = () => {
    if (submitting.current) return
    if (dirty) setConfirmLeave(true)
    else close()
  }
  const review = () => {
    Keyboard.dismiss()
    setValidating(true)
    if (!errors.category && !errors.subject && !errors.description)
      setStep("review")
  }
  const submit = async () => {
    if (submitting.current || !online || !category) return
    submitting.current = true
    setStep("submitting")
    try {
      const result = await create({
        category,
        moneyImpactRequested,
        description: description.trim(),
        subject: subject.trim(),
      })
      setCreatedId(result.id)
      change(emptySupportForm)
      setStep("success")
    } catch {
      setStep("error")
    } finally {
      submitting.current = false
    }
  }
  const edit = () => setStep("form")
  const title =
    step === "review"
      ? "Review case"
      : step === "success"
        ? "Case sent"
        : "New support case"

  return (
    <AppSheet
      footer={
        step === "form" ? (
          <View className="flex-row items-center gap-[10px]">
            {!dirty ? (
              <DevQuickFill
                label="Quick fill support case"
                onPress={() =>
                  change({
                    ...mobileDevQuickFill.support,
                    category: "payment_issue",
                    moneyImpactRequested: false,
                  })
                }
                placement="footer"
                portal={false}
              />
            ) : null}
            <Button className="flex-1" disabled={!online} onPress={review}>
              <Text>Review case</Text>
            </Button>
          </View>
        ) : step === "review" ? (
          <View className="gap-[8px]">
            <Button disabled={!online} onPress={() => void submit()}>
              <Icon
                className="size-[20px] text-primary-foreground"
                name="ArrowUp"
              />
              <Text>Send case</Text>
            </Button>
            <Button onPress={edit} variant="ghost">
              <Text>Edit</Text>
            </Button>
          </View>
        ) : step === "success" ? (
          <View className="gap-[8px]">
            <Button
              onPress={() => {
                if (createdId) viewCase(createdId)
              }}
            >
              <Text>View case</Text>
            </Button>
            <Button onPress={close} variant="ghost">
              <Text>Done</Text>
            </Button>
          </View>
        ) : step === "error" ? (
          <View className="gap-[8px]">
            {online ? (
              <Button onPress={() => void submit()}>
                <Text>Try again</Text>
              </Button>
            ) : null}
            <Button onPress={edit} variant={online ? "ghost" : "default"}>
              <Text>Back to edit</Text>
            </Button>
          </View>
        ) : undefined
      }
      headerTrailing={
        step === "form" ? "1 of 2" : step === "review" ? "2 of 2" : undefined
      }
      isSubmitting={step === "submitting"}
      onBack={step === "review" ? edit : undefined}
      onClose={requestClose}
      onDismissed={reset}
      overlay={
        <AppSheet
          dismissible={false}
          onBackPress={() => setConfirmLeave(false)}
          onClose={() => setConfirmLeave(false)}
          title="Leave this case?"
          variant="confirm"
          visible={confirmLeave}
        >
          <Text className="text-muted-foreground" variant="body">
            Keep it on this phone to finish later, or discard it.
          </Text>
          <View className="gap-[8px]">
            <Button
              onPress={() => {
                setConfirmLeave(false)
                close()
              }}
            >
              <Text>Keep draft</Text>
            </Button>
            <Button
              onPress={() => {
                change(emptySupportForm)
                setConfirmLeave(false)
                close()
              }}
              variant="destructive"
            >
              <Text>Discard case</Text>
            </Button>
            <Button onPress={() => setConfirmLeave(false)} variant="ghost">
              <Text>Keep editing</Text>
            </Button>
          </View>
        </AppSheet>
      }
      overlayActive={confirmLeave}
      title={title}
      variant="form"
      visible={visible}
    >
      {step === "form" ? (
        <>
          {!online ? (
            <StatusBanner
              description="Your case is kept on this phone. Send it when you’re back online."
              kind="offline"
              title="You’re offline"
            />
          ) : null}
          <FormField
            error={validating ? errors.category : undefined}
            label="What is it about?"
          >
            <View className="flex-row flex-wrap gap-[8px]">
              {(
                Object.entries(supportCategories) as [
                  MobileSupportCategory,
                  { label: string; icon: string },
                ][]
              ).map(([value, entry]) => {
                const selected = category === value
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    className={cn(
                      "min-h-[40px] flex-row items-center gap-[8px] rounded-full border pr-[14px] pl-[12px]",
                      selected
                        ? "border-primary bg-accent"
                        : "border-border bg-card"
                    )}
                    hitSlop={3}
                    key={value}
                    onPress={() => change({ ...form, category: value })}
                  >
                    <Icon
                      className={cn(
                        "size-[17px]",
                        selected ? "text-primary" : "text-muted-foreground"
                      )}
                      name={entry.icon}
                    />
                    <Text
                      className={cn(
                        "text-[14px]",
                        selected ? "text-accent-foreground" : "text-foreground"
                      )}
                      variant="label"
                    >
                      {entry.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </FormField>
          <FormField
            error={validating ? errors.subject : undefined}
            label="Subject"
            trailingLabel={`${subject.length} / 120`}
          >
            <Input
              maxLength={120}
              onChangeText={(next) => change({ ...form, subject: next })}
              placeholder="For example, wrong receipt amount"
              value={subject}
            />
          </FormField>
          <FormField
            error={validating ? errors.description : undefined}
            helper="Include dates and references so we can help faster."
            label="Description"
            trailingLabel={`${description.length} / 2000`}
          >
            <View
              className={cn(
                "rounded-[14px] border bg-card",
                validating && errors.description
                  ? "border-destructive"
                  : "border-border"
              )}
            >
              <Textarea
                accessibilityLabel="Description"
                maxLength={2000}
                numberOfLines={5}
                onChangeText={(next) => change({ ...form, description: next })}
                placeholder="What happened, when, and any reference numbers"
                style={{
                  color: colors.foreground,
                  fontSize: 16,
                  lineHeight: 22,
                  minHeight: 136,
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                }}
                value={description}
              />
            </View>
          </FormField>
          <ListCard>
            <View className="flex-row items-center gap-[12px] px-[14px] py-[14px]">
              <View className="min-w-0 flex-1 gap-[4px]">
                <Text variant="section">Request a money-impact review</Text>
                <Text className="text-muted-foreground" variant="small">
                  Use this if a balance, receipt or repayment looks wrong.
                  Support records it. Balances change only through a separate
                  finance approval.
                </Text>
              </View>
              <Switch
                accessibilityLabel="Request a money-impact review"
                onValueChange={(next) =>
                  change({ ...form, moneyImpactRequested: next })
                }
                trackColor={{
                  false: colors.surfaceRaised,
                  true: colors.primary,
                }}
                value={moneyImpactRequested}
              />
            </View>
          </ListCard>
        </>
      ) : step === "review" ? (
        <>
          <ListCard inset={false}>
            <ReviewRow
              compact
              label="Category"
              value={category ? supportCategories[category].label : ""}
            />
            <ReviewRow compact label="Subject" value={subject.trim()} />
            <ReviewRow compact label="Description" value={description.trim()} />
            <ReviewRow
              compact
              label="Money-impact review"
              value={moneyImpactRequested ? "Requested" : "Not requested"}
            />
          </ListCard>
          <Text className="text-muted-foreground" variant="small">
            {cooperative} replies in this case. You’ll get a notification.
          </Text>
        </>
      ) : step === "submitting" ? (
        <View className="min-h-[280px]">
          <SubmittingState title="Sending your case" />
        </View>
      ) : (
        <ResultScreen
          align="top"
          compact
          description={
            step === "success"
              ? `${cooperative} will reply in this case. You’ll get a notification when they do.`
              : online
                ? "Your case is kept, so you can try again."
                : "You’re offline. Your case is kept on this phone."
          }
          title={step === "success" ? "Case sent" : "Case not sent"}
          tone={step === "success" ? "success" : "error"}
        />
      )}
    </AppSheet>
  )
}
