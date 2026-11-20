import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { AppSheet } from "@/components/app/app-sheet"
import {
  ResultScreen,
  ReviewRow,
  SubmittingState,
} from "@/components/app/result-screen"
import { Button } from "@/components/ui/button"
import { DateField } from "@/components/ui/date-field"
import { FormField } from "@/components/ui/form-field"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { MoneyField } from "@/components/ui/money-field"
import { Pressable } from "@/components/ui/pressable"
import { SelectField } from "@/components/ui/select-field"
import { StatusBanner } from "@/components/ui/status-banner"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import {
  mobileDevQuickFill,
  mobileDevQuickFillDate,
  mobileDevQuickFillReference,
} from "@/dev/mobile-dev-quick-fill"
import { appQueryKey, useAppQuery } from "@/hooks/use-app-query"
import { isValidDateOnly, todayDateOnly } from "@/lib/date-only"
import { cn } from "@/lib/utils"
import { isSafeSupportAttachmentUrl } from "@halaalvest/utils"
import { useRef, useState, type Dispatch, type SetStateAction } from "react"
import { Keyboard, View } from "react-native"
import {
  createMemberReceipt,
  getReceiptFormOptions,
} from "../api/member-receipts-api"
import {
  chooseReceiptProof,
  uploadReceiptProof,
  type ReceiptProofFile,
  type ReceiptProofSource,
} from "../api/receipt-proof-api"
import type {
  MobilePaymentReceipt,
  MobileReceiptCategoryOption,
} from "../model/member-receipt-types"
import {
  hasReceiptDraft,
  newReceiptSplit,
  periodMonth,
  periods,
  receiptCategories,
  receiptDate,
  receiptMoney,
  type ReceiptDraft,
  type ReceiptSplit,
} from "../model/receipt-presentation"

const proofSources = [
  {
    value: "camera",
    icon: "Camera",
    label: "Take a photo",
    helper: "Snap the transfer slip or teller receipt",
  },
  {
    value: "photos",
    icon: "Image",
    label: "Choose from Photos",
    helper: "A screenshot from your bank app",
  },
  {
    value: "pdf",
    icon: "FileText",
    label: "Choose a PDF",
    helper: "From Files or your bank’s email",
  },
  {
    value: "link",
    icon: "Link",
    label: "Paste a link instead",
    helper: "A shared link to the proof",
  },
] as const

const stepCopy = [
  {
    label: "How much did you pay?",
    helper: "Use the amount on your transfer slip.",
  },
  { label: "What does it pay for?", helper: "" },
  { label: "Add proof", helper: "Finance checks the proof before posting." },
]

function cents(input: string) {
  const amount = Number(input.replace(/,/g, ""))
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0
}

const splitHasPeriod = (split: ReceiptSplit) =>
  split.category !== "shares" && split.category !== "other"

export function ReceiptSubmitFlow({
  canCreate,
  currency,
  draft,
  offline,
  onClose,
  onDiscard,
  onSent,
  onViewReceipt,
  proofRequired = false,
  scope,
  setDraft,
  stale,
  visible,
}: {
  canCreate: boolean
  currency: string
  draft: ReceiptDraft
  offline: boolean
  onClose: () => void
  onDiscard: () => void
  onSent: (receipt: MobilePaymentReceipt) => void
  onViewReceipt: (receipt: MobilePaymentReceipt) => void
  /** The cooperative requires an upload or link before sending. */
  proofRequired?: boolean
  scope: string | undefined
  setDraft: Dispatch<SetStateAction<ReceiptDraft>>
  stale: boolean
  visible: boolean
}) {
  const [step, setStep] = useState(0)
  const [phase, setPhase] = useState<
    "edit" | "review" | "sending" | "success" | "error"
  >("edit")
  const [created, setCreated] = useState<MobilePaymentReceipt | null>(null)
  const [proofPicker, setProofPicker] = useState(false)
  const pendingSource = useRef<ReceiptProofSource | null>(null)
  const [confirmClose, setConfirmClose] = useState(false)
  const [linkMode, setLinkMode] = useState(() =>
    Boolean(draft.proofDocumentUrl && !draft.proofDocumentName)
  )
  const [proofFile, setProofFile] = useState<ReceiptProofFile | null>(null)
  const [proofError, setProofError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const submitting = useRef(false)
  const optionsQuery = useAppQuery({
    enabled: visible && canCreate && !offline,
    queryKey: appQueryKey("member-receipts", scope, "form-options"),
    queryFn: getReceiptFormOptions,
  })
  const options = optionsQuery.data?.categories ?? []
  const optionFor = (split: ReceiptSplit) =>
    options.find((option) => option.value === split.category)
  const paid = cents(draft.totalAmount)
  const allocated = draft.allocations.reduce(
    (sum, split) => sum + cents(split.amount),
    0
  )
  const remaining = paid - allocated
  const money = (amount: number) => receiptMoney(amount / 100, currency)
  const today = todayDateOnly()
  const paymentError =
    paid <= 0
      ? "Enter the amount you paid."
      : !isValidDateOnly(draft.paidAt) || draft.paidAt > today
        ? "Choose a paid date up through today."
        : null
  let splitError: string | null = null
  if (optionsQuery.isPending)
    splitError = offline
      ? "Connect to load payment categories."
      : "Loading payment categories…"
  else if (optionsQuery.isError)
    splitError = "Payment categories couldn’t load."
  else if (!optionsQuery.data?.canCreateReceipt)
    splitError = "New receipts are off for this cooperative."
  else if (draft.allocations.some((split) => cents(split.amount) <= 0))
    splitError = "Give every split an amount."
  else if (remaining > 0)
    splitError = `Split the remaining ${money(remaining)}.`
  else if (remaining < 0)
    splitError = `The splits are ${money(-remaining)} more than the amount paid.`
  else if (
    draft.allocations.some((split) => {
      const option = optionFor(split)
      return (
        !option ||
        (option.requiresTarget && !split.targetId) ||
        (Boolean(split.targetId) &&
          !option.targets.some((target) => target.id === split.targetId))
      )
    })
  )
    splitError = "Choose what each split pays for."
  const proofUrl = draft.proofDocumentUrl.trim()
  const linkError =
    (linkMode || !draft.proofDocumentName) &&
    Boolean(proofUrl) &&
    (!/^https:\/\//i.test(proofUrl) || !isSafeSupportAttachmentUrl(proofUrl))
      ? "Enter a valid HTTPS link."
      : null
  const proofBlock = uploading
    ? "Wait for the proof to finish uploading."
    : proofFile && proofError
      ? "Retry or remove the proof."
      : (linkError ??
        (proofRequired && !proofUrl
          ? "Your cooperative needs proof. Add a photo, PDF or link."
          : null))
  const why =
    step === 0
      ? paymentError
      : step === 1
        ? splitError
        : offline
          ? "Connect to review and send your receipt."
          : stale
            ? "Refresh receipts before sending payment proof."
            : (paymentError ?? splitError ?? proofBlock)

  function patch(update: Partial<ReceiptDraft>) {
    setDraft((value) => ({ ...value, ...update }))
  }

  function updateSplit(id: string, update: Partial<ReceiptSplit>) {
    setDraft((value) => ({
      ...value,
      allocations: value.allocations.map((split) =>
        split.id === id ? { ...split, ...update } : split
      ),
    }))
  }

  function changeAmount(raw: string) {
    setDraft((value) => ({
      ...value,
      totalAmount: raw,
      allocations:
        value.allocations.length === 1 &&
        (!value.allocations[0]?.amount ||
          cents(value.allocations[0].amount) === cents(value.totalAmount))
          ? value.allocations.map((split) => ({ ...split, amount: raw }))
          : value.allocations,
    }))
  }

  function removeProof() {
    setProofFile(null)
    setProofError(null)
    setLinkMode(false)
    patch({ proofDocumentName: "", proofDocumentUrl: "" })
  }

  async function upload(file: ReceiptProofFile) {
    setProofError(null)
    setUploading(true)
    try {
      const proof = await uploadReceiptProof(file)
      patch({ proofDocumentName: proof.fileName, proofDocumentUrl: proof.url })
      setProofFile(null)
    } catch {
      setProofError("Upload failed. Try again or remove this file.")
    } finally {
      setUploading(false)
    }
  }

  async function pickAfterDismiss() {
    const source = pendingSource.current
    pendingSource.current = null
    if (!source) return
    try {
      const file = await chooseReceiptProof(source)
      if (!file) return
      removeProof()
      setProofFile(file)
      await upload(file)
    } catch (error) {
      setProofError(
        error instanceof Error
          ? error.message
          : "This file couldn’t be selected."
      )
    }
  }

  async function submit() {
    if (
      !canCreate ||
      offline ||
      stale ||
      paymentError ||
      splitError ||
      proofBlock ||
      submitting.current
    )
      return
    submitting.current = true
    setPhase("sending")
    try {
      const receipt = await createMemberReceipt({
        allocations: draft.allocations.map((split) => {
          const kind = optionFor(split)?.targetKind
          const periodIntent = splitHasPeriod(split)
            ? split.periodIntent
            : "unspecified"
          return {
            amount: cents(split.amount) / 100,
            category: split.category,
            ...(kind && split.targetId ? { [kind]: split.targetId } : {}),
            notes: split.notes.trim() || undefined,
            periodIntent,
            targetPeriodStart:
              periodIntent !== "unspecified" &&
              /^\d{4}-\d{2}$/.test(split.targetMonth)
                ? `${split.targetMonth}-01T00:00:00.000Z`
                : undefined,
          }
        }),
        memberNotes: draft.memberNotes.trim() || undefined,
        paidAt: `${draft.paidAt}T00:00:00.000Z`,
        paymentReference: draft.paymentReference.trim() || undefined,
        proofDocumentName: draft.proofDocumentName || undefined,
        proofDocumentUrl: proofUrl || undefined,
        totalAmount: paid / 100,
      })
      setCreated(receipt)
      setPhase("success")
      onSent(receipt)
    } catch {
      setPhase("error")
    } finally {
      submitting.current = false
    }
  }

  const showingResult =
    phase === "sending" || phase === "success" || phase === "error"
  function back() {
    Keyboard.dismiss()
    if (phase === "review") setPhase("edit")
    else if (step > 0) setStep(step - 1)
    else if (hasReceiptDraft(draft)) setConfirmClose(true)
    else onClose()
  }

  return (
    <AppSheet
      footer={
        !showingResult ? (
          <View className="gap-[6px]">
            {phase === "edit" && why ? (
              <Text
                className="text-center text-muted-foreground"
                variant="small"
              >
                {why}
              </Text>
            ) : null}
            <View className="flex-row items-center gap-[8px]">
              {phase === "edit" && step === 0 && !hasReceiptDraft(draft) ? (
                <DevQuickFill
                  label="Quick fill receipt"
                  onPress={() => {
                    const preset = mobileDevQuickFill.receipt
                    const paidAt = mobileDevQuickFillDate(0)
                    setLinkMode(true)
                    patch({
                      allocations: [
                        {
                          ...newReceiptSplit(),
                          amount: preset.allocationAmount,
                          targetMonth: paidAt.slice(0, 7),
                        },
                      ],
                      memberNotes: preset.memberNotes,
                      paidAt,
                      paymentReference: mobileDevQuickFillReference("HVC"),
                      proofDocumentUrl: preset.proofDocumentUrl,
                      totalAmount: preset.totalAmount,
                    })
                  }}
                  placement="footer"
                  portal={false}
                />
              ) : null}
              <Button
                className="flex-1"
                disabled={
                  phase === "review"
                    ? offline || stale || !canCreate
                    : Boolean(why)
                }
                onPress={() => {
                  Keyboard.dismiss()
                  if (phase === "review") void submit()
                  else if (step < 2) setStep(step + 1)
                  else setPhase("review")
                }}
              >
                {phase === "review" ? (
                  <Icon
                    className="size-[18px] text-primary-foreground"
                    name="Send"
                  />
                ) : null}
                <Text>
                  {phase === "review"
                    ? "Submit receipt"
                    : step === 2
                      ? "Review receipt"
                      : "Continue"}
                </Text>
              </Button>
            </View>
          </View>
        ) : null
      }
      headerTrailing={phase === "edit" ? `${step + 1} of 3` : undefined}
      isSubmitting={uploading || phase === "sending"}
      onBack={phase === "review" || step > 0 ? back : undefined}
      onClose={back}
      overlayActive={showingResult}
      overlay={
        showingResult ? (
          <View
            accessibilityViewIsModal
            className="absolute inset-0 bg-background"
          >
            {phase === "success" && created ? (
              <ResultScreen
                compact
                description={`Finance will review ${receiptMoney(created.totalAmount, currency)} before posting it. We’ll notify you when it’s approved.`}
                primary={{
                  label: "View receipt",
                  onPress: () => onViewReceipt(created),
                }}
                secondary={{
                  label: "Done",
                  onPress: onClose,
                  variant: "ghost",
                }}
                title="Receipt sent"
                tone="success"
              />
            ) : phase === "error" ? (
              <ResultScreen
                compact
                description="Your draft is saved on this phone. Check your connection and try again."
                primary={
                  !offline && !stale && canCreate
                    ? { label: "Try again", onPress: submit }
                    : undefined
                }
                secondary={{
                  label: "Back to edit",
                  onPress: () => setPhase("edit"),
                  variant: "ghost",
                }}
                title="Couldn’t send receipt"
                tone="error"
              />
            ) : (
              <SubmittingState
                title="Sending your receipt"
                description={`${money(paid)} to finance`}
              />
            )}
          </View>
        ) : null
      }
      title={
        phase === "review" || phase === "sending"
          ? "Review receipt"
          : "Submit receipt"
      }
      variant="form"
      visible={visible}
    >
      {offline ? (
        <StatusBanner
          kind="offline"
          title="You’re offline"
          description="Your draft is saved on this phone."
        />
      ) : null}
      {phase === "review" ? (
        <>
          <View className="items-center gap-[2px] rounded-[18px] border border-border bg-card p-[16px]">
            <Text className="text-muted-foreground" variant="label">
              You’re sending
            </Text>
            <Text tabular variant="hero">
              {money(paid)}
            </Text>
          </View>
          <View className="overflow-hidden rounded-[18px] border border-border bg-card">
            <ReviewRow compact label="Paid" value={receiptDate(draft.paidAt)} />
            <View className="border-t border-border">
              <ReviewRow
                compact
                label="Reference"
                value={draft.paymentReference || "None"}
              />
            </View>
            <View className="flex-row gap-[12px] border-t border-border px-[16px] py-[13px]">
              <Text className="text-muted-foreground" variant="small">
                Split
              </Text>
              <View className="flex-1 items-end gap-[8px]">
                {draft.allocations.map((split) => {
                  const target = optionFor(split)?.targets.find(
                    (target) => target.id === split.targetId
                  )
                  return (
                    <View
                      className="flex-row flex-wrap items-start justify-end gap-x-[8px]"
                      key={split.id}
                    >
                      <View className="shrink items-end">
                        <Text className="text-right" variant="small">
                          {receiptCategories[split.category]}
                        </Text>
                        {target ? (
                          <Text
                            className="text-right text-muted-foreground"
                            variant="caption"
                          >
                            {target.label}
                          </Text>
                        ) : null}
                      </View>
                      <Text className="font-bold" tabular variant="small">
                        {money(cents(split.amount))}
                      </Text>
                    </View>
                  )
                })}
              </View>
            </View>
            <View className="border-t border-border">
              <ReviewRow
                compact
                label="Proof"
                value={
                  draft.proofDocumentName ||
                  (proofUrl ? "Link" : "No proof attached")
                }
              />
            </View>
            {draft.memberNotes ? (
              <View className="border-t border-border">
                <ReviewRow compact label="Note" value={draft.memberNotes} />
              </View>
            ) : null}
          </View>
          <Text className="text-center text-muted-foreground" variant="small">
            Finance reviews receipts before posting them to your account.
          </Text>
        </>
      ) : phase === "edit" ? (
        <View className="gap-[16px]">
          <View
            accessibilityLabel={`Step ${step + 1} of 3`}
            className="flex-row gap-[6px]"
          >
            {stepCopy.map((item, index) => (
              <View
                className={cn(
                  "h-[4px] flex-1 rounded-full",
                  index <= step ? "bg-primary" : "bg-border"
                )}
                key={item.label}
              />
            ))}
          </View>
          <View className="gap-[4px]">
            <Text accessibilityRole="header" variant="title">
              {stepCopy[step]?.label}
            </Text>
            <Text className="text-muted-foreground" variant="small">
              {step === 1
                ? `Split ${money(paid)} across your plans, loans and shares.`
                : stepCopy[step]?.helper}
            </Text>
          </View>
          {step === 0 ? (
            <>
              <FormField label="Amount paid">
                <MoneyField
                  allowDecimals
                  currencyCode={currency}
                  maxLength={16}
                  style={{ fontSize: 18, fontWeight: "800" }}
                  onChangeValue={changeAmount}
                  value={draft.totalAmount}
                />
              </FormField>
              <FormField label="Paid date">
                <DateField
                  maximumDate={today}
                  testID="receipt-paid-date"
                  onChange={(paidAt) => patch({ paidAt })}
                  today={today}
                  value={draft.paidAt}
                />
              </FormField>
              <FormField
                helper="From your bank app or teller slip"
                label="Reference"
                trailingLabel="Optional"
              >
                <Input
                  autoCapitalize="characters"
                  maxLength={120}
                  onChangeText={(paymentReference) =>
                    patch({ paymentReference })
                  }
                  placeholder="e.g. TRF-77120934"
                  value={draft.paymentReference}
                />
              </FormField>
            </>
          ) : step === 1 ? (
            <>
              {optionsQuery.isError ? (
                <StatusBanner
                  kind="error"
                  onRetry={() => void optionsQuery.refetch()}
                  title="Couldn’t load payment categories"
                />
              ) : null}
              {draft.allocations.map((split, index) => (
                <SplitFields
                  currency={currency}
                  index={index}
                  key={split.id}
                  onChange={(update) => updateSplit(split.id, update)}
                  onRemove={
                    draft.allocations.length > 1
                      ? () =>
                          setDraft((value) => ({
                            ...value,
                            allocations: value.allocations.filter(
                              (item) => item.id !== split.id
                            ),
                          }))
                      : undefined
                  }
                  options={options}
                  split={split}
                />
              ))}
              <Button
                className="border-dashed"
                disabled={draft.allocations.length >= 8 || !options.length}
                onPress={() =>
                  setDraft((value) => ({
                    ...value,
                    allocations: [
                      ...value.allocations,
                      {
                        ...newReceiptSplit(),
                        amount: remaining > 0 ? String(remaining / 100) : "",
                      },
                    ],
                  }))
                }
                variant="outline"
              >
                <Icon className="size-[18px] text-primary" name="Plus" />
                <Text className="text-primary">Add split</Text>
              </Button>
              <View
                className={cn(
                  "min-h-[46px] flex-row items-center gap-[8px] rounded-[14px] px-[12px]",
                  remaining === 0 &&
                    !draft.allocations.some((split) => cents(split.amount) <= 0)
                    ? "bg-tint-success"
                    : remaining < 0
                      ? "bg-tint-danger"
                      : "bg-tint-warm"
                )}
              >
                <Icon
                  className="text-foreground-soft size-[16px]"
                  name={
                    remaining === 0 &&
                    draft.allocations.every((split) => cents(split.amount) > 0)
                      ? "Check"
                      : "CircleAlert"
                  }
                />
                <Text className="flex-1" variant="label">
                  {remaining === 0
                    ? draft.allocations.some(
                        (split) => cents(split.amount) <= 0
                      )
                      ? "Give each split an amount"
                      : "Fully split"
                    : remaining < 0
                      ? `${money(-remaining)} over`
                      : `${money(remaining)} left to split`}
                </Text>
                <Text tabular variant="label">
                  {money(allocated)} / {money(paid)}
                </Text>
              </View>
            </>
          ) : (
            <>
              <FormField
                label="Proof"
                trailingLabel={proofRequired ? "Required" : "Recommended"}
                error={linkError}
              >
                {linkMode ? (
                  <>
                    <Input
                      autoCapitalize="none"
                      inputMode="url"
                      maxLength={1000}
                      onChangeText={(proofDocumentUrl) =>
                        patch({ proofDocumentUrl })
                      }
                      placeholder="https://"
                      value={draft.proofDocumentUrl}
                    />
                    <Button
                      className="self-start"
                      onPress={() => setProofPicker(true)}
                      size="sm"
                      variant="ghost"
                    >
                      <Icon
                        className="size-[17px] text-primary"
                        name="Upload"
                      />
                      <Text className="text-primary">
                        Attach a file instead
                      </Text>
                    </Button>
                  </>
                ) : proofFile || draft.proofDocumentName ? (
                  <View className="min-h-[62px] flex-row items-center gap-[8px] rounded-[14px] border border-border bg-card px-[12px]">
                    <Icon
                      className="size-[20px] text-primary"
                      name="FileText"
                    />
                    <View className="min-w-0 flex-1">
                      <Text
                        className="font-bold"
                        numberOfLines={1}
                        variant="small"
                      >
                        {proofFile?.fileName || draft.proofDocumentName}
                      </Text>
                      <Text className="text-muted-foreground" variant="caption">
                        {uploading
                          ? "Uploading…"
                          : proofError
                            ? "Upload failed"
                            : "Attached"}
                      </Text>
                    </View>
                    {proofError && proofFile ? (
                      <Button
                        disabled={offline}
                        onPress={() => void upload(proofFile)}
                        size="sm"
                        variant="ghost"
                      >
                        <Text>Retry</Text>
                      </Button>
                    ) : null}
                    <Button
                      accessibilityLabel="Remove proof"
                      disabled={uploading}
                      onPress={removeProof}
                      size="icon"
                      variant="ghost"
                    >
                      <Icon
                        className="size-[18px] text-muted-foreground"
                        name="X"
                      />
                    </Button>
                  </View>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    className="min-h-[82px] flex-row items-center gap-[12px] rounded-[16px] border border-dashed border-primary bg-accent px-[14px]"
                    disabled={offline}
                    onPress={() => {
                      Keyboard.dismiss()
                      setProofPicker(true)
                    }}
                  >
                    <View className="size-[44px] items-center justify-center rounded-[14px] bg-card">
                      <Icon
                        className="size-[22px] text-primary"
                        name="Upload"
                      />
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text
                        className="font-bold text-accent-foreground"
                        variant="body"
                      >
                        Add proof of payment
                      </Text>
                      <Text className="text-muted-foreground" variant="small">
                        Photo, screenshot or PDF of the transfer
                      </Text>
                    </View>
                  </Pressable>
                )}
                {proofError ? (
                  <Text className="text-destructive" variant="small">
                    {proofError}
                  </Text>
                ) : null}
              </FormField>
              <FormField label="Note to finance" optional>
                <Textarea
                  accessibilityLabel="Note to finance"
                  className="min-h-[96px] rounded-[14px] px-[14px] py-[12px]"
                  maxLength={1000}
                  numberOfLines={4}
                  onChangeText={(memberNotes) => patch({ memberNotes })}
                  placeholder="Anything finance should know"
                  value={draft.memberNotes}
                />
              </FormField>
            </>
          )}
        </View>
      ) : null}
      <AppSheet
        onClose={() => setProofPicker(false)}
        onDismissed={() => void pickAfterDismiss()}
        title="Add proof"
        variant="picker"
        visible={proofPicker}
      >
        {proofSources.map((source) => (
          <Pressable
            accessibilityRole="button"
            className="min-h-[54px] flex-row items-center gap-[12px]"
            key={source.value}
            onPress={() => {
              if (source.value === "link") {
                removeProof()
                setLinkMode(true)
              } else pendingSource.current = source.value
              setProofPicker(false)
            }}
          >
            <View className="size-[38px] items-center justify-center rounded-[12px] bg-accent">
              <Icon className="size-[18px] text-primary" name={source.icon} />
            </View>
            <View className="flex-1">
              <Text className="font-bold" variant="body">
                {source.label}
              </Text>
              <Text className="text-muted-foreground" variant="small">
                {source.helper}
              </Text>
            </View>
          </Pressable>
        ))}
        <Text className="text-center text-muted-foreground" variant="caption">
          JPG, PNG or PDF, up to 10 MB
        </Text>
      </AppSheet>
      <AppSheet
        onClose={() => setConfirmClose(false)}
        title="Keep this draft?"
        variant="confirm"
        visible={confirmClose}
      >
        <Text className="text-center text-muted-foreground" variant="small">
          Your receipt stays on this phone until you send it or discard it.
        </Text>
        <Button
          onPress={() => {
            setConfirmClose(false)
            onClose()
          }}
        >
          <Text>Keep draft</Text>
        </Button>
        <Button
          onPress={() => {
            setConfirmClose(false)
            onDiscard()
          }}
          variant="ghost"
        >
          <Text className="text-destructive">Discard draft</Text>
        </Button>
        <Button onPress={() => setConfirmClose(false)} variant="ghost">
          <Text>Keep editing</Text>
        </Button>
      </AppSheet>
    </AppSheet>
  )
}

function SplitFields({
  currency,
  index,
  onChange,
  onRemove,
  options,
  split,
}: {
  currency: string
  index: number
  onChange: (update: Partial<ReceiptSplit>) => void
  onRemove?: () => void
  options: MobileReceiptCategoryOption[]
  split: ReceiptSplit
}) {
  const option = options.find((item) => item.value === split.category)
  return (
    <View className="gap-[8px] rounded-[18px] border border-border bg-card p-[12px]">
      <View className="flex-row items-center justify-between">
        <Text className="text-muted-foreground" variant="label">
          {onRemove ? `Split ${index + 1}` : "Pays for"}
        </Text>
        {onRemove ? (
          <Button
            accessibilityLabel={`Remove split ${index + 1}`}
            onPress={onRemove}
            size="icon"
            variant="ghost"
          >
            <Icon className="size-[16px] text-muted-foreground" name="Trash2" />
          </Button>
        ) : null}
      </View>
      <View className="flex-row gap-[8px]">
        <View className="min-w-0 flex-[3]">
          <SelectField
            disabled={!options.length}
            onChange={(category) => {
              const next = options.find((item) => item.value === category)
              onChange({
                category,
                targetId: next?.targets.length === 1 ? next.targets[0]!.id : "",
              })
            }}
            options={options.map((item) => ({
              label: item.label,
              value: item.value,
              description: !item.postable
                ? "Finance can review it before a ledger is available."
                : item.requiresTarget && !item.targets.length
                  ? "No eligible payments"
                  : undefined,
              disabled: item.requiresTarget && !item.targets.length,
            }))}
            placeholder={receiptCategories[split.category]}
            sheetTitle="What is this payment for?"
            value={split.category}
          />
        </View>
        <View className="min-w-0 flex-[2]">
          <MoneyField
            accessibilityLabel={`Split ${index + 1} amount`}
            allowDecimals
            currencyCode={currency}
            maxLength={16}
            onChangeValue={(amount) => onChange({ amount })}
            value={split.amount}
          />
        </View>
      </View>
      {option && (option.requiresTarget || option.targets.length > 1) ? (
        <SelectField
          onChange={(targetId) => onChange({ targetId })}
          options={option.targets.map((target) => ({
            label: target.label,
            value: target.id,
            description:
              target.outstandingAmount == null
                ? undefined
                : `${receiptMoney(target.outstandingAmount, currency)} due`,
          }))}
          placeholder="Choose which one"
          sheetTitle={option.label}
          value={split.targetId}
        />
      ) : null}
      {option && !option.postable ? (
        <Text className="text-tint-warm-foreground" variant="caption">
          Finance can review this before a ledger is available.
        </Text>
      ) : null}
      {splitHasPeriod(split) ? (
        <SelectField
          onChange={(periodIntent) =>
            onChange({ periodIntent, targetMonth: periodMonth(periodIntent) })
          }
          options={periods.map(({ label, value }) => ({
            label: `For ${label.toLowerCase()}`,
            value,
          }))}
          placeholder="Choose a month"
          sheetTitle="Which month is it for?"
          value={split.periodIntent}
        />
      ) : null}
    </View>
  )
}
