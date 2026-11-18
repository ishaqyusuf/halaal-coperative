import { AppSheet } from "@/components/app/app-sheet"
import { ConfirmSheet } from "@/components/app/confirm-sheet"
import { DevQuickFill } from "@/components/app/dev-quick-fill"
import {
  ResultScreen,
  ReviewRow,
  SubmittingState,
} from "@/components/app/result-screen"
import { Button } from "@/components/ui/button"
import { DateField } from "@/components/ui/date-field"
import { FormField, useFormFieldControl } from "@/components/ui/form-field"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { TintedAvatar } from "@/components/ui/list-card"
import { MoneyField } from "@/components/ui/money-field"
import { StatusBanner } from "@/components/ui/status-banner"
import { StatusPill, statusToneFor } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import {
  mobileDevQuickFill,
  mobileDevQuickFillReference,
} from "@/dev/mobile-dev-quick-fill"
import {
  appQueryKey,
  useAppQuery,
  useInvalidateAppQueries,
} from "@/hooks/use-app-query"
import { useAuthContext } from "@/hooks/use-auth"
import {
  isUnrecoverableQueryError,
  readErrorCode,
} from "@/lib/app-query-policy"
import { createClientSubmissionKey } from "@/lib/client-submission-key"
import { todayDateOnly } from "@/lib/date-only"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { cn } from "@/lib/utils"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { useEffect, useRef, useState } from "react"
import { BackHandler, Keyboard, Pressable, View } from "react-native"
import {
  applyChargeApplication,
  getChargeApplication,
  getChargeSummary,
  reverseChargeApplication,
  settleChargeApplication,
  waiveChargeApplication,
} from "../api/admin-charge-operations-api"
import {
  ChargeDetail,
  ChargeFacts,
  type ChargeAction,
  type ChargeFact,
} from "../components/charge-detail"
import { ChargeFilters as ChargeFilterSheet } from "../components/charge-filters"
import { ChargePicker } from "../components/charge-picker"
import { ChargeRuleGlyph } from "../components/charge-status"
import { ChargeWorkspaceView } from "../components/charge-workspace"
import {
  type AdminChargeOperationsQaState,
  duplicateChargeResponseLossQaState,
  isCommittedChargeResponseLoss,
} from "../model/admin-charge-response-loss"
import type {
  ChargeApplicationDetail,
  ChargeCommandResult,
  ChargeFilters,
  ChargeLane,
  ChargeMemberOption,
  ChargeRuleOption,
} from "../model/admin-charge-operations-types"
import {
  chargeDate,
  chargeLabel,
  chargeMoney,
  collectionLabel,
} from "../model/charge-display"

type FormMode = "apply" | ChargeAction
type Command =
  | {
      kind: "apply"
      input: Parameters<typeof applyChargeApplication>[0]
      member: ChargeMemberOption
      rule: ChargeRuleOption
    }
  | {
      kind: "settle"
      input: Parameters<typeof settleChargeApplication>[0]
      detail: ChargeApplicationDetail
    }
  | {
      kind: "waive" | "reverse"
      input: Parameters<typeof waiveChargeApplication>[0]
      detail: ChargeApplicationDetail
    }

type SubmitFailure = {
  kind: "retry" | "conflict" | "validation"
  message: string
}

const summaryKey = appQueryKey("admin-charges", "summary")
const pageKey = appQueryKey("admin-charges", "page")
const detailKey = (id: string) => appQueryKey("admin-charges", "detail", id)
const emptyFilters: Record<ChargeLane, ChargeFilters> = {
  applications: {},
  levies: {},
  rules: {},
}

const titles: Record<FormMode, string> = {
  apply: "Apply charge",
  settle: "Settle payment",
  waive: "Waive charge",
  reverse: "Reverse charge",
}

const reviewTitles: Record<FormMode, string> = {
  apply: "Review charge",
  settle: "Review payment",
  waive: "Review waiver",
  reverse: "Review reversal",
}

function dateInput(value: string) {
  return `${value}T12:00:00.000Z`
}

function SelectionField({
  icon,
  onPress,
  subtitle,
  title,
  testID,
}: {
  icon?: string
  onPress: () => void
  subtitle: string
  title: string
  testID: string
}) {
  const field = useFormFieldControl()
  return (
    <Pressable
      accessibilityLabel={`${title}, ${subtitle}`}
      accessibilityRole="button"
      className={cn(
        "min-h-[64px] flex-row items-center gap-[12px] rounded-[14px] border bg-card px-[12px] py-[10px]",
        field?.invalid ? "border-destructive" : "border-border"
      )}
      onPress={() => {
        Keyboard.dismiss()
        onPress()
      }}
      testID={testID}
    >
      {icon ? (
        <View className="bg-surface-raised size-[40px] items-center justify-center rounded-[13px]">
          {icon === "Percent" || icon === "Banknote" ? (
            <ChargeRuleGlyph percentage={icon === "Percent"} />
          ) : (
            <Icon className="size-base text-foreground-soft" name={icon} />
          )}
        </View>
      ) : (
        <TintedAvatar name={title} />
      )}
      <View className="min-w-0 flex-1">
        <Text className="font-bold" numberOfLines={1} variant="body">
          {title}
        </Text>
        <Text
          className="text-muted-foreground"
          numberOfLines={1}
          variant="small"
        >
          {subtitle}
        </Text>
      </View>
      <Icon className="size-base text-muted-foreground" name="ChevronDown" />
    </Pressable>
  )
}

function SelectedCharge({
  detail,
  amount,
}: {
  detail: ChargeApplicationDetail
  amount: string
}) {
  return (
    <View className="flex-row items-center gap-[12px] rounded-[20px] bg-card p-[14px]">
      <TintedAvatar name={detail.memberName} />
      <View className="min-w-0 flex-1">
        <Text className="font-bold" variant="small">
          {detail.definitionName}
        </Text>
        <Text className="text-muted-foreground" variant="small">
          {detail.memberName} · {detail.memberNumber}
        </Text>
      </View>
      <View className="items-end gap-[4px]">
        <Text variant="money">{amount}</Text>
        <StatusPill
          label={chargeLabel(detail.status)}
          tone={statusToneFor(detail.status)}
        />
      </View>
    </View>
  )
}

function reviewFacts(
  command: Command,
  money: (amount: number) => string
): ChargeFact[] {
  if (command.kind === "apply") {
    const { input, member, rule } = command
    return [
      { label: "Member", value: member.fullName, sub: member.memberNumber },
      { label: "Charge", value: rule.name, sub: rule.code },
      {
        label: "Amount rule",
        value: input.basisAmount
          ? `${rule.rate}% of ${money(input.basisAmount)}`
          : "Fixed amount",
      },
      {
        label: "Collected",
        value: collectionLabel(rule.collectionMode),
        sub:
          rule.collectionMode === "pay_separately"
            ? "Stays pending until paid"
            : undefined,
      },
      { label: "Assessed", value: chargeDate(input.assessedAt) },
      ...(input.notes ? [{ label: "Evidence", value: input.notes }] : []),
    ]
  }

  const { detail, input } = command
  const facts = [
    { label: "Member", value: detail.memberName, sub: detail.memberNumber },
    {
      label: "Charge",
      value: detail.definitionName,
      sub: money(detail.amount),
    },
  ]
  if (command.kind === "settle")
    return [
      ...facts,
      { label: "Reference", value: command.input.reference },
      { label: "Paid on", value: chargeDate(command.input.paidAt) },
      ...(command.input.notes
        ? [{ label: "Evidence", value: command.input.notes }]
        : []),
    ]
  return [
    ...facts,
    { label: "Correction note", value: "reason" in input ? input.reason : "" },
  ]
}

function ChargeResult({
  command,
  result,
  money,
  onAgain,
  onDone,
}: {
  command: Command
  result: ChargeCommandResult
  money: (value: number) => string
  onAgain: () => void
  onDone: () => void
}) {
  const apply = command.kind === "apply" ? command : null
  const detail = command.kind === "apply" ? null : command.detail
  const pending = result.state === "pending"
  const replayed = result.replayed
  const amount = money(apply?.input.expectedAmount ?? detail?.amount ?? 0)
  const title = replayed
    ? "Charge already recorded"
    : command.kind === "settle"
      ? "Payment recorded"
      : command.kind === "reverse"
        ? "Charge reversed"
        : command.kind === "waive"
          ? "Charge waived"
          : pending
            ? "Charge applied"
            : "Charge posted"
  const description = replayed
    ? "Your retry matched the original record. No duplicate was created."
    : command.kind === "settle"
      ? `${amount} from ${command.detail.memberName} is posted to the ledger.`
      : command.kind === "reverse" ||
          (command.kind === "waive" && command.detail.status === "posted")
        ? `An opposite ledger entry of ${amount} was posted.`
        : command.kind === "waive"
          ? `${amount} won’t be collected.`
          : pending
            ? `${amount} is pending until ${apply?.member.fullName} pays separately.`
            : `${amount} was posted from savings.`
  const facts: ChargeFact[] = [
    ...(apply
      ? [
          {
            label: "Member",
            value: apply.member.fullName,
            sub: apply.member.memberNumber,
          },
        ]
      : []),
    {
      label: "Charge",
      value: apply?.rule.name ?? detail?.definitionName ?? "",
      sub: amount,
    },
    command.kind === "settle"
      ? { label: "Reference", value: command.input.reference }
      : {
          label: replayed ? "Recorded" : "Status",
          value: replayed
            ? "One charge"
            : pending
              ? "Pending · pay separately"
              : chargeLabel(result.state),
        },
  ]

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        onDone()
        return true
      }
    )
    return () => subscription.remove()
  }, [onDone])

  return (
    <View className="absolute inset-0">
      <ResultScreen
        badgeIcon={replayed ? "Repeat2" : undefined}
        compact
        description={description}
        details={facts.map(({ label, value, sub }, index) => (
          <View key={label}>
            {index ? <View className="mx-[16px] h-px bg-border" /> : null}
            <ReviewRow
              compact
              label={label}
              value={
                <View className="max-w-[64%] min-w-0 shrink items-end">
                  <Text className="text-right font-bold" variant="small">
                    {value}
                  </Text>
                  {sub ? (
                    <Text className="text-muted-foreground" variant="caption">
                      {sub}
                    </Text>
                  ) : null}
                </View>
              }
            />
          </View>
        ))}
        primary={{ label: "Done", onPress: onDone }}
        secondary={
          apply && !replayed
            ? { label: "Apply another", onPress: onAgain }
            : undefined
        }
        title={title}
        tone={replayed ? "warning" : "success"}
      />
    </View>
  )
}

export function AdminChargeOperationsScreen({
  preview: initialPreview,
  qaState,
}: {
  preview?: "empty" | "error" | "offline"
  qaState: AdminChargeOperationsQaState | null
}) {
  const { profile } = useAuthContext()
  const runtime = useMobileRuntime()
  const invalidate = useInvalidateAppQueries()
  const [preview, setPreview] = useState(initialPreview)
  const [lane, setLane] = useState<ChargeLane>("applications")
  const [filters, setFilters] = useState(emptyFilters)
  const [filterVisible, setFilterVisible] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [mode, setMode] = useState<FormMode | null>(null)
  const [picker, setPicker] = useState<"member" | "rule" | null>(null)
  const [member, setMember] = useState<ChargeMemberOption>()
  const [rule, setRule] = useState<ChargeRuleOption>()
  const [basis, setBasis] = useState("")
  const [date, setDate] = useState(todayDateOnly)
  const [notes, setNotes] = useState("")
  const [reference, setReference] = useState("")
  const [checked, setChecked] = useState(false)
  const [review, setReview] = useState<Command | null>(null)
  const [result, setResult] = useState<ChargeCommandResult | null>(null)
  const [failure, setFailure] = useState<SubmitFailure | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submitting = useRef(false)
  const simulatedLoss = useRef(false)
  const offline =
    preview === "offline" || runtime.state.connectivity !== "online"
  const summary = useAppQuery({
    networkMode: "always",
    queryFn: getChargeSummary,
    queryKey: summaryKey,
    ...(offline ? { retry: false } : {}),
  })
  const detailRead = useAppQuery({
    enabled: Boolean(detailId),
    networkMode: "always",
    placeholderData: undefined,
    queryFn: () => getChargeApplication(detailId!),
    queryKey: detailKey(detailId ?? ""),
    ...(offline ? { retry: false } : {}),
  })
  const detail = detailRead.data
  const stale = isMobileReadCacheStale(summary.data?.cache)
  const writable = !offline && !stale
  const currency =
    summary.data?.currencyCode ?? profile?.tenant.currencyCode ?? "NGN"
  const money = (value: number) => chargeMoney(value, currency)
  const capabilities = summary.data?.capabilities
  const today = todayDateOnly()
  const percentage = rule?.chargeValueType === "percentage"
  const amount = rule
    ? percentage
      ? Number(((Number(basis) * rule.rate) / 100).toFixed(2))
      : rule.rate
    : 0
  const correction = mode === "waive" || mode === "reverse"
  const correctionReview =
    !result && (review?.kind === "waive" || review?.kind === "reverse")
  const allowed = correction ? capabilities?.correct : capabilities?.manage
  const canSubmit =
    writable &&
    allowed &&
    (mode === "apply" ||
      (!detailRead.isError && !isMobileReadCacheStale(detail?.cache)))
  const submissionAmount = review
    ? money(
        review.kind === "apply"
          ? review.input.expectedAmount
          : review.detail.amount
      )
    : null
  const failureText =
    failure?.message ??
    (offline ? "Connect to submit. Your entries will stay here." : null)
  const conflict = failure?.kind === "conflict"
  const retry = failure?.kind === "retry"
  const reviewLabel =
    review?.kind === "apply"
      ? `Apply ${submissionAmount} charge`
      : review?.kind === "settle"
        ? `Record ${submissionAmount} payment`
        : review?.kind === "reverse"
          ? `Reverse ${submissionAmount}`
          : `Waive ${submissionAmount}`

  function openForm(next: FormMode) {
    setMember(undefined)
    setRule(undefined)
    setDate(today)
    setBasis("")
    setNotes("")
    setReference("")
    setChecked(false)
    setPicker(null)
    setReview(null)
    setFailure(null)
    setResult(null)
    setMode(next)
  }

  function closeForm() {
    setMode(null)
    setPicker(null)
    setReview(null)
    setResult(null)
    setFailure(null)
  }

  function backToForm() {
    setReview(null)
    setFailure(null)
  }

  function refreshAfterConflict() {
    if (!review) return
    if (review.kind === "apply") {
      setRule(undefined)
      void invalidate(appQueryKey("admin-charges", "rule"))
      backToForm()
    } else {
      closeForm()
      void detailRead.refetch()
    }
  }

  function openReview() {
    if (!mode || !canSubmit) return
    Keyboard.dismiss()
    setChecked(true)
    setFailure(null)
    const commandId = createClientSubmissionKey()
    const evidence = notes.trim() || null
    if (mode === "apply") {
      if (!member || !rule || !Number.isFinite(amount) || amount <= 0) return
      setReview({
        kind: "apply",
        member,
        rule,
        input: {
          assessedAt: dateInput(date),
          basisAmount: percentage ? Number(basis) : null,
          chargeDefinitionId: rule.id,
          commandId,
          expectedAmount: amount,
          expectedState: "available",
          memberId: member.id,
          notes: evidence,
        },
      })
      return
    }
    if (!detail) return
    const base = {
      applicationId: detail.id,
      commandId,
      expectedState: detail.workspaceState,
    }
    if (mode === "settle") {
      if (reference.trim().length < 3) return
      setReview({
        kind: mode,
        detail,
        input: {
          ...base,
          notes: evidence,
          paidAt: dateInput(date),
          reference: reference.trim(),
        },
      })
    } else if ((evidence?.length ?? 0) >= 8) {
      setReview({ kind: mode, detail, input: { ...base, reason: evidence! } })
    }
  }

  async function submit() {
    if (!review || !canSubmit || submitting.current) return
    const command = review
    submitting.current = true
    setIsSubmitting(true)
    setFailure(null)
    try {
      const response = await runtime.runOnlineOperation(
        "financial-command",
        () => {
          if (command.kind === "apply") {
            const simulate =
              qaState === duplicateChargeResponseLossQaState &&
              !simulatedLoss.current
            simulatedLoss.current ||= simulate
            return applyChargeApplication(command.input, {
              simulateResponseLossAfterCommit: simulate,
            })
          }
          if (command.kind === "settle")
            return settleChargeApplication(command.input)
          if (command.kind === "waive")
            return waiveChargeApplication(command.input)
          return reverseChargeApplication(command.input)
        }
      )
      setResult(response)
      const changedDetail =
        command.kind === "apply" ? response.entityId : command.detail.id
      void invalidate(summaryKey, pageKey, detailKey(changedDetail))
    } catch (error) {
      const code = readErrorCode(error)
      const needsRefresh =
        code === "CONFLICT" ||
        code === "NOT_FOUND" ||
        code === "PRECONDITION_FAILED"
      const ambiguous =
        isCommittedChargeResponseLoss(error) ||
        !isUnrecoverableQueryError(error)
      setFailure({
        kind: needsRefresh ? "conflict" : ambiguous ? "retry" : "validation",
        message:
          ambiguous && !needsRefresh
            ? "We couldn’t confirm this. Retrying checks the same request and avoids a duplicate."
            : error instanceof Error
              ? error.message
              : "The charge command could not be completed.",
      })
    } finally {
      submitting.current = false
      setIsSubmitting(false)
    }
  }

  const finish = () => {
    closeForm()
    setDetailId(null)
  }

  const quickFill = () => {
    if (mode === "apply") setBasis(mobileDevQuickFill.adminCharges.basisAmount)
    if (mode === "settle") setReference(mobileDevQuickFillReference("QA-CHG"))
    setNotes(
      correction
        ? mobileDevQuickFill.adminCharges.correctionReason
        : mobileDevQuickFill.adminCharges.notes
    )
  }

  return (
    <ChargeWorkspaceView
      apply={
        capabilities?.manage
          ? { disabled: !writable, onPress: () => openForm("apply") }
          : undefined
      }
      cooperative={profile?.tenant.name}
      currencyCode={currency}
      filterLane={lane}
      filters={filters}
      offline={offline}
      onClear={(value) =>
        setFilters((current) => ({ ...current, [value]: {} }))
      }
      onFilter={() => setFilterVisible(true)}
      onLaneChange={setLane}
      onOpen={setDetailId}
      onRefreshSummary={summary.refetch}
      onRemoveFilter={(key) =>
        setFilters((current) => ({
          ...current,
          [lane]: { ...current[lane], [key]: null },
        }))
      }
      onRetryPreview={() => setPreview(undefined)}
      preview={preview === "offline" ? undefined : preview}
      stale={stale}
      summary={summary.data}
    >
      {filterVisible ? (
        <ChargeFilterSheet
          initial={filters[lane]}
          lane={lane}
          onApply={(value) => {
            setFilters((current) => ({ ...current, [lane]: value }))
            setFilterVisible(false)
          }}
          onClose={() => setFilterVisible(false)}
        />
      ) : null}
      <ChargeDetail
        capabilities={capabilities}
        currencyCode={currency}
        detail={detail}
        disabled={
          !writable ||
          isMobileReadCacheStale(detail?.cache) ||
          detailRead.isError
        }
        error={detailRead.isError}
        onAction={openForm}
        onClose={() => setDetailId(null)}
        onRetry={() => {
          void detailRead.refetch()
        }}
        visible={Boolean(detailId) && !mode}
      />
      <AppSheet
        dirty={
          !review &&
          Boolean(member || rule || notes || reference || date !== today)
        }
        footer={
          result || isSubmitting || correctionReview ? undefined : review ? (
            <Button
              disabled={conflict ? offline : !canSubmit}
              onPress={
                conflict
                  ? refreshAfterConflict
                  : () => {
                      void submit()
                    }
              }
            >
              <Text>
                {conflict
                  ? review.kind === "apply"
                    ? "Back to the form"
                    : "Refresh charge"
                  : retry
                    ? "Retry and confirm"
                    : reviewLabel}
              </Text>
            </Button>
          ) : mode ? (
            <View className="flex-row items-center gap-[10px]">
              <DevQuickFill
                onPress={quickFill}
                placement="footer"
                portal={false}
              />
              <Button
                className="flex-1"
                disabled={!canSubmit}
                onPress={openReview}
                variant={mode === "reverse" ? "destructive" : "default"}
              >
                <Text>{reviewTitles[mode]}</Text>
              </Button>
            </View>
          ) : undefined
        }
        isSubmitting={isSubmitting}
        onBack={review && !result ? backToForm : undefined}
        onClose={review && !result ? backToForm : closeForm}
        overlay={
          result && review ? (
            <ChargeResult
              command={review}
              money={money}
              onAgain={() => openForm("apply")}
              onDone={finish}
              result={result}
            />
          ) : picker ? (
            <ChargePicker
              assessedAt={dateInput(date)}
              currencyCode={currency}
              onClose={() => setPicker(null)}
              onPick={(option) => {
                if ("fullName" in option) setMember(option)
                else {
                  setRule(option)
                  setBasis("")
                }
                setPicker(null)
              }}
              selectedId={picker === "member" ? member?.id : rule?.id}
              type={picker}
            />
          ) : undefined
        }
        overlayActive={Boolean(picker || result || correctionReview)}
        title={
          review && !correctionReview ? "Review" : mode ? titles[mode] : ""
        }
        variant="form"
        visible={Boolean(mode)}
      >
        {result ? null : isSubmitting && !correctionReview ? (
          <SubmittingState />
        ) : review && !correctionReview ? (
          <>
            {failureText ? (
              <StatusBanner
                kind={offline || retry ? "offline" : "error"}
                title={failureText}
              />
            ) : null}
            <View className="items-center gap-[4px] pb-[6px]">
              <Text className="text-muted-foreground" variant="label">
                {review.kind === "apply"
                  ? "Charge to apply"
                  : "Payment received"}
              </Text>
              <Text tabular variant="hero">
                {submissionAmount}
              </Text>
              <Text
                className="text-foreground-soft text-center"
                variant="small"
              >
                {review.kind === "apply"
                  ? `${review.member.fullName} · ${review.rule.name}`
                  : `${review.detail.memberName} · ${review.detail.definitionName}`}
              </Text>
            </View>
            <ChargeFacts facts={reviewFacts(review, money)} />
            <View className="flex-row items-start gap-[8px]">
              <Icon
                className="size-base mt-[2px] text-muted-foreground"
                name="ShieldCheck"
              />
              <Text
                className="min-w-0 flex-1 text-muted-foreground"
                variant="small"
              >
                Recorded with your name and time in the charge history.
              </Text>
            </View>
          </>
        ) : mode ? (
          <>
            {offline ? (
              <StatusBanner
                kind="offline"
                title="You’re offline"
                description="Your entries stay here. Review needs a connection."
              />
            ) : null}
            {mode === "apply" ? (
              <>
                <FormField
                  error={checked && !member ? "Choose a member." : null}
                  label="Member"
                >
                  <SelectionField
                    icon={member ? undefined : "Search"}
                    onPress={() => setPicker("member")}
                    subtitle={
                      member?.memberNumber ?? "Search by name or number"
                    }
                    testID="charge-member-picker"
                    title={member?.fullName ?? "Choose member"}
                  />
                </FormField>
                <FormField
                  error={checked && !rule ? "Choose a charge." : null}
                  label="Charge"
                >
                  <SelectionField
                    icon={
                      rule ? (percentage ? "Percent" : "Banknote") : "Layers"
                    }
                    onPress={() => setPicker("rule")}
                    subtitle={
                      rule
                        ? `${percentage ? `${rule.rate}%` : money(rule.rate)} · ${collectionLabel(rule.collectionMode)} · ${chargeLabel(rule.chargeFrequency)}`
                        : "Active rules only"
                    }
                    testID="charge-definition-picker"
                    title={rule?.name ?? "Choose charge"}
                  />
                </FormField>
                {percentage ? (
                  <FormField
                    error={
                      checked && amount <= 0 ? "Enter a positive amount." : null
                    }
                    helper={
                      rule?.purpose === "loan_fee"
                        ? "The approved loan amount."
                        : undefined
                    }
                    label="Amount the charge applies to"
                  >
                    <MoneyField
                      allowDecimals
                      currencyCode={currency}
                      onChangeValue={setBasis}
                      placeholder="e.g. 600,000"
                      testID="charge-basis-input"
                      value={basis}
                    />
                  </FormField>
                ) : null}
                {rule ? (
                  <View
                    className={cn(
                      "flex-row items-center gap-[14px] rounded-[20px] p-[16px]",
                      amount > 0 ? "bg-accent" : "bg-surface-raised"
                    )}
                  >
                    <View className="size-[40px] items-center justify-center rounded-[13px] bg-card">
                      <ChargeRuleGlyph percentage={percentage} />
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text
                        className="text-accent-foreground"
                        variant="caption"
                      >
                        Charge amount
                      </Text>
                      <Text
                        className="text-accent-foreground"
                        tabular
                        variant="screenTitle"
                      >
                        {amount > 0 ? money(amount) : "—"}
                      </Text>
                      <Text
                        className="text-accent-foreground"
                        variant="caption"
                      >
                        {percentage
                          ? `${rule.rate}% of the amount above`
                          : "Fixed amount"}{" "}
                        · {collectionLabel(rule.collectionMode)}
                      </Text>
                    </View>
                  </View>
                ) : null}
                <FormField label="Assessment date">
                  <DateField
                    maximumDate={today}
                    onChange={(next) => {
                      if (next !== date) {
                        setRule(undefined)
                        setBasis("")
                        setDate(next)
                      }
                    }}
                    testID="charge-assessed-at-input"
                    value={date}
                  />
                </FormField>
              </>
            ) : detail ? (
              <>
                <SelectedCharge amount={money(detail.amount)} detail={detail} />
                {mode === "settle" ? (
                  <>
                    <FormField
                      error={
                        checked && reference.trim().length < 3
                          ? "Enter at least 3 characters."
                          : null
                      }
                      helper="Bank transfer or receipt reference."
                      label="Payment reference"
                    >
                      <Input
                        autoCapitalize="characters"
                        maxLength={160}
                        onChangeText={setReference}
                        placeholder="e.g. GTB-TRF-88213"
                        testID="charge-payment-reference-input"
                        value={reference}
                      />
                    </FormField>
                    <FormField label="Payment date">
                      <DateField
                        maximumDate={today}
                        onChange={setDate}
                        testID="charge-paid-at-input"
                        value={date}
                      />
                    </FormField>
                  </>
                ) : (
                  <StatusBanner
                    kind={
                      mode === "reverse" || detail.status === "posted"
                        ? "error"
                        : "offline"
                    }
                    title={
                      mode === "reverse" || detail.status === "posted"
                        ? `An opposite ledger entry of ${money(detail.amount)} will be posted.`
                        : `${money(detail.amount)} won’t be collected from ${detail.memberName}.`
                    }
                    description="The original charge stays in the history."
                  />
                )}
              </>
            ) : null}
            <FormField
              error={
                checked && correction && notes.trim().length < 8
                  ? "Enter a correction note of at least 8 characters."
                  : null
              }
              helper={
                correction ? "Include the approval or evidence." : undefined
              }
              label={
                correction
                  ? "Correction note"
                  : mode === "settle"
                    ? "Payment evidence"
                    : "Evidence note"
              }
              trailingLabel={
                correction
                  ? notes.trim().length < 8
                    ? `${notes.trim().length}/8 min`
                    : "Ready"
                  : "Optional"
              }
            >
              <Textarea
                className="min-h-[104px]"
                maxLength={1000}
                onChangeText={setNotes}
                placeholder={
                  correction
                    ? "Why is this charge being corrected?"
                    : mode === "settle"
                      ? "Where was the payment confirmed?"
                      : "Why is this charge being applied?"
                }
                testID={
                  correction
                    ? "charge-correction-reason-input"
                    : mode === "settle"
                      ? "charge-settlement-notes-input"
                      : "charge-notes-input"
                }
                value={notes}
              />
            </FormField>
            {mode === "settle" && detail ? (
              <Text className="text-muted-foreground" variant="small">
                Recording the payment posts {money(detail.amount)} to the ledger
                and marks this charge posted.
              </Text>
            ) : null}
          </>
        ) : null}
      </AppSheet>
      {correctionReview && review ? (
        <ConfirmSheet
          cancelLabel="Keep charge"
          confirmDisabled={conflict ? offline : !canSubmit}
          confirmLabel={
            conflict
              ? "Refresh charge"
              : retry
                ? "Retry and confirm"
                : reviewLabel
          }
          description={
            review.kind === "reverse"
              ? "An opposite entry will be posted to the ledger."
              : review.kind === "waive" && review.detail.status === "posted"
                ? "An opposite entry will be posted to the ledger."
                : "This charge won’t be collected."
          }
          error={failureText}
          expandedTitle="Review correction"
          icon={review.kind === "reverse" ? "History" : "Ban"}
          isConfirming={isSubmitting}
          onCancel={backToForm}
          onConfirm={
            conflict
              ? refreshAfterConflict
              : () => {
                  void submit()
                }
          }
          title={
            review.kind === "reverse"
              ? "Reverse this charge?"
              : "Waive this charge?"
          }
          tone={review.kind === "reverse" ? "destructive" : "default"}
          visible
        >
          <ChargeFacts facts={reviewFacts(review, money)} />
        </ConfirmSheet>
      ) : null}
    </ChargeWorkspaceView>
  )
}
