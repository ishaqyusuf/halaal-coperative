import { AppSheet } from "@/components/app/app-sheet"
import { ConfirmSheet } from "@/components/app/confirm-sheet"
import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { ResultScreen, ReviewRow } from "@/components/app/result-screen"
import { Button } from "@/components/ui/button"
import { DateField } from "@/components/ui/date-field"
import { FormField } from "@/components/ui/form-field"
import { Icon } from "@/components/ui/icon"
import { Elevated, TintedAvatar } from "@/components/ui/list-card"
import { Pressable } from "@/components/ui/pressable"
import { StatusBanner } from "@/components/ui/status-banner"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import { mobileDevQuickFill } from "@/dev/mobile-dev-quick-fill"
import { createClientSubmissionKey } from "@/lib/client-submission-key"
import { addMonthsDateOnly, todayDateOnly } from "@/lib/date-only"
import { formatCompactMoney, formatMoney } from "@/lib/money"
import { captureMobileError } from "@/lib/sentry"
import { cn } from "@/lib/utils"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { useRef, useState, type ReactNode } from "react"
import { Keyboard, View } from "react-native"
import {
  disburseFinancing,
  reviewFinancingRequest,
  updateFinancingCycle,
} from "../api/admin-financing-operations-api"
import type {
  FinancingItem,
  FinancingSummary,
} from "../model/admin-financing-operations-types"
import {
  cycleLabel,
  cycleMonth,
  cycleState,
  cycleTargets,
  decisionAfter,
  evidenceError,
  evidenceMax,
  leftToFinance,
  type CycleTarget,
  type ReviewDecision,
} from "../model/financing-presentation"

type Step = "form" | "confirm" | "submitting" | "success" | "error" | "conflict" | "funds"

function failureStep(error: unknown): Step {
  const code = (error as { data?: { code?: string } })?.data?.code
  const message = error instanceof Error ? error.message : ""
  if (code === "CONFLICT" || /changed since/i.test(message)) return "conflict"
  if (/deployable|funds/i.test(message)) return "funds"
  return "error"
}

/** Step 2 → submit; keeps the command id so a retry replays safely. */
function useCommand(run: (commandId: string) => Promise<unknown>, onDone: () => void) {
  const runtime = useMobileRuntime()
  const [step, setStep] = useState<Step>("form")
  const commandId = useRef(createClientSubmissionKey())
  const running = useRef(false)
  async function submit() {
    if (running.current) return
    running.current = true
    setStep("submitting")
    try {
      await runtime.runOnlineOperation("command", () => run(commandId.current))
      setStep("success")
      onDone()
    } catch (error) {
      captureMobileError(error, "mobile.financing_operations")
      setStep(failureStep(error))
    } finally {
      running.current = false
    }
  }
  return {
    edit: () => {
      commandId.current = createClientSubmissionKey()
      setStep("form")
    },
    setStep,
    step,
    submit,
  }
}

function Option({
  description,
  destructive = false,
  disabled = false,
  icon,
  label,
  onPress,
  selected,
}: {
  description: string
  destructive?: boolean
  disabled?: boolean
  icon: string
  label: string
  onPress: () => void
  selected: boolean
}) {
  return (
    <Pressable
      accessibilityLabel={`${label}. ${description}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
    >
      <View
        className={cn(
          "min-h-[64px] flex-row items-center gap-[12px] rounded-[18px] border bg-card px-[14px] py-[12px]",
          selected ? (destructive ? "border-destructive" : "border-primary") : "border-border",
          disabled && "opacity-50"
        )}
      >
        <View
          className={cn(
            "size-[40px] items-center justify-center rounded-[14px]",
            destructive ? "bg-tint-danger" : "bg-accent"
          )}
        >
          <Icon
            className={cn("size-[20px]", destructive ? "text-tint-danger-foreground" : "text-accent-foreground")}
            name={icon}
          />
        </View>
        <View className="min-w-0 flex-1 gap-[2px]">
          <Text className="font-bold" variant="body">
            {label}
          </Text>
          <Text className="text-muted-foreground" variant="small">
            {description}
          </Text>
        </View>
        <View
          className={cn(
            "size-[22px] items-center justify-center rounded-full border-2",
            selected ? (destructive ? "border-destructive" : "border-primary") : "border-border"
          )}
        >
          {selected ? (
            <View className={cn("size-[10px] rounded-full", destructive ? "bg-destructive" : "bg-primary")} />
          ) : null}
        </View>
      </View>
    </Pressable>
  )
}

function MiniSummary({ currencyCode, item }: { currencyCode: string; item: FinancingItem }) {
  return (
    <Elevated className="rounded-[18px] bg-card" radius={18}>
      <View className="flex-row items-center gap-[12px] px-[14px] py-[12px]">
        <TintedAvatar name={item.member.name} />
        <View className="min-w-0 flex-1">
          <Text className="font-bold" numberOfLines={1} variant="body">
            {item.member.name}
          </Text>
          <Text className="text-muted-foreground" numberOfLines={1} variant="small">
            {item.productName} · {item.termMonths} months
          </Text>
        </View>
        <Text variant="money">{formatMoney(item.amount, { currencyCode })}</Text>
      </View>
    </Elevated>
  )
}

function Evidence({
  error,
  label,
  onChange,
  placeholder,
  value,
}: {
  error: string | null
  label: string
  onChange: (value: string) => void
  placeholder: string
  value: string
}) {
  return (
    <FormField
      error={error}
      label={label}
      trailingLabel={
        <Text className="text-muted-foreground" variant="caption">
          {value.trim().length < 4 ? "Required" : `${value.length}/${evidenceMax}`}
        </Text>
      }
    >
      <Textarea
        accessibilityLabel={label}
        maxLength={evidenceMax}
        onChangeText={onChange}
        placeholder={placeholder}
        testID="financing-evidence-input"
        value={value}
      />
    </FormField>
  )
}

function Rows({ rows }: { rows: readonly (readonly [string, string])[] }) {
  return (
    <Elevated className="rounded-[20px] bg-card px-[16px] py-[4px]" radius={20}>
      {rows.map(([label, value]) => (
        <ReviewRow compact key={label} label={label} value={value} />
      ))}
    </Elevated>
  )
}

function Hint({ children }: { children: string }) {
  return (
    <View className="flex-row gap-[6px]">
      <Icon className="mt-[2px] size-[14px] text-muted-foreground" name="Info" />
      <Text className="flex-1 text-muted-foreground" variant="small">
        {children}
      </Text>
    </View>
  )
}

function FailureBanner({ step, conflict, funds }: { conflict: string; funds?: string; step: Step }) {
  if (step === "error")
    return (
      <StatusBanner
        description="Nothing was recorded. Check your connection and try again."
        kind="error"
        title="Couldn’t send"
      />
    )
  if (step === "conflict")
    return <StatusBanner description={conflict} kind="stale" title="Changed by someone else" />
  if (step === "funds" && funds)
    return <StatusBanner description={funds} kind="error" title="Not enough deployable funds" />
  return null
}

function Result({
  description,
  onDone,
  title,
  tone,
}: {
  description: string
  onDone: () => void
  title: string
  tone: "success" | "warning" | "info"
}) {
  return (
    <View className="absolute inset-0 z-20">
      <ResultScreen
        align="top"
        description={description}
        onDone={onDone}
        primary={{ label: "Back to queue", onPress: onDone }}
        title={title}
        tone={tone}
      />
    </View>
  )
}

const DECISIONS: { description: (item: FinancingItem, money: string) => string; icon: string; label: string; value: ReviewDecision }[] = [
  { description: (item, money) => `Reserves ${money} of ${item.loanType} capacity.`, icon: "Check", label: "Approve", value: "approved" },
  { description: () => "Mark it in progress without deciding.", icon: "Clock", label: "Keep under review", value: "under_review" },
  { description: () => "The member is told it wasn’t approved.", icon: "CircleX", label: "Reject", value: "rejected" },
]

/** T20 screen 3 (01 Capacity hero): decide a request in two steps with evidence. */
export function FinancingReviewSheet({
  blocked,
  item,
  onClose,
  onDone,
  summary,
}: {
  blocked: boolean
  item: FinancingItem
  onClose: () => void
  onDone: () => void
  summary?: FinancingSummary
}) {
  const currencyCode = summary?.currencyCode ?? "NGN"
  const money = formatMoney(item.amount, { currencyCode })
  const approveBlocked = item.blockers.length > 0
  const [decision, setDecision] = useState<ReviewDecision>(approveBlocked ? "under_review" : "approved")
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const dual = Boolean(summary?.requiresDualApproval)
  const command = useCommand(
    (commandId) =>
      reviewFinancingRequest({
        commandId,
        expectedState: item.state,
        loanRequestId: item.id,
        notes: note.trim(),
        status: decision,
      }),
    onDone
  )
  const { step } = command
  const confirming = step !== "form"
  const busy = step === "submitting"
  const firstOfTwo = decision === "approved" && dual && item.approvals.every((a) => a.action !== "approved")
  const label = DECISIONS.find((option) => option.value === decision)!.label
  const result = {
    approved: firstOfTwo
      ? (["success", "First approval recorded", `One more finance approval is needed before ${item.member.name}’s request moves to Disburse.`] as const)
      : (["success", "Request approved", `${money} is reserved for ${item.member.name}. It’s now in Disburse, ready to release.`] as const),
    rejected: ["info", "Request rejected", `${item.member.name} is told it wasn’t approved. Your evidence is saved with the decision.`] as const,
    under_review: ["warning", "Kept under review", `${item.member.name}’s request stays in Needs review with your note.`] as const,
  }[decision]
  return (
    <AppSheet
      dirty={!confirming && Boolean(note.trim())}
      footer={
        step === "success" ? undefined : confirming ? (
          <View className="gap-[10px]">
            {step === "conflict" ? (
              <Button onPress={onClose}>
                <Icon className="size-[18px] text-primary-foreground" name="RefreshCw" />
                <Text>Refresh request</Text>
              </Button>
            ) : (
              <Button
                disabled={blocked}
                loading={busy}
                onPress={() => void command.submit()}
                testID="financing-review-submit"
                variant={decision === "rejected" ? "destructive" : "default"}
              >
                <Text>
                  {step === "error"
                    ? "Try again"
                    : decision === "approved"
                      ? `Approve ${money}`
                      : decision === "rejected"
                        ? "Reject request"
                        : "Keep under review"}
                </Text>
              </Button>
            )}
            <Button disabled={busy} onPress={command.edit} variant="ghost">
              <Text className="text-foreground">Edit decision</Text>
            </Button>
          </View>
        ) : (
          <View className="flex-row items-center gap-[10px]">
            <DevQuickFill
              onPress={() => setNote(mobileDevQuickFill.adminFinancingOperations.reviewNote)}
              placement="footer"
              portal={false}
            />
            <Button
              className="flex-1"
              disabled={blocked}
              onPress={() => {
                const found = evidenceError(note)
                setError(found)
                if (found) return
                Keyboard.dismiss()
                command.setStep("confirm")
              }}
              testID="financing-review-continue"
            >
              <Text>Continue</Text>
            </Button>
          </View>
        )
      }
      headerTrailing={step === "success" ? undefined : confirming ? "2 of 2" : "1 of 2"}
      isSubmitting={busy}
      onBack={confirming && !busy && step !== "success" ? command.edit : undefined}
      onClose={onClose}
      overlay={step === "success" ? <Result description={result[2]} onDone={onClose} title={result[1]} tone={result[0]} /> : undefined}
      overlayActive={step === "success"}
      title={confirming ? "Confirm decision" : "Review request"}
      variant="form"
      visible
    >
      <View className="gap-[16px]">
        {confirming ? (
          <>
            <FailureBanner
              conflict="This request changed while you were reviewing it. Refresh to see where it stands."
              step={step}
            />
            <MiniSummary currencyCode={currencyCode} item={item} />
            <Rows rows={[["Decision", label], ["After this", decisionAfter(decision, item, dual)]]} />
            <Text variant="section">Evidence</Text>
            <Elevated className="rounded-[18px] bg-card p-[14px]" radius={18}>
              <Text className="italic" variant="body">
                “{note.trim()}”
              </Text>
            </Elevated>
            <Hint>
              {decision === "approved"
                ? "Approval reserves cycle capacity. Money is released later from Disburse after a fresh funds check."
                : decision === "rejected"
                  ? "Rejecting releases the reserved capacity back to the cycle."
                  : "The request stays in this lane."}
            </Hint>
          </>
        ) : (
          <>
            <MiniSummary currencyCode={currencyCode} item={item} />
            {approveBlocked ? <StatusBanner kind="stale" title={item.blockers[0]!} /> : null}
            {blocked ? (
              <StatusBanner description="Decisions need a connection." kind="offline" title="Offline" />
            ) : null}
            <Text variant="section">Decision</Text>
            <View className="gap-[8px]" accessibilityRole="radiogroup">
              {DECISIONS.map((option) => {
                const disabled = option.value === "approved" && approveBlocked
                return (
                  <Option
                    description={
                      disabled
                        ? `Unavailable: ${item.blockers[0]!.replace(/\.$/, "").toLowerCase()}`
                        : option.description(item, money)
                    }
                    destructive={option.value === "rejected"}
                    disabled={disabled}
                    icon={option.icon}
                    key={option.value}
                    label={option.label}
                    onPress={() => setDecision(option.value)}
                    selected={decision === option.value}
                  />
                )
              })}
            </View>
            <Evidence
              error={error}
              label="What supports this decision"
              onChange={(value) => {
                setNote(value)
                setError(null)
              }}
              placeholder="What did you check? For example guarantor calls or a salary slip."
              value={note}
            />
          </>
        )}
      </View>
    </AppSheet>
  )
}

/** T20 screen 4 (01 Capacity hero): release approved financing in two steps. */
export function FinancingDisburseSheet({
  blocked,
  item,
  onClose,
  onDone,
  summary,
}: {
  blocked: boolean
  item: FinancingItem
  onClose: () => void
  onDone: () => void
  summary?: FinancingSummary
}) {
  const currencyCode = summary?.currencyCode ?? "NGN"
  const money = formatMoney(item.amount, { currencyCode })
  const [custom, setCustom] = useState(false)
  const [date, setDate] = useState<string | null>(null)
  const today = todayDateOnly()
  const command = useCommand(
    (commandId) =>
      disburseFinancing({
        commandId,
        expectedState: item.state,
        firstRepaymentDueAt: custom ? date : null,
        loanId: item.loanId ?? item.id,
      }),
    onDone
  )
  const { step } = command
  const confirming = step !== "form"
  const busy = step === "submitting"
  const approvers = [...new Set(item.approvals.filter((a) => a.action === "approved").map((a) => a.actorName))]
  const first = custom && date ? date : null
  const dueText = first
    ? new Date(`${first}T00:00:00.000Z`).toLocaleDateString("en-NG", { day: "numeric", month: "short", timeZone: "UTC", year: "numeric" })
    : "Scheduled date"
  return (
    <AppSheet
      footer={
        step === "success" ? undefined : confirming ? (
          <View className="gap-[10px]">
            {step === "funds" ? (
              <Button onPress={onClose}>
                <Text>Back to release</Text>
              </Button>
            ) : (
              <Button
                disabled={blocked}
                loading={busy}
                onPress={() => void command.submit()}
                testID="financing-disburse-submit"
              >
                {busy ? null : <Icon className="size-[18px] text-primary-foreground" name="Send" />}
                <Text>{step === "error" ? "Try again" : `Disburse ${money}`}</Text>
              </Button>
            )}
            {step === "funds" ? null : (
              <Button disabled={busy} onPress={command.edit} variant="ghost">
                <Text className="text-foreground">Change date</Text>
              </Button>
            )}
          </View>
        ) : (
          <View className="flex-row items-center gap-[10px]">
            <DevQuickFill
              onPress={() => {
                setCustom(true)
                setDate(addMonthsDateOnly(today, 1))
              }}
              placement="footer"
              portal={false}
            />
            <Button
              className="flex-1"
              disabled={blocked || (custom && !date)}
              onPress={() => command.setStep("confirm")}
              testID="financing-disburse-continue"
            >
              <Text>Continue</Text>
            </Button>
          </View>
        )
      }
      headerTrailing={step === "success" ? undefined : confirming ? "2 of 2" : "1 of 2"}
      isSubmitting={busy}
      onBack={confirming && !busy && step !== "success" ? command.edit : undefined}
      onClose={onClose}
      overlay={
        step === "success" ? (
          <Result
            description={`${item.member.name}’s ${first ? `first repayment is due ${dueText}` : "repayments follow the schedule"}. The ledger and repayment schedule are updated.`}
            onDone={onClose}
            title={`${money} disbursed`}
            tone="success"
          />
        ) : undefined
      }
      overlayActive={step === "success"}
      title={confirming ? "Confirm release" : "Disburse"}
      variant="form"
      visible
    >
      <View className="gap-[16px]">
        {confirming ? (
          <>
            <FailureBanner
              conflict="This release changed while you had it open. Refresh to see where it stands."
              funds="Nothing was released. Deployable funds dropped below this amount."
              step={step}
            />
            <Rows
              rows={[
                ["Member", `${item.member.name} · ${item.member.number}`],
                ["Release", money],
                ["First repayment", dueText],
                ["Repayments", `${item.termMonths} monthly`],
              ]}
            />
            <Hint>We check deployable funds again the moment you confirm. If they’ve dropped, nothing is released.</Hint>
          </>
        ) : (
          <>
            <Elevated className="gap-[6px] rounded-[20px] bg-card p-[16px]" radius={20}>
              <Text className="text-muted-foreground" variant="label">
                Release to {item.member.name}
              </Text>
              <Text variant="hero">{money}</Text>
              <Text className="text-muted-foreground" variant="small">
                {item.productName} · {item.termMonths} months
                {approvers.length ? ` · approved by ${approvers.join(" and ")}` : ""}
              </Text>
            </Elevated>
            {blocked ? (
              <StatusBanner description="Releases need a connection." kind="offline" title="Offline" />
            ) : null}
            <Text variant="section">First repayment</Text>
            <View className="gap-[8px]">
              <Option
                description="Set by the repayment schedule"
                icon="Calendar"
                label="Scheduled date"
                onPress={() => setCustom(false)}
                selected={!custom}
              />
              <Option
                description={date && custom ? dueText : "Pick a day"}
                icon="CalendarDays"
                label="Choose another date"
                onPress={() => setCustom(true)}
                selected={custom}
              />
            </View>
            {custom ? (
              <FormField label="First repayment date">
                <DateField
                  maximumDate={addMonthsDateOnly(today, 3)}
                  minimumDate={today}
                  onChange={setDate}
                  sheetTitle="First repayment"
                  testID="financing-disburse-date"
                  value={date}
                />
              </FormField>
            ) : null}
            <Hint>{`${item.termMonths} monthly repayments follow from this date.`}</Hint>
          </>
        )}
      </View>
    </AppSheet>
  )
}

const TARGET_COPY: Record<CycleTarget, [string, string, string]> = {
  closed: ["Close cycle", "Lock", "Ends intake for good. This can’t be undone."],
  open: ["Resume intake", "RotateCw", "Members can send requests again against the same snapshot."],
  paused: ["Pause intake", "CirclePause", "Members can’t send new requests. Reviews and releases continue."],
}

/** T20 screen 5 (01 Capacity hero): open, pause, resume or close the cycle with a reason. */
export function FinancingCycleSheet({
  blocked,
  onClose,
  onDone,
  summary,
}: {
  blocked: boolean
  onClose: () => void
  onDone: () => void
  summary: FinancingSummary
}) {
  const { cycle, currencyCode } = summary
  const month = cycleMonth(cycle)
  const state = cycleState(cycle)
  const missing = state === "missing" || state === "draft"
  const targets = cycleTargets(state)
  const [target, setTarget] = useState<CycleTarget | null>(missing ? "open" : null)
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [confirmClose, setConfirmClose] = useState(false)
  const command = useCommand(
    (commandId) =>
      updateFinancingCycle({
        commandId,
        expectedState: state,
        financingCycleId: cycle.id,
        status: target!,
        statusNote: note.trim(),
      }),
    onDone
  )
  const { step } = command
  const confirming = step !== "form"
  const busy = step === "submitting"
  const money = (value: number) => formatCompactMoney(value, currencyCode)
  const copy = (value: CycleTarget) =>
    value === "open" && missing
      ? (["Open cycle", "RotateCw", `Start ${month} intake with a ${money(cycle.totalCapacityAmount)} capacity snapshot.`] as const)
      : TARGET_COPY[value]
  const success = target
    ? {
        closed: ["info", `${month} cycle closed`, "New requests open with the next cycle. Requests in review stay in review."] as const,
        open: ["success", missing ? `${month} cycle opened` : "Intake resumed", missing ? `Members can request financing against a ${money(cycle.totalCapacityAmount)} capacity snapshot.` : "Members can send financing requests again."] as const,
        paused: ["warning", "Intake paused", "Members can’t send new financing requests. Its capacity snapshot is unchanged."] as const,
      }[target]
    : null
  const status: ReactNode = (
    <Elevated className="gap-[8px] rounded-[20px] bg-card p-[16px]" radius={20}>
      <View className="flex-row items-center justify-between">
        <Text variant="label">{cycleLabel(state)}</Text>
        <Text className="text-muted-foreground" variant="caption">
          {new Date(cycle.periodStart).toLocaleDateString("en-NG", { day: "numeric", month: "short", timeZone: "UTC" })} –{" "}
          {new Date(cycle.periodEnd).toLocaleDateString("en-NG", { day: "numeric", month: "short", timeZone: "UTC", year: "numeric" })}
        </Text>
      </View>
      <Text variant="title">
        {missing ? `${money(cycle.totalCapacityAmount)} capacity to open` : `${money(leftToFinance(cycle))} left of ${money(cycle.totalCapacityAmount)}`}
      </Text>
    </Elevated>
  )
  return (
    <>
      <AppSheet
        dirty={!confirming && Boolean(note.trim())}
        footer={
          step === "success" ? undefined : confirming ? (
            <View className="gap-[10px]">
              <Button
                disabled={blocked}
                loading={busy}
                onPress={() => (target === "closed" ? setConfirmClose(true) : void command.submit())}
                testID="financing-cycle-submit"
                variant={target === "closed" ? "destructive" : "default"}
              >
                <Text>{step === "error" ? "Try again" : target ? copy(target)[0] : ""}</Text>
              </Button>
              <Button disabled={busy} onPress={command.edit} variant="ghost">
                <Text className="text-foreground">Edit</Text>
              </Button>
            </View>
          ) : (
            <View className="flex-row items-center gap-[10px]">
              <DevQuickFill
                onPress={() => setNote(mobileDevQuickFill.adminFinancingOperations.cycleNote)}
                placement="footer"
                portal={false}
              />
              <Button
                className="flex-1"
                disabled={blocked || !target}
                onPress={() => {
                  const found = evidenceError(note)
                  setError(found)
                  if (found) return
                  Keyboard.dismiss()
                  command.setStep("confirm")
                }}
                testID="financing-cycle-continue"
                variant={target === "closed" ? "destructive" : "default"}
              >
                <Text>{target === "closed" ? "Continue to close" : "Continue"}</Text>
              </Button>
            </View>
          )
        }
        headerTrailing={step === "success" || !target ? undefined : confirming ? "2 of 2" : "1 of 2"}
        isSubmitting={busy}
        onBack={confirming && !busy && step !== "success" ? command.edit : undefined}
        onClose={onClose}
        overlay={
          step === "success" && success ? (
            <Result description={success[2]} onDone={onClose} title={success[1]} tone={success[0]} />
          ) : undefined
        }
        overlayActive={step === "success" || confirmClose}
        title={confirming ? "Confirm change" : `${month} cycle`}
        variant="form"
        visible
      >
        <View className="gap-[16px]">
          {confirming && target ? (
            <>
              <FailureBanner conflict="The cycle changed while you had it open. Close this and check it again." step={step} />
              <Rows
                rows={[
                  ["Cycle", month],
                  ["Now", cycleLabel(state)],
                  ["Changes to", { closed: "Closed", open: "Open", paused: "Paused" }[target]],
                ]}
              />
              <Text variant="section">Reason</Text>
              <Elevated className="rounded-[18px] bg-card p-[14px]" radius={18}>
                <Text className="italic" variant="body">
                  “{note.trim()}”
                </Text>
              </Elevated>
              <Hint>{copy(target)[2]}</Hint>
            </>
          ) : (
            <>
              {status}
              {blocked ? (
                <StatusBanner description="Cycle changes need a connection." kind="offline" title="Offline" />
              ) : null}
              <Text variant="section">Change</Text>
              <View className="gap-[8px]">
                {targets.map((value) => {
                  const [label, icon, description] = copy(value)
                  return (
                    <Option
                      description={description}
                      destructive={value === "closed"}
                      icon={icon}
                      key={value}
                      label={label}
                      onPress={() => setTarget(value)}
                      selected={target === value}
                    />
                  )
                })}
              </View>
              {target ? (
                <Evidence
                  error={error}
                  label="Reason for the record"
                  onChange={(value) => {
                    setNote(value)
                    setError(null)
                  }}
                  placeholder="Why is the cycle changing? Members don’t see this."
                  value={note}
                />
              ) : null}
            </>
          )}
        </View>
      </AppSheet>
      <ConfirmSheet
        cancelLabel="Cancel"
        confirmLabel="Close cycle"
        description={`Members can’t request financing until the next cycle opens. Requests already in review stay in review. This can’t be undone.`}
        icon="Lock"
        isConfirming={busy}
        onCancel={() => setConfirmClose(false)}
        onConfirm={() => {
          setConfirmClose(false)
          void command.submit()
        }}
        title={`Close the ${month} cycle?`}
        tone="destructive"
        visible={confirmClose}
      />
    </>
  )
}
