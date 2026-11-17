import { AppSheet } from "@/components/app/app-sheet"
import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { Button } from "@/components/ui/button"
import { DateField } from "@/components/ui/date-field"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Elevated } from "@/components/ui/list-card"
import { MoneyField } from "@/components/ui/money-field"
import { SelectField } from "@/components/ui/select-field"
import { StatusBanner } from "@/components/ui/status-banner"
import { Text } from "@/components/ui/text"
import {
  mobileDevQuickFill,
  mobileDevQuickFillReference,
} from "@/dev/mobile-dev-quick-fill"
import { createClientSubmissionKey } from "@/lib/client-submission-key"
import { todayDateOnly } from "@/lib/date-only"
import { useMobileFormDraft } from "@/hooks/use-mobile-form-draft"
import { useState, type ReactNode } from "react"
import { View } from "react-native"
import {
  recordContributionPayment,
  updateAllocationPreference,
} from "../api/admin-contribution-operations-api"
import {
  formatCurrency,
  formatDate,
} from "../lib/admin-contribution-presentation"
import type {
  AllocationPreference,
  ContributionMemberWorkspace,
} from "../model/admin-contribution-operations-types"
import {
  allocationLabel,
  allocationOptions,
  paymentTotal,
  splitFinancingPayment,
  validatePayment,
  type PaymentDraft,
} from "../model/contribution-forms"
import { ContributionMemberSummary } from "./contribution-member-summary"
import type { ContributionReview } from "./contribution-review-sheet"

function Group({ children }: { children: ReactNode }) {
  return (
    <Elevated className="gap-[14px] rounded-[20px] bg-card p-[16px]" radius={20}>
      {children}
    </Elevated>
  )
}

/**
 * T18 screen 5 (01 Large title): record one member payment. Allocation
 * lives here (it was on Set plan); a change is saved before the payment.
 * "Financing payment" shows only with active financing and splits into
 * scheduled servicing (up to the amount due) and early payoff.
 */
export function PostContributionPaymentSheet({
  blocked,
  currencyCode,
  member,
  onClose,
  onReview,
  reviewActive,
}: {
  blocked: boolean
  currencyCode: string
  member: ContributionMemberWorkspace
  onClose: () => void
  onReview: (review: ContributionReview) => void
  reviewActive: boolean
}) {
  const loan = member.activeLoan
  const hasFinancing = Boolean(loan)
  const initial: PaymentDraft = {
    committed: member.commitmentTarget ? String(member.commitmentTarget) : "",
    financing: loan ? String(loan.estimatedMonthlyServicing || "") : "",
    special: "",
  }
  const [amounts, setAmounts] = useState<PaymentDraft>(initial)
  const [allocation, setAllocation] = useState<AllocationPreference>(
    member.paymentAllocationPreference
  )
  const [postedOn, setPostedOn] = useState(todayDateOnly())
  const [reference, setReference] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [restored, setRestored] = useState(false)
  const draft = { allocation, amounts, postedOn, reference }
  const pristine =
    JSON.stringify(amounts) === JSON.stringify(initial) &&
    allocation === member.paymentAllocationPreference &&
    postedOn === todayDateOnly() &&
    !reference.trim()
  const clearDraft = useMobileFormDraft({
    key: `admin.contributions.payment.${member.id}`,
    onHydrate: (saved: typeof draft) => {
      if (
        JSON.stringify(saved.amounts) === JSON.stringify(initial) &&
        saved.allocation === member.paymentAllocationPreference &&
        !saved.reference.trim()
      )
        return
      setAmounts(saved.amounts)
      setAllocation(saved.allocation)
      setPostedOn(saved.postedOn)
      setReference(saved.reference)
      setRestored(true)
    },
    value: draft,
  })
  const total = paymentTotal(amounts, hasFinancing)

  function setAmount(key: keyof PaymentDraft, raw: string) {
    setAmounts((current) => ({ ...current, [key]: raw }))
    setError(null)
  }

  function review() {
    const checked = validatePayment(amounts, hasFinancing)
    if (!checked.ok) {
      setError(checked.error)
      return
    }
    const split = splitFinancingPayment(
      checked.financing,
      loan?.estimatedMonthlyServicing ?? 0
    )
    const allocationChanged = allocation !== member.paymentAllocationPreference
    const preference = {
      commandId: createClientSubmissionKey(),
      expectedState: member.paymentAllocationPreference,
      memberId: member.id,
      preference: allocation,
    }
    const payment = {
      channel: "manual" as const,
      commandId: createClientSubmissionKey(),
      committedSavingsAmount: checked.committed,
      contributionPlanId: member.activePlanId ?? undefined,
      expectedState: member.workspaceState,
      extraLoanPaymentAmount: split.extraPayoff,
      extraSavingsAmount: checked.special,
      loanId: loan?.id,
      memberId: member.id,
      postedAt: `${postedOn}T00:00:00.000Z`,
      reference: reference.trim() || undefined,
      scheduledLoanServicingAmount: split.scheduled,
      totalAmount: checked.total,
    }
    // The same command ids are reused on retry, so a saved allocation
    // change replays instead of failing its state check.
    const money = formatCurrency(checked.total, currencyCode)
    onReview({
      amount: money,
      busyLabel: "Posting",
      cta: "Post payment",
      failure: "The payment wasn’t posted. Nothing was recorded. Try again.",
      rows: [
        ["Commitment savings", formatCurrency(checked.committed, currencyCode)],
        ["Special savings", formatCurrency(checked.special, currencyCode)],
        ...(hasFinancing
          ? ([
              [
                "Financing payment",
                formatCurrency(checked.financing, currencyCode),
              ],
            ] as const)
          : []),
        [
          "Allocation",
          `${allocationLabel(allocation)}${allocationChanged ? " · changed" : ""}`,
        ],
        ["Posting date", formatDate(payment.postedAt)],
        ...(payment.reference
          ? ([["Reference", payment.reference]] as const)
          : []),
      ],
      run: async () => {
        if (allocationChanged) await updateAllocationPreference(preference)
        await recordContributionPayment(payment)
        await clearDraft()
      },
      sub: `for ${member.name}`,
      success: [
        "Payment posted",
        `${money} posted for ${member.name}. Their statement and the ledger are updated.`,
      ],
      title: "Review payment",
    })
  }

  return (
    <AppSheet
      dirty={!pristine}
      footer={
        <View className="gap-[10px]">
          <View className="flex-row items-center justify-between">
            <Text className="text-muted-foreground" variant="label">
              Total
            </Text>
            <Text testID="contribution-payment-total" variant="money">
              {formatCurrency(total, currencyCode)}
            </Text>
          </View>
          <View className="flex-row items-center gap-[10px]">
            <DevQuickFill
              onPress={() => {
                setAmounts({
                  committed: String(member.commitmentTarget || 25000),
                  financing: loan
                    ? String(loan.estimatedMonthlyServicing || "")
                    : "",
                  special: mobileDevQuickFill.adminContributions.extraSavings,
                })
                setPostedOn(todayDateOnly())
                setReference(mobileDevQuickFillReference("QA-CON"))
              }}
              placement="footer"
              portal={false}
            />
            <Button
              className="flex-1"
              disabled={blocked}
              onPress={review}
              testID="contribution-payment-review"
            >
              <Text>Review payment</Text>
            </Button>
          </View>
        </View>
      }
      onClose={onClose}
      overlayActive={reviewActive}
      title="Record payment"
      variant="form"
      visible
    >
      <View className="gap-[16px]">
        {blocked ? (
          <StatusBanner
            description="Your entries are kept on this phone. Review needs a connection."
            kind="offline"
            title="Offline"
          />
        ) : null}
        {restored ? (
          <StatusBanner
            kind="info"
            onRetry={() => {
              setAmounts(initial)
              setAllocation(member.paymentAllocationPreference)
              setPostedOn(todayDateOnly())
              setReference("")
              setRestored(false)
              void clearDraft()
            }}
            retryLabel="Discard"
            title="Restored your unsent entries."
          />
        ) : null}
        <ContributionMemberSummary
          detail={`${member.number} · ${formatCurrency(member.totalSavings, currencyCode)} saved`}
          name={member.name}
        />
        <FormField label="Allocation">
          <SelectField
            onChange={setAllocation}
            options={allocationOptions}
            sheetTitle="Allocation"
            testID="contribution-payment-allocation"
            value={allocation}
          />
        </FormField>
        <View className="flex-row items-baseline justify-between px-[2px]">
          <Text variant="section">Amounts</Text>
          <Text className="text-muted-foreground" variant="caption">
            {hasFinancing ? "3 parts" : "2 parts"}
          </Text>
        </View>
        {error ? <StatusBanner kind="error" title={error} /> : null}
        <Group>
          <FormField
            helper={
              member.commitmentTarget
                ? `Monthly commitment ${formatCurrency(member.commitmentTarget, currencyCode)}`
                : undefined
            }
            label="Commitment savings"
          >
            <MoneyField
              accessibilityLabel="Commitment savings"
              currencyCode={currencyCode}
              onChangeValue={(raw) => setAmount("committed", raw)}
              testID="contribution-payment-committed-input"
              value={amounts.committed}
            />
          </FormField>
          <FormField label="Special savings">
            <MoneyField
              accessibilityLabel="Special savings"
              currencyCode={currencyCode}
              onChangeValue={(raw) => setAmount("special", raw)}
              testID="contribution-payment-special-input"
              value={amounts.special}
            />
          </FormField>
          {loan ? (
            <FormField
              helper={`${formatCurrency(loan.estimatedMonthlyServicing, currencyCode)} due this month · ${formatCurrency(loan.outstandingPrincipal, currencyCode)} outstanding`}
              label="Financing payment"
            >
              <MoneyField
                accessibilityLabel="Financing payment"
                currencyCode={currencyCode}
                onChangeValue={(raw) => setAmount("financing", raw)}
                testID="contribution-payment-financing-input"
                value={amounts.financing}
              />
            </FormField>
          ) : null}
        </Group>
        <FormField label="Posting date">
          <DateField
            maximumDate={todayDateOnly()}
            onChange={setPostedOn}
            sheetTitle="Posting date"
            testID="contribution-payment-date-input"
            value={postedOn}
          />
        </FormField>
        <FormField label="Reference" optional>
          <Input
            accessibilityLabel="Payment reference"
            onChangeText={setReference}
            placeholder="Bank or receipt reference"
            testID="contribution-payment-reference-input"
            value={reference}
          />
        </FormField>
      </View>
    </AppSheet>
  )
}
