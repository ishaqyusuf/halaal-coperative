import { AppSheet } from "@/components/app/app-sheet"
import { DevQuickFill } from "@/components/app/dev-quick-fill"
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
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBanner } from "@/components/ui/status-banner"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import {
  mobileDevQuickFill,
  mobileDevQuickFillDate,
  mobileDevQuickFillReference,
} from "@/dev/mobile-dev-quick-fill"
import { isValidDateOnly, todayDateOnly } from "@/lib/date-only"
import { formatMoneyInput, parseMoneyInput } from "@/lib/money"
import { cn } from "@/lib/utils"
import { isSafeSupportAttachmentUrl } from "@halaalvest/utils"
import { useRef, useState, type Dispatch, type SetStateAction } from "react"
import { Keyboard, View } from "react-native"
import { createMemberReceipt } from "../api/member-receipts-api"
import {
  chooseReceiptProof,
  uploadReceiptProof,
  type ReceiptProofFile,
  type ReceiptProofSource,
} from "../api/receipt-proof-api"
import type {
  MobileMemberPayables,
  MobilePaymentReceipt,
} from "../model/member-receipt-types"
import {
  createAllocations,
  hasPaymentDraft,
  koboFromInput,
  liveSelection,
  paymentPlan,
  type PaymentDraft,
  type PaymentLine,
} from "../model/payment-plan"
import { receiptDate, receiptMoney } from "../model/receipt-presentation"
import { PayableBadges, PaymentLines } from "./payment-lines"

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

function SectionTitle({ hint, title }: { hint?: string; title: string }) {
  return (
    <View className="mt-[6px] flex-row items-baseline justify-between px-[2px]">
      <Text accessibilityRole="header" variant="section">
        {title}
      </Text>
      {hint ? (
        <Text className="text-muted-foreground" variant="caption">
          {hint}
        </Text>
      ) : null}
    </View>
  )
}

function Note({
  body,
  icon,
  title,
  tone,
}: {
  body: string
  icon: string
  title: string
  tone: "brand" | "success"
}) {
  return (
    <View
      className={cn(
        "flex-row gap-[10px] rounded-[18px] p-[14px]",
        tone === "brand" ? "bg-accent" : "bg-tint-success"
      )}
    >
      <Icon
        className={cn(
          "mt-[2px] size-[18px]",
          tone === "brand"
            ? "text-accent-foreground"
            : "text-tint-success-foreground"
        )}
        name={icon}
      />
      <View className="flex-1 gap-[2px]">
        <Text className="font-bold" variant="small">
          {title}
        </Text>
        <Text className="text-muted-foreground" variant="small">
          {body}
        </Text>
      </View>
    </View>
  )
}

/**
 * Record payment (T30 · direction 02): big amount, one-row payable badges,
 * Add more → savings, the numbered "Applied in this order" preview and the
 * slip fields; then Check and send → sending → sent (or error with retry).
 */
export function RecordPaymentFlow({
  cooperativeName,
  currency,
  draft,
  memberLine,
  offline,
  onClose,
  onDiscard,
  onSent,
  onViewReceipt,
  payables,
  payablesError,
  payablesLoading,
  onRetryPayables,
  setDraft,
  stale,
  visible,
}: {
  cooperativeName: string
  currency: string
  draft: PaymentDraft
  /** "Aisha Bello · QHC-0042" on the review. */
  memberLine: string | null
  offline: boolean
  onClose: () => void
  onDiscard: () => void
  onRetryPayables: () => void
  onSent: (receipt: MobilePaymentReceipt) => void
  onViewReceipt: (receipt: MobilePaymentReceipt) => void
  payables: MobileMemberPayables | undefined
  payablesError: boolean
  payablesLoading: boolean
  setDraft: Dispatch<SetStateAction<PaymentDraft>>
  stale: boolean
  visible: boolean
}) {
  const [phase, setPhase] = useState<
    "edit" | "review" | "sending" | "success" | "error"
  >("edit")
  const [created, setCreated] = useState<MobilePaymentReceipt | null>(null)
  // The success screen keeps the lines the member saw (the draft resets).
  const [sentLines, setSentLines] = useState<PaymentLine[]>([])
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

  const list = payables?.payables ?? []
  const automatic = payables?.mode !== "member_choice"
  const canCreate = Boolean(payables?.canCreateReceipt)
  const proofRequired = Boolean(payables?.proofRequired)
  const selected = liveSelection(draft.selected, list)
  const plan = paymentPlan({
    extra: draft.showMore ? draft.extra : "",
    payables: list,
    selected,
    typed: draft.typed,
  })
  const settled = Boolean(payables) && !list.length
  const today = todayDateOnly()
  const money = (kobo: number) => receiptMoney(kobo / 100, currency)

  const proofUrl = draft.proofDocumentUrl.trim()
  const linkError =
    (linkMode || !draft.proofDocumentName) &&
    Boolean(proofUrl) &&
    (!/^https:\/\//i.test(proofUrl) || !isSafeSupportAttachmentUrl(proofUrl))
      ? "Enter a valid HTTPS link."
      : null
  const why = offline
    ? "Connect to send your payment."
    : stale
      ? "Refresh Transactions before sending."
      : payablesLoading
        ? "Loading what you owe…"
        : payablesError
          ? "What you owe couldn’t load."
          : !canCreate
            ? "Recording payments is off for this cooperative."
            : !automatic && !selected.length && !settled
              ? "Pick what this payment is for."
              : plan.total <= 0
                ? "Enter the amount on your slip."
                : draft.showMore && koboFromInput(draft.extra) <= 0
                  ? "Enter the extra amount, or remove Add more."
                  : !isValidDateOnly(draft.paidAt) || draft.paidAt > today
                    ? "Choose a paid date up through today."
                    : uploading
                      ? "Wait for the proof to finish uploading."
                      : proofFile && proofError
                        ? "Retry or remove the proof."
                        : (linkError ??
                          (proofRequired && !proofUrl
                            ? "Your cooperative needs proof. Add a photo, PDF or link."
                            : null))

  function patch(update: Partial<PaymentDraft>) {
    setDraft((value) => ({ ...value, ...update }))
  }

  function toggle(id: string) {
    setDraft((value) => {
      const current = liveSelection(value.selected, list)
      const next = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
      return {
        ...value,
        selected: next,
        ...(next.length ? {} : { extra: "", showMore: false }),
      }
    })
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
    if (why || submitting.current) return
    submitting.current = true
    setPhase("sending")
    try {
      const receipt = await createMemberReceipt({
        allocations: createAllocations(plan, draft.paidAt),
        memberNotes: draft.memberNotes.trim() || undefined,
        paidAt: `${draft.paidAt}T00:00:00.000Z`,
        paymentReference: draft.paymentReference.trim() || undefined,
        proofDocumentName: draft.proofDocumentName || undefined,
        proofDocumentUrl: proofUrl || undefined,
        totalAmount: plan.total / 100,
      })
      setCreated(receipt)
      setSentLines(plan.lines)
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
    else if (hasPaymentDraft(draft)) setConfirmClose(true)
    else onClose()
  }

  const linesTitle =
    plan.mode === "auto" ? "Applied in this order" : "Where it goes"

  return (
    <AppSheet
      footer={
        !showingResult ? (
          <View className="gap-[6px]">
            {phase === "edit" ? (
              <View className="mx-[2px] flex-row items-baseline justify-between">
                <Text className="text-muted-foreground" variant="small">
                  {plan.mode === "picked"
                    ? `${plan.lines.length} item${plan.lines.length === 1 ? "" : "s"}`
                    : "Applied automatically"}
                </Text>
                <Text
                  className="text-[20px] leading-[26px] font-extrabold"
                  tabular
                >
                  {money(plan.total)}
                </Text>
              </View>
            ) : null}
            {phase === "edit" && why && plan.total > 0 ? (
              <Text
                className="text-center text-muted-foreground"
                variant="small"
              >
                {why}
              </Text>
            ) : null}
            <View className="flex-row items-center gap-[8px]">
              {phase === "edit" && !hasPaymentDraft(draft) ? (
                <DevQuickFill
                  label="Quick fill payment"
                  onPress={() => {
                    const preset = mobileDevQuickFill.receipt
                    setLinkMode(true)
                    patch({
                      memberNotes: preset.memberNotes,
                      paidAt: mobileDevQuickFillDate(0),
                      paymentReference: mobileDevQuickFillReference("HVC"),
                      proofDocumentUrl: preset.proofDocumentUrl,
                      typed: preset.totalAmount,
                    })
                  }}
                  placement="footer"
                  portal={false}
                />
              ) : null}
              <Button
                className="flex-1"
                disabled={Boolean(why)}
                onPress={() => {
                  Keyboard.dismiss()
                  if (phase === "review") void submit()
                  else setPhase("review")
                }}
                testID="record-payment-primary"
              >
                {phase === "review" ? (
                  <Icon
                    className="size-[18px] text-primary-foreground"
                    name="ArrowRight"
                  />
                ) : null}
                <Text>
                  {phase === "review"
                    ? `Send ${money(plan.total)}`
                    : "Review payment"}
                </Text>
              </Button>
            </View>
          </View>
        ) : null
      }
      isSubmitting={uploading || phase === "sending"}
      onBack={phase === "review" ? back : undefined}
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
                description={`Finance checks your slip, usually within a day. ${receiptMoney(created.totalAmount, currency)} will be applied as you saw.`}
                details={
                  sentLines.length ? (
                    <PaymentLines currency={currency} lines={sentLines} />
                  ) : undefined
                }
                primary={{ label: "Done", onPress: onClose }}
                secondary={{
                  label: "View payment",
                  onPress: () => onViewReceipt(created),
                  variant: "ghost",
                }}
                title="Payment sent for checking"
                tone="success"
              />
            ) : phase === "error" ? (
              <ResultScreen
                compact
                description="Your payment is saved on this phone. Check your connection and try again."
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
                title="Couldn’t send your payment"
                tone="error"
              />
            ) : (
              <SubmittingState
                description={`${money(plan.total)} to finance`}
                title="Sending your payment"
              />
            )}
          </View>
        ) : null
      }
      title={phase === "edit" ? "Record payment" : "Check and send"}
      variant="form"
      visible={visible}
    >
      {offline ? (
        <StatusBanner
          description="Your payment is saved on this phone."
          kind="offline"
          title="You’re offline"
        />
      ) : null}
      {phase === "review" ? (
        <View className="gap-[12px]">
          <View className="items-center pt-[10px]">
            <Text
              className="text-[44px] leading-[52px] font-extrabold tracking-tight"
              tabular
            >
              {money(plan.total)}
            </Text>
            {memberLine ? (
              <Text className="text-muted-foreground" variant="small">
                From {memberLine}
              </Text>
            ) : null}
          </View>
          <SectionTitle
            hint={plan.mode === "auto" ? `Set by ${cooperativeName}` : undefined}
            title={linesTitle}
          />
          <PaymentLines
            currency={currency}
            lines={plan.lines}
            numbered={plan.mode === "auto"}
          />
          {plan.mode === "auto" ? (
            <Text className="px-[2px] text-muted-foreground" variant="caption">
              Finance applies it in this order when they check your slip.
            </Text>
          ) : null}
          <SectionTitle title="Your slip" />
          <View className="overflow-hidden rounded-[20px] border border-border bg-card">
            <ReviewRow compact label="Paid on" value={receiptDate(draft.paidAt)} />
            <View className="border-t border-border">
              <ReviewRow
                compact
                label="Reference"
                value={draft.paymentReference || "None"}
              />
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
        </View>
      ) : phase === "edit" ? (
        <View className="gap-[12px]">
          {plan.mode === "picked" ? (
            <View className="items-center pt-[10px]">
              <Text
                accessibilityLabel={`Total ${money(plan.total)}`}
                className="text-[44px] leading-[52px] font-extrabold tracking-tight"
                tabular
              >
                {money(plan.total)}
              </Text>
              <Text className="text-muted-foreground" variant="small">
                Adds up from what you picked
              </Text>
            </View>
          ) : (
            <View className="items-center pt-[6px]">
              <Input
                accessibilityLabel="Amount on your slip"
                className="h-[64px] w-full border-0 bg-transparent"
                inputMode="decimal"
                keyboardType="decimal-pad"
                maxLength={20}
                onChangeText={(text) =>
                  patch({ typed: parseMoneyInput(text, { allowDecimals: true }).raw })
                }
                placeholder="₦0"
                returnKeyType="done"
                style={{
                  fontSize: 44,
                  fontVariant: ["tabular-nums"],
                  fontWeight: "800",
                  letterSpacing: -1,
                  lineHeight: 52,
                  textAlign: "center",
                }}
                testID="record-payment-amount"
                value={
                  draft.typed ? `₦${formatMoneyInput(draft.typed, true)}` : ""
                }
              />
              <Text className="text-muted-foreground" variant="small">
                Amount on your slip
              </Text>
            </View>
          )}

          {payablesError ? (
            <StatusBanner
              kind="error"
              onRetry={onRetryPayables}
              title="Couldn’t load what you owe"
            />
          ) : payablesLoading ? (
            <View className="flex-row gap-[8px]">
              <Skeleton className="h-[56px] w-[140px] rounded-[16px]" />
              <Skeleton className="h-[56px] w-[120px] rounded-[16px]" />
              <Skeleton className="h-[56px] w-[100px] rounded-[16px]" />
            </View>
          ) : settled ? (
            <Note
              body="Whatever you paid goes to your special savings."
              icon="BadgeCheck"
              title="You owe nothing right now"
              tone="success"
            />
          ) : (
            <>
              <SectionTitle
                hint={
                  selected.length
                    ? "Tap again to remove"
                    : automatic
                      ? "Optional"
                      : "Pick at least one"
                }
                title="Pay for"
              />
              <PayableBadges
                currency={currency}
                extraAmount={koboFromInput(draft.extra)}
                moreOpen={draft.showMore}
                onMore={() =>
                  patch(
                    draft.showMore
                      ? { extra: "", showMore: false }
                      : { showMore: true }
                  )
                }
                onToggle={toggle}
                payables={list}
                selected={selected}
              />
              {draft.showMore && selected.length ? (
                <FormField
                  helper="Goes to your special savings."
                  label="Extra amount on your slip"
                >
                  <MoneyField
                    allowDecimals
                    currencyCode={currency}
                    maxLength={16}
                    onChangeValue={(extra) => patch({ extra })}
                    style={{ fontSize: 18, fontWeight: "800" }}
                    testID="record-payment-extra"
                    value={draft.extra}
                  />
                </FormField>
              ) : null}
            </>
          )}

          {plan.lines.length ? (
            <>
              <SectionTitle
                hint={
                  plan.mode === "auto" ? `Set by ${cooperativeName}` : undefined
                }
                title={linesTitle}
              />
              <PaymentLines
                currency={currency}
                lines={plan.lines}
                numbered={plan.mode === "auto"}
              />
            </>
          ) : !settled && automatic && !payablesLoading && !payablesError ? (
            <Note
              body="Enter the amount and we apply it to what you owe, oldest first. Extra goes to savings."
              icon="Sparkles"
              title="We sort it out for you"
              tone="brand"
            />
          ) : null}

          <SectionTitle title="Your slip" />
          <FormField label="Paid on">
            <DateField
              maximumDate={today}
              onChange={(paidAt) => patch({ paidAt })}
              testID="receipt-paid-date"
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
              onChangeText={(paymentReference) => patch({ paymentReference })}
              placeholder="e.g. TRF-77120934"
              value={draft.paymentReference}
            />
          </FormField>
          <FormField
            error={linkError}
            label="Proof"
            trailingLabel={proofRequired ? "Required" : "Recommended"}
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
                  <Icon className="size-[17px] text-primary" name="Upload" />
                  <Text className="text-primary">Attach a file instead</Text>
                </Button>
              </>
            ) : proofFile || draft.proofDocumentName ? (
              <View className="min-h-[62px] flex-row items-center gap-[8px] rounded-[14px] border border-border bg-card px-[12px]">
                <Icon className="size-[20px] text-primary" name="FileText" />
                <View className="min-w-0 flex-1">
                  <Text className="font-bold" numberOfLines={1} variant="small">
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
                  <Icon className="size-[18px] text-muted-foreground" name="X" />
                </Button>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                className="min-h-[72px] flex-row items-center gap-[12px] rounded-[16px] border border-dashed border-primary bg-accent px-[14px]"
                disabled={offline}
                onPress={() => {
                  Keyboard.dismiss()
                  setProofPicker(true)
                }}
              >
                <View className="size-[40px] items-center justify-center rounded-[14px] bg-card">
                  <Icon className="size-[20px] text-primary" name="Camera" />
                </View>
                <View className="min-w-0 flex-1">
                  <Text
                    className="font-bold text-accent-foreground"
                    variant="body"
                  >
                    Add your slip
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
              className="min-h-[88px] rounded-[14px] px-[14px] py-[12px]"
              maxLength={1000}
              numberOfLines={3}
              onChangeText={(memberNotes) => patch({ memberNotes })}
              placeholder="Anything finance should know"
              value={draft.memberNotes}
            />
          </FormField>
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
        title="Keep this payment?"
        variant="confirm"
        visible={confirmClose}
      >
        <Text className="text-center text-muted-foreground" variant="small">
          It stays on this phone until you send it or discard it.
        </Text>
        <Button
          onPress={() => {
            setConfirmClose(false)
            onClose()
          }}
        >
          <Text>Keep for later</Text>
        </Button>
        <Button
          onPress={() => {
            setConfirmClose(false)
            onDiscard()
          }}
          variant="ghost"
        >
          <Text className="text-destructive">Discard</Text>
        </Button>
        <Button onPress={() => setConfirmClose(false)} variant="ghost">
          <Text>Keep editing</Text>
        </Button>
      </AppSheet>
    </AppSheet>
  )
}
