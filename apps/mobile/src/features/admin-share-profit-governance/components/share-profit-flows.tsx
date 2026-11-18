import { AppSheet } from "@/components/app/app-sheet"
import { ConfirmSheet } from "@/components/app/confirm-sheet"
import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { ResultScreen } from "@/components/app/result-screen"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { Icon } from "@/components/ui/icon"
import { TintedAvatar } from "@/components/ui/list-card"
import { Pressable } from "@/components/ui/pressable"
import { SectionHeader } from "@/components/ui/section-header"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { StatusBanner } from "@/components/ui/status-banner"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import { mobileDevQuickFill } from "@/dev/mobile-dev-quick-fill"
import { createClientSubmissionKey } from "@/lib/client-submission-key"
import { formatMoney } from "@/lib/money"
import { captureMobileError } from "@/lib/sentry"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { useRef, useState } from "react"
import { Keyboard, View } from "react-native"
import {
  approveProfitEntry,
  publishProfitEntry,
  reviewShareApplication,
} from "../api/admin-share-profit-governance-api"
import type {
  ProfitPeriodDetail,
  ShareApplicationDetail,
} from "../model/admin-share-profit-governance-types"
import { clampUnits, evidenceError, holdingAfter } from "../model/share-profit-presentation"
import { Card, KV } from "./share-profit-ui"

type Step = "form" | "review" | "submitting" | "success" | "error" | "conflict"
type Entry = ProfitPeriodDetail["profitEntries"][number]

function isConflict(error: unknown) {
  const code = (error as { data?: { code?: string } })?.data?.code
  const message = error instanceof Error ? error.message : ""
  return code === "CONFLICT" || /changed|already|Refresh and try again/i.test(message)
}

/** Review → submit with one command id per decision, so a retry replays. */
function useDecision(run: (commandId: string) => Promise<unknown>, onDone: () => void) {
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
      captureMobileError(error, "mobile.share_profit_governance")
      setStep(isConflict(error) ? "conflict" : "error")
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

function PhaseBanner({ conflict, onRetry, step }: { conflict: string; onRetry: () => void; step: Step }) {
  if (step === "error")
    return (
      <StatusBanner
        description="Nothing was changed. Check your connection and retry."
        kind="error"
        onRetry={onRetry}
        retryLabel="Retry"
        title="Couldn’t save the decision"
      />
    )
  if (step === "conflict") return <StatusBanner description={conflict} kind="stale" title="Already done elsewhere" />
  return null
}

function Evidence({
  error,
  helper,
  label,
  onChange,
  placeholder,
  value,
}: {
  error: string | null
  helper: string
  label: string
  onChange: (value: string) => void
  placeholder: string
  value: string
}) {
  return (
    <FormField error={error} helper={helper} label={label} trailingLabel={<Text className="text-muted-foreground" variant="caption">Required</Text>}>
      <Textarea
        accessibilityLabel={label}
        maxLength={2000}
        onChangeText={onChange}
        placeholder={placeholder}
        testID="share-profit-evidence-input"
        value={value}
      />
    </FormField>
  )
}

function Result({ children, description, onDone, title }: { children?: React.ReactNode; description: string; onDone: () => void; title: string }) {
  return (
    <View className="absolute inset-0 z-20">
      <ResultScreen
        align="top"
        description={description}
        details={children}
        onDone={onDone}
        primary={{ label: "Done", onPress: onDone }}
        title={title}
        tone="success"
      />
    </View>
  )
}

function EvidenceQuote({ text }: { text: string }) {
  return (
    <View className="gap-[4px] border-t border-border pt-[10px]">
      <Text className="text-muted-foreground" variant="label">
        Evidence
      </Text>
      <Text className="italic" variant="body">
        “{text.trim()}”
      </Text>
    </View>
  )
}

/** T22 screen 3 (03 Lifecycle ledger): approve (all or fewer units) or reject a share request. */
export function ShareReviewSheet({
  blocked,
  currencyCode,
  detail,
  onClose,
  onDone,
}: {
  blocked: boolean
  currencyCode: string
  detail: ShareApplicationDetail
  onClose: () => void
  onDone: () => void
}) {
  const { application, policy, position } = detail
  const unit = application.unitAmountSnapshot || policy.unitAmount
  const [decision, setDecision] = useState<"approved" | "rejected">("approved")
  const [units, setUnits] = useState(application.requestedUnits)
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const approve = decision === "approved"
  const money = formatMoney(units * unit, { currencyCode })
  const after = holdingAfter(position, units)
  const flow = useDecision(
    (commandId) =>
      reviewShareApplication({
        approvedUnits: approve ? units : undefined,
        commandId,
        decision,
        expectedState: "pending",
        memberShareApplicationId: application.id,
        reviewNotes: notes.trim(),
      }),
    onDone
  )
  const { step } = flow
  const reviewing = step !== "form"
  const busy = step === "submitting"
  return (
    <AppSheet
      dirty={!reviewing && Boolean(notes.trim())}
      footer={
        step === "success" ? undefined : reviewing ? (
          step === "conflict" ? (
            <Button onPress={onClose}>
              <Icon className="size-[18px] text-primary-foreground" name="RefreshCw" />
              <Text>Refresh request</Text>
            </Button>
          ) : (
            <Button
              disabled={blocked}
              loading={busy}
              onPress={() => void flow.submit()}
              testID="share-review-submit"
              variant={approve ? "default" : "destructive"}
            >
              <Text>{approve ? `Approve and post ${money}` : "Reject request"}</Text>
            </Button>
          )
        ) : (
          <View className="flex-row items-center gap-[10px]">
            <DevQuickFill
              onPress={() => setNotes(mobileDevQuickFill.adminShareProfitGovernance.shareReviewNotes)}
              placement="footer"
              portal={false}
            />
            <Button
              className="flex-1"
              disabled={blocked}
              onPress={() => {
                const found = evidenceError(notes)
                setError(found)
                if (found) return
                Keyboard.dismiss()
                flow.setStep("review")
              }}
              testID="share-review-continue"
            >
              <Text>Continue to review</Text>
            </Button>
          </View>
        )
      }
      headerTrailing={step === "success" ? undefined : reviewing ? "2 of 2" : "1 of 2"}
      isSubmitting={busy}
      onBack={reviewing && !busy && step !== "success" ? flow.edit : undefined}
      onClose={onClose}
      overlay={
        step === "success" ? (
          <Result
            description={
              approve
                ? `${units} units for ${application.memberName} are posted to share capital.`
                : `${application.memberName}’s request is closed. No share capital was posted.`
            }
            onDone={onClose}
            title={approve ? "Share capital posted" : "Request rejected"}
          />
        ) : undefined
      }
      overlayActive={step === "success"}
      title="Review share request"
      variant="form"
      visible
    >
      <View className="gap-[16px]">
        {reviewing ? (
          <>
            <PhaseBanner
              conflict={`${application.memberName}’s request was already reviewed. Refresh to see the decision.`}
              onRetry={() => void flow.submit()}
              step={step}
            />
            <Text className="text-muted-foreground" variant="body">
              Check the decision. {approve ? "Approving posts share capital straight away." : "The member is told the request was not approved."}
            </Text>
            <Card>
              <KV label="Member" value={`${application.memberName} · ${application.memberNumber}`} />
              <KV label="Decision" value={approve ? "Approve" : "Reject"} />
              {approve ? (
                <>
                  <KV label="Units" value={`${units} of ${application.requestedUnits} requested`} />
                  {after !== null ? <KV label="Holding after" value={`${after} of ${policy.maximumShareUnits} units`} /> : null}
                  <KV label="Posts to share capital" tone="total" value={money} />
                </>
              ) : (
                <KV label="Share capital" value="Nothing posted" />
              )}
              <EvidenceQuote text={notes} />
            </Card>
          </>
        ) : (
          <>
            <Card>
              <View className="flex-row items-center gap-[12px]">
                <TintedAvatar name={application.memberName} />
                <View className="min-w-0 flex-1">
                  <Text className="font-bold" numberOfLines={1} variant="body">
                    {application.memberName}
                  </Text>
                  <Text className="text-muted-foreground" variant="small">
                    {application.memberNumber} · {application.requestedUnits} units
                  </Text>
                </View>
                <Text variant="money">{formatMoney(application.requestedUnits * unit, { currencyCode })}</Text>
              </View>
            </Card>
            {blocked ? <StatusBanner description="Decisions need a connection." kind="offline" title="Offline" /> : null}
            <FormField label="Decision">
              <SegmentedControl
                accessibilityLabel="Decision"
                onChange={(value) => setDecision(value)}
                options={[
                  { label: "Approve", value: "approved" },
                  { label: "Reject", value: "rejected" },
                ]}
                value={decision}
              />
            </FormField>
            {approve ? (
              <FormField
                helper={
                  units < application.requestedUnits
                    ? `Approving ${units} of ${application.requestedUnits} units. The rest is declined.`
                    : undefined
                }
                label="Units to approve"
                trailingLabel={<Text className="text-muted-foreground" variant="caption">Up to {application.requestedUnits}</Text>}
              >
                <View className="flex-row items-center justify-between rounded-[14px] border border-input bg-card px-[6px] py-[6px]">
                  <Pressable
                    accessibilityLabel="Fewer units"
                    accessibilityRole="button"
                    className="size-[44px] items-center justify-center rounded-[12px]"
                    disabled={units <= 1}
                    onPress={() => setUnits((value) => clampUnits(value - 1, application.requestedUnits))}
                  >
                    <Icon className={units <= 1 ? "size-[20px] text-muted-foreground" : "size-[20px] text-primary"} name="Minus" />
                  </Pressable>
                  <View className="items-center">
                    <Text variant="title">{units}</Text>
                    <Text className="text-muted-foreground" variant="caption">
                      {money}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityLabel="More units"
                    accessibilityRole="button"
                    className="size-[44px] items-center justify-center rounded-[12px]"
                    disabled={units >= application.requestedUnits}
                    onPress={() => setUnits((value) => clampUnits(value + 1, application.requestedUnits))}
                  >
                    <Icon
                      className={units >= application.requestedUnits ? "size-[20px] text-muted-foreground" : "size-[20px] text-primary"}
                      name="Plus"
                    />
                  </Pressable>
                </View>
              </FormField>
            ) : null}
            <Evidence
              error={error}
              helper="Saved with the decision for the audit trail."
              label="Evidence"
              onChange={(value) => {
                setNotes(value)
                setError(null)
              }}
              placeholder={approve ? "e.g. Payment matched in the bank statement; within the unit cap." : "e.g. No matching payment found."}
              value={notes}
            />
          </>
        )}
      </View>
    </AppSheet>
  )
}

/** T22 screen 6 (03 Lifecycle ledger): approve a reviewed profit entry with evidence. */
export function ApproveEntrySheet({
  blocked,
  currencyCode,
  entry,
  onClose,
  onDone,
  periodName,
}: {
  blocked: boolean
  currencyCode: string
  entry: Entry
  onClose: () => void
  onDone: () => void
  periodName: string
}) {
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const flow = useDecision(
    (commandId) =>
      approveProfitEntry({ commandId, expectedState: "reviewed", notes: notes.trim(), profitEntryId: entry.id }),
    onDone
  )
  const { step } = flow
  const reviewing = step !== "form"
  const busy = step === "submitting"
  const money = (value: number) => formatMoney(value, { currencyCode })
  const lines = (
    <>
      <KV label="Business" value={entry.businessName} />
      <KV label="Period" value={periodName} />
      <KV label="Gross profit" value={money(entry.profitAmount)} />
      <KV label="Expenses" tone="negative" value={`−${money(entry.expenseAmount)}`} />
      <KV label="Allocations" value={`${entry.allocationCount} members · reconcile`} />
      <KV label="Distributable" tone="total" value={money(entry.allocatableProfit)} />
    </>
  )
  return (
    <AppSheet
      dirty={!reviewing && Boolean(notes.trim())}
      footer={
        step === "success" ? undefined : reviewing ? (
          step === "conflict" ? (
            <Button onPress={onClose}>
              <Icon className="size-[18px] text-primary-foreground" name="RefreshCw" />
              <Text>Refresh entry</Text>
            </Button>
          ) : (
            <Button disabled={blocked} loading={busy} onPress={() => void flow.submit()} testID="approve-entry-submit">
              <Text>Approve entry</Text>
            </Button>
          )
        ) : (
          <View className="flex-row items-center gap-[10px]">
            <DevQuickFill
              onPress={() => setNotes(mobileDevQuickFill.adminShareProfitGovernance.profitApprovalNotes)}
              placement="footer"
              portal={false}
            />
            <Button
              className="flex-1"
              disabled={blocked}
              onPress={() => {
                const found = evidenceError(notes)
                setError(found)
                if (found) return
                Keyboard.dismiss()
                flow.setStep("review")
              }}
              testID="approve-entry-continue"
            >
              <Text>Continue to review</Text>
            </Button>
          </View>
        )
      }
      headerTrailing={step === "success" ? undefined : reviewing ? "2 of 2" : "1 of 2"}
      isSubmitting={busy}
      onBack={reviewing && !busy && step !== "success" ? flow.edit : undefined}
      onClose={onClose}
      overlay={
        step === "success" ? (
          <Result
            description={`${entry.businessName} is approved and ready to publish to members.`}
            onDone={onClose}
            title="Entry approved"
          />
        ) : undefined
      }
      overlayActive={step === "success"}
      title="Approve profit entry"
      variant="form"
      visible
    >
      <View className="gap-[16px]">
        {reviewing ? (
          <>
            <PhaseBanner
              conflict={`${entry.businessName} was already approved. Refresh to see it.`}
              onRetry={() => void flow.submit()}
              step={step}
            />
            <Text className="text-muted-foreground" variant="body">
              Approving doesn’t pay anything yet. Members see this profit only after you publish it.
            </Text>
            <Card>
              {lines}
              <EvidenceQuote text={notes} />
            </Card>
          </>
        ) : (
          <>
            <Card>{lines}</Card>
            {blocked ? <StatusBanner description="Approvals need a connection." kind="offline" title="Offline" /> : null}
            <Evidence
              error={error}
              helper="Saved with the approval for the audit trail."
              label="Approval evidence"
              onChange={(value) => {
                setNotes(value)
                setError(null)
              }}
              placeholder="e.g. Receipts checked against the ledger; allocations reconcile."
              value={notes}
            />
          </>
        )}
      </View>
    </AppSheet>
  )
}

/** T22 screen 7 (01 Brand hero): review what members will see, then a destructive confirm. */
export function PublishProfitSheet({
  blocked,
  currencyCode,
  entry,
  onClose,
  onDone,
  periodName,
}: {
  blocked: boolean
  currencyCode: string
  entry: Entry
  onClose: () => void
  onDone: () => void
  periodName: string
}) {
  const [confirm, setConfirm] = useState(false)
  const flow = useDecision(
    (commandId) => publishProfitEntry({ commandId, expectedState: "approved", profitEntryId: entry.id }),
    onDone
  )
  const { step } = flow
  const busy = step === "submitting"
  const money = formatMoney(entry.allocatableProfit, { currencyCode })
  return (
    <>
      <AppSheet
        footer={
          step === "success" ? undefined : step === "conflict" ? (
            <Button onPress={onClose}>
              <Icon className="size-[18px] text-primary-foreground" name="RefreshCw" />
              <Text>Refresh entry</Text>
            </Button>
          ) : (
            <Button disabled={blocked} loading={busy} onPress={() => setConfirm(true)} testID="publish-profit-review">
              {busy ? null : <Icon className="size-[18px] text-primary-foreground" name="Send" />}
              <Text>Publish {money}</Text>
            </Button>
          )
        }
        headerTrailing={step === "success" ? undefined : "Review"}
        isSubmitting={busy}
        onClose={onClose}
        overlay={
          step === "success" ? (
            <Result
              description={`${money} from ${entry.businessName} is now visible to ${entry.allocationCount} members.`}
              onDone={onClose}
              title="Profit published"
            />
          ) : undefined
        }
        overlayActive={step === "success" || confirm}
        title="Publish profit"
        variant="form"
        visible
      >
        <View className="gap-[16px]">
          <PhaseBanner
            conflict={`${entry.businessName} was already published. Refresh to see it.`}
            onRetry={() => setConfirm(true)}
            step={step}
          />
          <View className="gap-[4px] rounded-[24px] bg-primary px-[18px] py-[18px]">
            <Text className="text-primary-foreground/80" variant="label">
              Publishing to {entry.allocationCount} members
            </Text>
            <Text className="text-primary-foreground" variant="hero">
              {money}
            </Text>
            <Text className="text-primary-foreground/80" variant="small">
              {entry.businessName} · {periodName}
            </Text>
          </View>
          <SectionHeader title="What members will see" value={`Top 3 of ${entry.allocationCount}`} />
          <Card className="gap-[12px]">
            {entry.allocations.slice(0, 3).map((allocation) => (
              <View className="flex-row items-center gap-[10px]" key={allocation.id}>
                <TintedAvatar name={allocation.member.fullName} size={40} />
                <View className="min-w-0 flex-1">
                  <Text className="font-bold" numberOfLines={1} variant="body">
                    {allocation.member.fullName}
                  </Text>
                  <Text className="text-muted-foreground" variant="small">
                    {allocation.member.memberNumber} · {(allocation.sharePercentage * 100).toFixed(2)}%
                  </Text>
                </View>
                <Text variant="money">{formatMoney(allocation.allocatedProfitAmount, { currencyCode })}</Text>
              </View>
            ))}
          </Card>
          <SectionHeader title="Before you publish" />
          <Card>
            {[
              "Approved and ready to publish",
              `Allocations reconcile to ${money}`,
              "Members are notified in the app",
            ].map((line) => (
              <View className="flex-row items-center gap-[10px]" key={line}>
                <Icon className="size-[18px] text-primary" name="CircleCheck" />
                <Text className="flex-1" variant="body">
                  {line}
                </Text>
              </View>
            ))}
          </Card>
          <StatusBanner
            description="Allocations become member dividend records."
            kind="stale"
            title="Publishing can’t be undone"
          />
        </View>
      </AppSheet>
      <ConfirmSheet
        cancelLabel="Cancel"
        confirmLabel="Publish profit"
        description={`This can’t be undone. Members see their share of ${entry.businessName} profit straight away.`}
        icon="Send"
        isConfirming={busy}
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false)
          void flow.submit()
        }}
        title={`Publish ${money} to ${entry.allocationCount} members?`}
        tone="destructive"
        visible={confirm}
      />
    </>
  )
}
