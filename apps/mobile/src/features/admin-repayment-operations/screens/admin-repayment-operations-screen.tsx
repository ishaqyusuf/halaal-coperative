import { AppSheet } from "@/components/app/app-sheet"
import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { ReviewRow } from "@/components/app/result-screen"
import { ScreenShell } from "@/components/app/screen-shell"
import { BottomSearchFooter } from "@/components/search/bottom-search-footer"
import { Button } from "@/components/ui/button"
import { DateField } from "@/components/ui/date-field"
import { FormField } from "@/components/ui/form-field"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Elevated, TintedAvatar } from "@/components/ui/list-card"
import { MoneyField } from "@/components/ui/money-field"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { useLaneTabsAnchor } from "@/components/ui/segmented-pager"
import { StatusBanner } from "@/components/ui/status-banner"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import {
  mobileDevQuickFill,
  mobileDevQuickFillReference,
} from "@/dev/mobile-dev-quick-fill"
import { useBottomSearchScroll } from "@/hooks/use-bottom-search-scroll"
import { readErrorCode } from "@/lib/app-query-policy"
import { createClientSubmissionKey } from "@/lib/client-submission-key"
import { formatCompactMoney, formatMoney } from "@/lib/money"
import { captureMobileError } from "@/lib/sentry"
import { cn } from "@/lib/utils"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { MobileOfflineOperationError } from "@/runtime/mobile-runtime-state"
import { useRouter } from "expo-router"
import { type ReactNode, useEffect, useRef, useState } from "react"
import {
  BackHandler,
  Keyboard,
  Pressable,
  View,
} from "react-native"
import Animated, { FadeIn, FadeOut, SlideInDown } from "react-native-reanimated"
import {
  postRepaymentOperation,
  recordCollectionFollowUpOperation,
} from "../api/admin-repayment-operations-api"
import { RepaymentFacilitySheet, IconTile } from "../components/repayment-facility-sheet"
import {
  RepaymentLanes,
  RepaymentSummaryCard,
} from "../components/repayment-lanes"
import {
  useAdminRepayments,
  useRepaymentFacility,
  useRepaymentInvalidation,
} from "../hooks/use-admin-repayments"
import type {
  RepaymentFacility,
  RepaymentWorkspaceItem,
} from "../model/admin-repayment-operations-types"
import {
  dateOnlyFromNow,
  dayCount,
  followUpCaseStage,
  followUpOutcomes,
  followUpPriorities,
  type FollowUpDraft,
  formatRepaymentDate,
  friendlyDate,
  outcomeFor,
  priorityLabel,
  type RepaymentDraft,
  toDateOnly,
  validateFollowUpDraft,
  validateRepaymentDraft,
} from "../model/admin-repayment-presentation"

type FormKind = "followUp" | "repayment"

/** What a write needs, from a lane row or from the facility detail. */
type FormTarget = {
  agingDays: number
  dueAmount: number
  dueAt: string
  installmentNumber: number | null
  loanId: string
  loanState: string
  member: { name: string; number: string }
  outstanding: number
  scheduleItemId: string
  scheduleState: string
  term: number | null
}

type Outcome =
  | { kind: "success"; formKind: FormKind }
  | { kind: "conflict" | "error" }

function targetFromRow(item: RepaymentWorkspaceItem): FormTarget {
  return {
    agingDays: item.agingDays,
    dueAmount: item.amount,
    dueAt: item.dueAt,
    installmentNumber: item.installmentNumber,
    loanId: item.loan.id,
    loanState: item.loan.status,
    member: item.member,
    outstanding: item.loan.outstandingPrincipal,
    scheduleItemId: item.id,
    scheduleState: item.state,
    term: null,
  }
}

function targetFromFacility(facility: RepaymentFacility): FormTarget | null {
  const next = facility.nextDue
  if (!next) return null
  return {
    agingDays: next.agingDays,
    dueAmount: next.outstandingAmount,
    dueAt: next.dueAt,
    installmentNumber: next.installmentNumber,
    loanId: facility.id,
    loanState: facility.state,
    member: facility.member,
    outstanding: facility.outstandingPrincipal,
    scheduleItemId: next.id,
    scheduleState: next.state,
    term: facility.schedule.length || facility.termMonths,
  }
}

function emptyRepayment(target: FormTarget | null): RepaymentDraft {
  return {
    amount: target ? String(Math.round(target.dueAmount)) : "",
    paidAt: toDateOnly(new Date()),
    reference: "",
  }
}

function emptyFollowUp(target: FormTarget | null): FollowUpDraft {
  return {
    nextActionAt: dateOnlyFromNow(2),
    note: "",
    priority: target && target.agingDays >= 30 ? "high" : "normal",
    promiseToPayAt: "",
    status: "reminded",
  }
}

function instalmentLine(target: FormTarget) {
  const instalment = target.installmentNumber
    ? `Inst ${target.installmentNumber}${target.term ? ` of ${target.term}` : ""}`
    : "Instalment"
  const when =
    target.agingDays > 0
      ? `${dayCount(target.agingDays)} overdue`
      : `due ${formatRepaymentDate(target.dueAt)}`
  return `${instalment} · ${when}`
}

function ContextCard({
  money,
  target,
}: {
  money: (value: number) => string
  target: FormTarget
}) {
  return (
    <Elevated
      className="flex-row items-center gap-[12px] rounded-[20px] bg-card px-[14px] py-[12px]"
      radius={20}
    >
      <TintedAvatar name={target.member.name} />
      <View className="min-w-0 flex-1">
        <Text className="font-bold" numberOfLines={1} variant="body">
          {target.member.name}
        </Text>
        <Text className="text-muted-foreground" numberOfLines={1} variant="caption">
          {instalmentLine(target)}
        </Text>
      </View>
      <View className="items-end">
        <Text variant="money">{money(target.dueAmount)}</Text>
        <Text className="text-muted-foreground" variant="caption">
          due
        </Text>
      </View>
    </Elevated>
  )
}

function Chip({
  label,
  onPress,
  selected,
}: {
  label: string
  onPress: () => void
  selected: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={cn(
        "min-h-[40px] justify-center rounded-full border px-[14px] active:opacity-80",
        selected ? "border-accent bg-accent" : "border-border bg-card"
      )}
      onPress={onPress}
    >
      <Text
        className={selected ? "text-accent-foreground" : "text-foreground-soft"}
        variant="label"
      >
        {label}
      </Text>
    </Pressable>
  )
}

/** A floating panel over the open form (02 review and result). No inputs. */
function FloatingPanel({
  children,
  onDismiss,
}: {
  children: ReactNode
  onDismiss?: () => void
}) {
  return (
    <View className="absolute inset-0 justify-end">
      <Animated.View
        entering={FadeIn.duration(180)}
        exiting={FadeOut.duration(160)}
        style={{ height: "100%", left: 0, position: "absolute", top: 0, width: "100%" }}
      >
        <Pressable
          accessibilityLabel="Close"
          accessibilityRole="button"
          className="flex-1 bg-overlay"
          disabled={!onDismiss}
          onPress={onDismiss}
        />
      </Animated.View>
      <Animated.View entering={SlideInDown.duration(300)} style={{ margin: 8, marginBottom: 24 }}>
        <Elevated className="gap-[16px] rounded-[32px] bg-card px-[20px] pt-[20px] pb-[20px]" radius={32}>
          {children}
        </Elevated>
      </Animated.View>
    </View>
  )
}

export function AdminRepaymentOperationsScreen() {
  const runtime = useMobileRuntime()
  const router = useRouter()
  const offline = runtime.state.connectivity !== "online"
  const data = useAdminRepayments(offline)
  const anchor = useLaneTabsAnchor()
  const searchScroll = useBottomSearchScroll()
  const invalidateAfterWrite = useRepaymentInvalidation()
  const currencyCode = data.currencyCode
  const money = (value: number) => formatMoney(value, { currencyCode })
  const writesBlocked = offline || data.stale

  // Facility detail (cached per loan).
  const [facilityLoanId, setFacilityLoanId] = useState<string | null>(null)
  const [facilityOpen, setFacilityOpen] = useState(false)
  const facilityQuery = useRepaymentFacility(facilityLoanId)
  const queuedForm = useRef<{ kind: FormKind; target: FormTarget } | null>(null)

  // Write flow: form → review (floating) → submitting → result (floating).
  const [formKind, setFormKind] = useState<FormKind>("repayment")
  const [target, setTarget] = useState<FormTarget | null>(null)
  const [step, setStep] = useState<"closed" | "form" | "review" | "result">(
    "closed"
  )
  const [repayment, setRepayment] = useState<RepaymentDraft>(emptyRepayment(null))
  const [followUp, setFollowUp] = useState<FollowUpDraft>(emptyFollowUp(null))
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const commandIdRef = useRef<string | null>(null)
  const viewFacilityAfterClose = useRef(false)

  const repaymentErrors = target
    ? validateRepaymentDraft(repayment, target.outstanding, money)
    : {}
  const followUpErrors = validateFollowUpDraft(followUp)
  const errors = formKind === "repayment" ? repaymentErrors : followUpErrors
  const valid = Object.keys(errors).length === 0
  const baseline =
    formKind === "repayment" ? emptyRepayment(target) : emptyFollowUp(target)
  const dirty =
    formKind === "repayment"
      ? JSON.stringify(repayment) !== JSON.stringify(baseline)
      : JSON.stringify(followUp) !== JSON.stringify(baseline)

  useEffect(() => {
    if (step !== "review" && step !== "result") return
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (submitting) return true
        if (step === "review") setStep("form")
        else closeFlow()
        return true
      }
    )
    return () => subscription.remove()
  }, [step, submitting])

  function openForm(kind: FormKind, next: FormTarget) {
    setFormKind(kind)
    setTarget(next)
    setRepayment(emptyRepayment(next))
    setFollowUp(emptyFollowUp(next))
    setShowErrors(false)
    setOutcome(null)
    commandIdRef.current = null
    setStep("form")
  }

  function closeFlow() {
    setOutcome(null)
    setStep("closed")
  }

  function openFacility(loanId: string) {
    setFacilityLoanId(loanId)
    setFacilityOpen(true)
  }

  function startFromFacility(kind: FormKind) {
    const facility = facilityQuery.data
    const next = facility ? targetFromFacility(facility) : null
    if (!next) return
    queuedForm.current = { kind, target: next }
    setFacilityOpen(false)
  }

  function review() {
    Keyboard.dismiss()
    setShowErrors(true)
    if (!valid || writesBlocked) return
    commandIdRef.current = createClientSubmissionKey()
    setStep("review")
  }

  async function confirm() {
    if (!target || submitting || writesBlocked) return
    const commandId = commandIdRef.current ?? createClientSubmissionKey()
    commandIdRef.current = commandId
    setSubmitting(true)
    try {
      if (formKind === "repayment") {
        await postRepaymentOperation({
          amount: Number(repayment.amount),
          commandId,
          expectedOutstandingPrincipal: target.outstanding,
          expectedState: target.loanState as "active" | "disbursed",
          loanId: target.loanId,
          paidAt: repayment.paidAt,
          reference: repayment.reference.trim(),
        })
      } else {
        await recordCollectionFollowUpOperation({
          caseStage: followUpCaseStage(followUp.status, followUp.priority),
          commandId,
          expectedState: target.scheduleState as
            | "due"
            | "overdue"
            | "partially_paid"
            | "pending",
          nextActionAt: followUp.nextActionAt || null,
          note: followUp.note.trim(),
          priority: followUp.priority,
          promiseToPayAt:
            followUp.status === "promise_to_pay"
              ? followUp.promiseToPayAt || null
              : null,
          repaymentScheduleItemId: target.scheduleItemId,
          status: followUp.status,
        })
      }
      setOutcome({ formKind, kind: "success" })
      setStep("result")
      void invalidateAfterWrite(formKind, target.loanId)
    } catch (error) {
      const code = readErrorCode(error)
      const conflict = code === "CONFLICT" || code === "PRECONDITION_FAILED"
      if (!(error instanceof MobileOfflineOperationError))
        captureMobileError(error, "mobile.repayment_operations")
      if (conflict) {
        commandIdRef.current = null
        void invalidateAfterWrite(formKind, target.loanId)
      }
      setOutcome({ kind: conflict ? "conflict" : "error" })
      setStep("result")
    } finally {
      setSubmitting(false)
    }
  }

  const reviewRows: [string, string][] = target
    ? formKind === "repayment"
      ? [
          ["Member", `${target.member.name} · ${target.member.number}`],
          [
            "Instalment",
            `${target.installmentNumber ?? "–"}${target.term ? ` of ${target.term}` : ""} · ${money(target.dueAmount)} due`,
          ],
          ["Payment date", repayment.paidAt ? friendlyDate(repayment.paidAt) : "–"],
          ["Reference", repayment.reference.trim()],
          [
            "Outstanding after",
            money(Math.max(0, target.outstanding - Number(repayment.amount || 0))),
          ],
        ]
      : [
          ["Member", `${target.member.name} · ${target.member.number}`],
          ["Outcome", outcomeFor(followUp.status).label],
          ["Priority", priorityLabel(followUp.priority)],
          ...(followUp.status === "promise_to_pay" && followUp.promiseToPayAt
            ? ([["Promise date", friendlyDate(followUp.promiseToPayAt)]] as [string, string][])
            : []),
          [
            "Next action",
            followUp.nextActionAt ? friendlyDate(followUp.nextActionAt) : "Not scheduled",
          ],
          ["Notes", followUp.note.trim()],
          ["Balance change", "None"],
        ]
    : []

  const reviewPanel =
    step === "review" && target ? (
      <FloatingPanel onDismiss={submitting ? undefined : () => setStep("form")}>
        <View className="flex-row items-center justify-between">
          <Text accessibilityRole="header" variant="title">
            {formKind === "repayment" ? "Review repayment" : "Review follow-up"}
          </Text>
          <Pressable
            accessibilityLabel="Back to edit"
            accessibilityRole="button"
            className="size-[44px] items-center justify-center rounded-full bg-surface-raised"
            disabled={submitting}
            onPress={() => setStep("form")}
          >
            <Icon className="size-[18px] text-foreground" name="X" />
          </Pressable>
        </View>
        {formKind === "repayment" ? (
          <View className="items-center gap-[2px]">
            <Text className="text-muted-foreground" variant="label">
              Amount received
            </Text>
            <Text variant="hero">{money(Number(repayment.amount || 0))}</Text>
          </View>
        ) : (
          <View className="flex-row items-center gap-[12px]">
            <IconTile
              icon={outcomeFor(followUp.status).icon}
              size={40}
              tone={outcomeFor(followUp.status).tone}
            />
            <Text variant="section">{outcomeFor(followUp.status).label}</Text>
          </View>
        )}
        <View>
          {reviewRows.map(([label, value], index) => (
            <View key={label}>
              {index ? <View className="h-px bg-border" /> : null}
              <ReviewRow compact label={label} value={value} />
            </View>
          ))}
        </View>
        <View className="gap-[8px]">
          <Button
            loading={submitting}
            onPress={confirm}
            testID="repayment-confirm"
          >
            <Text>
              {submitting
                ? formKind === "repayment"
                  ? "Posting"
                  : "Saving"
                : formKind === "repayment"
                  ? `Post ${money(Number(repayment.amount || 0))}`
                  : "Save follow-up"}
            </Text>
          </Button>
          <Button
            disabled={submitting}
            onPress={() => setStep("form")}
            variant="ghost"
          >
            <Text>Edit</Text>
          </Button>
        </View>
      </FloatingPanel>
    ) : null

  const resultCopy =
    outcome && target
      ? outcome.kind === "success"
        ? outcome.formKind === "repayment"
          ? {
              body: `${money(Number(repayment.amount))} from ${target.member.name} is recorded against instalment ${target.installmentNumber ?? "–"}.`,
              icon: "Check",
              title: "Repayment posted",
              tone: "success" as const,
            }
          : {
              body: `${followUp.nextActionAt ? `Next action on ${formatRepaymentDate(followUp.nextActionAt)}.` : "No next action scheduled."} The balance hasn’t changed.`,
              icon: "Check",
              title: "Follow-up saved",
              tone: "success" as const,
            }
        : outcome.kind === "conflict"
          ? {
              body: "Another change was recorded after you opened it. Refresh to check the new balance before you try again.",
              icon: "RefreshCw",
              title: "This facility changed",
              tone: "warning" as const,
            }
          : {
              body: "The connection dropped before the server confirmed it. Nothing was recorded, so it’s safe to try again.",
              icon: "CircleAlert",
              title:
                formKind === "repayment"
                  ? "Couldn’t post the repayment"
                  : "Couldn’t save the follow-up",
              tone: "danger" as const,
            }
      : null

  const resultPanel =
    step === "result" && resultCopy && outcome ? (
      <FloatingPanel>
        <View className="items-center gap-[10px] pt-[8px]">
          <IconTile
            icon={resultCopy.icon}
            size={40}
            tone={resultCopy.tone}
          />
          <Text accessibilityRole="header" className="text-center" variant="title">
            {resultCopy.title}
          </Text>
          <Text className="text-center text-muted-foreground" variant="body">
            {resultCopy.body}
          </Text>
        </View>
        <View className="gap-[8px]">
          {outcome.kind === "success" ? (
            <>
              <Button onPress={closeFlow} testID="repayment-result-done">
                <Text>Done</Text>
              </Button>
              <Button
                onPress={() => {
                  viewFacilityAfterClose.current = true
                  closeFlow()
                }}
                variant="ghost"
              >
                <Text>View facility</Text>
              </Button>
            </>
          ) : outcome.kind === "conflict" ? (
            <>
              <Button
                onPress={() => {
                  viewFacilityAfterClose.current = true
                  closeFlow()
                }}
              >
                <Text>Refresh facility</Text>
              </Button>
              <Button onPress={closeFlow} variant="ghost">
                <Text>Cancel</Text>
              </Button>
            </>
          ) : (
            <>
              <Button
                disabled={writesBlocked}
                loading={submitting}
                onPress={confirm}
              >
                <Text>Try again</Text>
              </Button>
              <Button onPress={() => setStep("form")} variant="ghost">
                <Text>Back to edit</Text>
              </Button>
            </>
          )}
        </View>
      </FloatingPanel>
    ) : null

  const formFooter = (
    <View className="gap-[6px]">
      <DevQuickFill
        label={
          formKind === "repayment"
            ? "Quick fill repayment"
            : "Quick fill follow-up"
        }
        onPress={() => {
          if (formKind === "repayment") {
            setRepayment((current) => ({
              ...current,
              amount: String(
                Math.min(
                  Number(mobileDevQuickFill.adminRepaymentOperations.repaymentAmount),
                  target?.outstanding ?? Number.POSITIVE_INFINITY
                )
              ),
              reference: mobileDevQuickFillReference("QA-REP"),
            }))
          } else {
            setFollowUp((current) => ({
              ...current,
              note: mobileDevQuickFill.adminRepaymentOperations.followUpNote,
              status: "promise_to_pay",
              promiseToPayAt: dateOnlyFromNow(2),
            }))
          }
        }}
        placement="footer"
        portal={false}
      />
      <Button
        disabled={writesBlocked}
        onPress={review}
        testID="repayment-review"
      >
        <Text>
          {formKind === "repayment" ? "Review repayment" : "Review follow-up"}
        </Text>
      </Button>
    </View>
  )

  const fieldError = (key: string) =>
    showErrors ? (errors as Record<string, string | undefined>)[key] : undefined

  const repaymentForm = target ? (
    <View className="gap-[18px]">
      <ContextCard money={money} target={target} />
      <View className="items-center gap-[10px]">
        <Text className="text-muted-foreground" variant="label">
          Amount received
        </Text>
        <View className="w-[250px]">
          <MoneyField
            accessibilityLabel="Amount received in naira"
            className={cn(
              "bg-transparent",
              fieldError("amount") ? "border-destructive" : "border-border"
            )}
            currencyCode={currencyCode}
            display="large"
            onChangeValue={(raw) =>
              setRepayment((current) => ({ ...current, amount: raw }))
            }
            style={{ paddingRight: 24, textAlign: "center" }}
            testID="repayment-amount-input"
            value={repayment.amount}
          />
        </View>
        <View className="flex-row flex-wrap justify-center gap-[8px]">
          <Chip
            label={`Instalment ${money(target.dueAmount)}`}
            onPress={() =>
              setRepayment((current) => ({
                ...current,
                amount: String(Math.round(target.dueAmount)),
              }))
            }
            selected={Number(repayment.amount) === Math.round(target.dueAmount)}
          />
          <Chip
            label={`Full balance ${formatCompactMoney(target.outstanding, currencyCode)}`}
            onPress={() =>
              setRepayment((current) => ({
                ...current,
                amount: String(target.outstanding),
              }))
            }
            selected={Number(repayment.amount) === target.outstanding}
          />
        </View>
        <Text
          className={cn(
            "text-center",
            fieldError("amount") ? "text-destructive" : "text-muted-foreground"
          )}
          variant="small"
        >
          {fieldError("amount") ?? `Up to ${money(target.outstanding)} outstanding`}
        </Text>
      </View>
      <FormField error={fieldError("paidAt")} label="Payment date">
        <DateField
          maximumDate={toDateOnly(new Date())}
          onChange={(value) =>
            setRepayment((current) => ({ ...current, paidAt: value }))
          }
          sheetTitle="Payment date"
          testID="repayment-date-input"
          value={repayment.paidAt}
        />
      </FormField>
      <FormField
        error={fieldError("reference")}
        helper="Bank transfer or receipt number"
        label="Payment reference"
      >
        <Input
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={120}
          onChangeText={(value) =>
            setRepayment((current) => ({ ...current, reference: value }))
          }
          placeholder="e.g. TRF-048213"
          returnKeyType="done"
          testID="repayment-reference-input"
          value={repayment.reference}
        />
      </FormField>
    </View>
  ) : null

  const followUpForm = target ? (
    <View className="gap-[18px]">
      <ContextCard money={money} target={target} />
      <FormField label="Outcome">
        <View
          accessibilityRole="radiogroup"
          className="flex-row flex-wrap gap-[10px]"
        >
          {followUpOutcomes.map((option) => {
            const selected = followUp.status === option.value
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                className={cn(
                  "min-h-[64px] grow basis-[45%] flex-row items-center gap-[10px] rounded-[16px] border px-[12px] py-[10px] active:opacity-80",
                  selected ? "border-primary bg-accent" : "border-border bg-card"
                )}
                key={option.value}
                onPress={() =>
                  setFollowUp((current) => ({ ...current, status: option.value }))
                }
                testID={`follow-up-outcome-${option.value}`}
              >
                <IconTile icon={option.icon} tone={option.tone} />
                <View className="min-w-0 flex-1">
                  <Text className="font-bold" numberOfLines={1} variant="small">
                    {option.label}
                  </Text>
                  <Text className="text-muted-foreground" numberOfLines={1} variant="caption">
                    {option.description}
                  </Text>
                </View>
              </Pressable>
            )
          })}
        </View>
      </FormField>
      <FormField label="Priority">
        <SegmentedControl
          accessibilityLabel="Priority"
          onChange={(value) =>
            setFollowUp((current) => ({ ...current, priority: value }))
          }
          options={followUpPriorities}
          value={followUp.priority}
        />
      </FormField>
      {followUp.status === "promise_to_pay" ? (
        <FormField error={fieldError("promiseToPayAt")} label="Promise date">
          <DateField
            minimumDate={toDateOnly(new Date())}
            onChange={(value) =>
              setFollowUp((current) => ({ ...current, promiseToPayAt: value }))
            }
            sheetTitle="Promise date"
            testID="follow-up-promise-input"
            value={followUp.promiseToPayAt}
          />
        </FormField>
      ) : null}
      <View className="gap-[10px]">
        <FormField label="Next action" optional>
          <DateField
            minimumDate={toDateOnly(new Date())}
            onChange={(value) =>
              setFollowUp((current) => ({ ...current, nextActionAt: value }))
            }
            sheetTitle="Next action"
            testID="follow-up-next-action-input"
            value={followUp.nextActionAt}
          />
        </FormField>
        <View className="flex-row flex-wrap gap-[8px]">
          {(
            [
              [1, "Tomorrow"],
              [2, "In 2 days"],
              [7, "In a week"],
            ] as const
          ).map(([days, label]) => (
            <Chip
              key={days}
              label={label}
              onPress={() =>
                setFollowUp((current) => ({
                  ...current,
                  nextActionAt: dateOnlyFromNow(days),
                }))
              }
              selected={followUp.nextActionAt === dateOnlyFromNow(days)}
            />
          ))}
        </View>
      </View>
      <FormField error={fieldError("note")} label="Notes">
        <Textarea
          accessibilityLabel="Notes"
          className="min-h-[104px] rounded-[14px] px-[14px] py-[13px]"
          maxLength={2000}
          onChangeText={(value) =>
            setFollowUp((current) => ({ ...current, note: value }))
          }
          placeholder="What happened, and what was agreed?"
          testID="follow-up-note-input"
          value={followUp.note}
        />
      </FormField>
      <View className="flex-row items-start gap-[10px] px-[4px]">
        <Icon className="mt-[1px] size-base text-muted-foreground" name="Info" />
        <Text className="flex-1 text-muted-foreground" variant="small">
          A follow-up doesn’t change the balance. Use Record repayment for money
          received.
        </Text>
      </View>
    </View>
  ) : null

  const updatedTime = data.updatedAt
    ? new Date(data.updatedAt).toLocaleTimeString("en-NG", {
        hour: "numeric",
        minute: "2-digit",
      })
    : null
  // The pill hides on an empty, failed or short lane (shows above 10 rows).
  const searchTotal = data.active.hasNext
    ? (data.summary?.counts[data.lane] ?? data.active.items.length)
    : data.active.items.length

  return (
    <>
      <ScreenShell
        back={() =>
          router.canGoBack() ? router.back() : router.replace("/(admin)/(tabs)/finance")
        }
        compactTitle
        contentClassName="gap-[14px] pb-[72px]"
        onRefresh={data.refresh}
        onScroll={(event) => {
          anchor.onScroll(event)
          searchScroll.onScroll(event)
          const { contentOffset, contentSize, layoutMeasurement } =
            event.nativeEvent
          if (
            contentSize.height - contentOffset.y - layoutMeasurement.height <
            320
          )
            data.active.nextPage()
        }}
        overlay={
          <BottomSearchFooter
            accessibilityLabel="Search repayments"
            hidden={searchScroll.hidden}
            maxLength={120}
            onChangeText={data.setSearch}
            placeholder="Search member or number"
            alwaysShowSearch={Boolean(data.search)}
            searchVisible
            totalCount={searchTotal}
            value={data.search}
          />
        }
        refreshing={data.refreshing}
        scrollRef={anchor.scrollRef}
        testID="admin-repayment-operations-screen"
        title="Repayments"
      >
        {offline ? (
          <StatusBanner
            description={
              updatedTime
                ? `Showing data from ${updatedTime}. Recording is paused until you reconnect.`
                : "Recording is paused until you reconnect."
            }
            kind="offline"
            title="You’re offline"
            tone="neutral"
          />
        ) : data.stale ? (
          <StatusBanner
            kind="stale"
            onRetry={data.refresh}
            retryLabel="Refresh"
            retrying={data.refreshing}
            title="Refresh before recording"
          />
        ) : data.summaryError && data.summary ? (
          <StatusBanner
            kind="error"
            onRetry={data.refresh}
            retrying={data.refreshing}
            title="Couldn’t refresh the summary"
          />
        ) : null}
        <RepaymentSummaryCard currencyCode={currencyCode} summary={data.summary} />
        <RepaymentLanes
          anchor={anchor}
          data={data}
          offline={offline}
          onFollowUp={(item) => openForm("followUp", targetFromRow(item))}
          onOpen={(item) => openFacility(item.loan.id)}
          onRecord={(item) => openForm("repayment", targetFromRow(item))}
          writesBlocked={writesBlocked}
        />
      </ScreenShell>

      <RepaymentFacilitySheet
        capabilities={data.capabilities}
        currencyCode={currencyCode}
        error={facilityQuery.isError}
        facility={facilityQuery.data}
        loading={facilityQuery.isPending}
        offline={offline}
        onClose={() => setFacilityOpen(false)}
        onDismissed={() => {
          const queued = queuedForm.current
          queuedForm.current = null
          if (queued) openForm(queued.kind, queued.target)
        }}
        onFollowUp={() => startFromFacility("followUp")}
        onRecord={() => startFromFacility("repayment")}
        onRetry={() => void facilityQuery.refetch()}
        retrying={facilityQuery.isRefetching}
        stale={false}
        visible={facilityOpen}
        writesBlocked={writesBlocked || facilityQuery.isRefetching}
      />

      <AppSheet
        dirty={dirty && step === "form"}
        footer={formFooter}
        isSubmitting={submitting}
        onClose={closeFlow}
        onDismissed={() => {
          if (!viewFacilityAfterClose.current || !target) return
          viewFacilityAfterClose.current = false
          openFacility(target.loanId)
        }}
        overlay={reviewPanel ?? resultPanel}
        overlayActive={step === "review" || step === "result"}
        title={formKind === "repayment" ? "Record repayment" : "Record follow-up"}
        variant="form"
        visible={step !== "closed"}
      >
        <View className="gap-[18px]">
          {offline ? (
            <StatusBanner
              description={
                formKind === "repayment"
                  ? "Reconnect to post this repayment; your entries stay here."
                  : "Reconnect to save this follow-up; your notes stay here."
              }
              kind="offline"
              title="You’re offline"
            />
          ) : data.stale ? (
            <StatusBanner
              kind="stale"
              onRetry={data.refresh}
              retryLabel="Refresh"
              retrying={data.refreshing}
              title="Refresh before recording"
            />
          ) : null}
          {formKind === "repayment" ? repaymentForm : followUpForm}
        </View>
      </AppSheet>
    </>
  )
}
