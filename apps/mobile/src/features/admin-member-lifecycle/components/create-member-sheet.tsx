import { AppSheet } from "@/components/app/app-sheet"
import { DevQuickFill } from "@/components/app/dev-quick-fill"
import {
  ResultScreen,
  ReviewRow,
  ReviewSummary,
} from "@/components/app/result-screen"
import { Button } from "@/components/ui/button"
import { DateField } from "@/components/ui/date-field"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { TintedAvatar } from "@/components/ui/list-card"
import { MoneyField } from "@/components/ui/money-field"
import { PhoneField } from "@/components/ui/phone-field"
import { SelectField } from "@/components/ui/select-field"
import { StatusBanner } from "@/components/ui/status-banner"
import { StatusPill } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import {
  mobileDevQuickFill,
  mobileDevQuickFillMemberNumber,
} from "@/dev/mobile-dev-quick-fill"
import { mobileDevQuickFillIdentity } from "@/dev/mobile-dev-quick-fill-identity"
import { useMobileFormDraft } from "@/hooks/use-mobile-form-draft"
import { formatDateOnly, isValidDateOnly, todayDateOnly } from "@/lib/date-only"
import { formatMoney } from "@/lib/money"
import {
  isCompleteNigerianPhone,
  normalizeNigerianPhone,
  toNigerianE164,
} from "@/lib/phone-number"
import { useEffect, useRef, useState } from "react"
import { BackHandler, Keyboard, View } from "react-native"
import { createAdminMemberProfile } from "../api/admin-member-lifecycle-api"
import type {
  MobileAdminMemberCreateInput,
  MobileAdminMemberRow,
} from "../model/admin-member-lifecycle-types"
import {
  memberMeta,
  memberPill,
  memberTypes,
} from "../model/member-directory-presentation"

type Draft = {
  fullName: string
  memberNumber: string
  memberType: MobileAdminMemberCreateInput["memberType"] | null
  joinedAt: string
  monthlyCommitment: string
  phoneNumber: string
  email: string
}

function emptyDraft(): Draft {
  return {
    fullName: "",
    memberNumber: "",
    memberType: null,
    joinedAt: todayDateOnly(),
    monthlyCommitment: "",
    phoneNumber: "",
    email: "",
  }
}

function validate(draft: Draft) {
  const errors: Partial<Record<keyof Draft, string>> = {}
  if (draft.fullName.trim().length < 2)
    errors.fullName = "Enter the member’s full name."
  if (!draft.memberNumber.trim()) errors.memberNumber = "Enter a member number."
  if (!draft.memberType) errors.memberType = "Choose a member type."
  if (!isValidDateOnly(draft.joinedAt) || draft.joinedAt > todayDateOnly())
    errors.joinedAt = "Pick the date they joined, up to today."
  if (draft.monthlyCommitment && !(Number(draft.monthlyCommitment) > 0)) {
    errors.monthlyCommitment = "Enter an amount above zero, or leave it blank."
  }
  if (draft.phoneNumber && !isCompleteNigerianPhone(draft.phoneNumber)) {
    errors.phoneNumber = "Enter a valid 10-digit Nigerian mobile number."
  }
  if (
    draft.email.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())
  ) {
    errors.email = "Enter a valid email, or leave it blank."
  }
  return errors
}

export function CreateMemberSheet({
  blocked,
  currencyCode,
  onClose,
  onCreated,
  onDismissed,
  onOpenMember,
  visible,
  workspaceName,
}: {
  blocked: boolean
  currencyCode: string
  onClose: () => void
  onCreated: (member: MobileAdminMemberRow) => void
  onDismissed: () => void
  onOpenMember: (memberId: string) => void
  visible: boolean
  workspaceName: string
}) {
  const [draft, setDraft] = useState(emptyDraft)
  const [step, setStep] = useState<"form" | "review" | "success" | "error">(
    "form"
  )
  const [showErrors, setShowErrors] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [created, setCreated] = useState<MobileAdminMemberRow | null>(null)
  const submittingRef = useRef(false)
  const clearDraft = useMobileFormDraft({
    key: "admin.member-lifecycle.forms",
    onHydrate: (saved) =>
      setDraft({
        fullName: saved.fullName,
        memberNumber: saved.memberNumber,
        memberType: saved.memberType,
        joinedAt: saved.joinedAt,
        monthlyCommitment: saved.monthlyCommitment,
        phoneNumber: normalizeNigerianPhone(saved.phoneNumber),
        email: saved.email,
      }),
    value: draft,
  })
  const errors = showErrors ? validate(draft) : {}
  const errorCount = Object.keys(errors).length
  const blank = emptyDraft()
  const dirty = Object.keys(blank).some((key) => {
    const field = key as keyof Draft
    return draft[field] !== blank[field]
  })
  const outcome = step === "success" || step === "error"
  const form = step === "form"
  const title = form ? "New member" : "Review member"
  const phone = draft.phoneNumber ? toNigerianE164(draft.phoneNumber) : null
  const duplicateNumber =
    /member number.*(?:already|exists|used)|(?:already|duplicate).*member number/i.test(
      submitError
    )

  useEffect(() => {
    if (!visible || !outcome) return
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!submittingRef.current) onClose()
      return true
    })
    return () => listener.remove()
  }, [onClose, outcome, visible])

  function update<K extends keyof Draft>(field: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  function reset() {
    setStep("form")
    setShowErrors(false)
    setSubmitError("")
    setDraft(emptyDraft())
    setCreated(null)
  }

  function close() {
    if (!submittingRef.current) onClose()
  }

  function review() {
    setShowErrors(true)
    if (blocked || Object.keys(validate(draft)).length) return
    Keyboard.dismiss()
    setStep("review")
  }

  async function submit() {
    if (submittingRef.current || blocked || !draft.memberType) return
    submittingRef.current = true
    setSubmitting(true)
    try {
      const member = await createAdminMemberProfile({
        fullName: draft.fullName.trim(),
        memberNumber: draft.memberNumber.trim(),
        memberType: draft.memberType,
        joinedAt: `${draft.joinedAt}T00:00:00.000Z`,
        monthlyCommitment: draft.monthlyCommitment
          ? Number(draft.monthlyCommitment)
          : undefined,
        email: draft.email.trim() || undefined,
        phoneNumber: phone ?? undefined,
      })
      setCreated(member)
      setDraft(emptyDraft())
      void clearDraft().catch(() => undefined)
      setStep("success")
      onCreated(member)
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Try adding the member again."
      )
      setStep("error")
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <AppSheet
      dirty={dirty && !outcome}
      headerTrailing={
        <Text className="text-muted-foreground" variant="caption">
          {form ? "1 of 2" : "2 of 2"}
        </Text>
      }
      isSubmitting={submitting}
      onBack={step === "review" ? () => setStep("form") : undefined}
      onClose={onClose}
      onDismissed={() => {
        if (created) reset()
        else if (step === "error") setStep("form")
        onDismissed()
      }}
      overlayActive={outcome}
      title={title}
      variant="form"
      visible={visible}
      footer={
        <View className="flex-row gap-[10px]">
          {form ? (
            <DevQuickFill
              label="Quick fill member"
              placement="footer"
              portal={false}
              onPress={() => {
                const person = mobileDevQuickFillIdentity()
                setDraft({
                  fullName: person.fullName,
                  memberNumber: mobileDevQuickFillMemberNumber(),
                  memberType: "individual",
                  joinedAt: mobileDevQuickFill.adminMember.joinedAt,
                  monthlyCommitment:
                    mobileDevQuickFill.adminMember.monthlyCommitment,
                  phoneNumber: normalizeNigerianPhone(person.phoneNumber),
                  email: person.email,
                })
              }}
            />
          ) : null}
          <Button
            className="flex-1"
            disabled={blocked}
            loading={submitting}
            onPress={form ? review : submit}
          >
            <Text>
              {form ? "Review" : submitting ? "Adding member…" : "Add member"}
            </Text>
          </Button>
        </View>
      }
      overlay={
        outcome ? (
          <View className="absolute inset-0 z-20">
            {created ? (
              <ResultScreen
                align="top"
                description={`${created.fullName} (${created.memberNumber}) is now in the ${workspaceName} register.`}
                badges={
                  <>
                    <StatusPill {...memberPill(created.status)} />
                    <StatusPill {...memberPill(created.kycStatus, true)} />
                  </>
                }
                dismissIcon="X"
                onDone={close}
                primary={{
                  label: "Open member",
                  onPress: () => onOpenMember(created.id),
                }}
                secondary={{
                  label: "Add another",
                  onPress: reset,
                  variant: "secondary",
                }}
                title="Member added"
                tone="success"
              />
            ) : (
              <ResultScreen
                align="top"
                description={submitError}
                primary={
                  duplicateNumber
                    ? {
                        label: "Change member number",
                        onPress: () => setStep("form"),
                      }
                    : {
                        label: "Try again",
                        loading: submitting,
                        onPress: submit,
                      }
                }
                secondary={{
                  label: "Close",
                  onPress: close,
                  variant: "secondary",
                }}
                title="Member not added"
                tone="error"
              />
            )}
          </View>
        ) : undefined
      }
    >
      {blocked ? (
        <StatusBanner
          kind="offline"
          title="Refresh before adding a member"
          description="Reconnect and refresh the directory to continue."
        />
      ) : null}
      {form ? (
        <View className="gap-[14px]">
          {errorCount ? (
            <StatusBanner
              kind="error"
              title={`${errorCount} ${errorCount === 1 ? "field needs" : "fields need"} attention`}
              description="Fix the highlighted fields to continue."
            />
          ) : null}
          <FormField
            error={errors.fullName}
            helper="As it appears on their ID"
            label="Full name"
          >
            <Input
              maxLength={160}
              onChangeText={(value) => update("fullName", value)}
              placeholder="e.g. Aisha Bello"
              value={draft.fullName}
            />
          </FormField>
          <FormField
            error={errors.memberNumber}
            helper="Must be unique in your cooperative"
            label="Member number"
          >
            <Input
              autoCapitalize="characters"
              maxLength={80}
              onChangeText={(value) => update("memberNumber", value)}
              placeholder="e.g. QHC-0052"
              value={draft.memberNumber}
            />
          </FormField>
          <FormField error={errors.memberType} label="Member type">
            <SelectField
              onChange={(value) => update("memberType", value)}
              options={memberTypes}
              outlined
              placeholder="Choose type"
              testID="admin-member-type"
              value={draft.memberType}
            />
          </FormField>
          <FormField error={errors.joinedAt} label="Joined date">
            <DateField
              maximumDate={todayDateOnly()}
              onChange={(value) => update("joinedAt", value)}
              testID="admin-member-joined-date"
              value={draft.joinedAt}
            />
          </FormField>
          <FormField
            error={errors.monthlyCommitment}
            helper="Starts their savings plan"
            label="Monthly commitment"
            optional
          >
            <MoneyField
              allowDecimals
              currencyCode={currencyCode}
              onChangeValue={(value) => update("monthlyCommitment", value)}
              value={draft.monthlyCommitment}
            />
          </FormField>
          <FormField error={errors.phoneNumber} label="Phone" optional>
            <PhoneField
              onChangeValue={(value) => update("phoneNumber", value)}
              value={draft.phoneNumber}
            />
          </FormField>
          <FormField
            error={errors.email}
            helper="Statements and receipts go here"
            label="Email"
            optional
          >
            <Input
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              onChangeText={(value) => update("email", value)}
              placeholder="name@example.com"
              value={draft.email}
            />
          </FormField>
        </View>
      ) : step === "review" ? (
        <View className="gap-[12px]">
          <View className="flex-row items-center gap-[14px]">
            <TintedAvatar name={draft.fullName} size={56} />
            <View className="flex-1">
              <Text variant="title">{draft.fullName.trim()}</Text>
              <Text className="text-muted-foreground" variant="small">
                {memberMeta({
                  memberNumber: draft.memberNumber.trim(),
                  memberType: draft.memberType ?? "",
                })}
              </Text>
            </View>
          </View>
          <ReviewSummary title="Membership">
            <ReviewRow label="Joined" value={formatDateOnly(draft.joinedAt)} />
            <ReviewRow
              label="Monthly commitment"
              value={
                draft.monthlyCommitment
                  ? formatMoney(Number(draft.monthlyCommitment), {
                      currencyCode,
                      fractionDigits:
                        Number(draft.monthlyCommitment) % 1 ? 2 : 0,
                    })
                  : "Not set"
              }
            />
          </ReviewSummary>
          <ReviewSummary title="Contact">
            <ReviewRow label="Phone" value={phone ?? "Not added"} />
            <ReviewRow
              label="Email"
              value={draft.email.trim() || "Not added"}
            />
          </ReviewSummary>
          <StatusBanner
            kind="info"
            title="KYC not started"
            description="You can review their documents from their profile."
          />
        </View>
      ) : null}
    </AppSheet>
  )
}
