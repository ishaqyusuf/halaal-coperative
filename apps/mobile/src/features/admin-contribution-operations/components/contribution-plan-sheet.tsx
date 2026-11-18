import { AppSheet } from "@/components/app/app-sheet"
import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { Button } from "@/components/ui/button"
import { DateField } from "@/components/ui/date-field"
import { FormField } from "@/components/ui/form-field"
import { MoneyField } from "@/components/ui/money-field"
import { StatusBanner } from "@/components/ui/status-banner"
import { Text } from "@/components/ui/text"
import { mobileDevQuickFill } from "@/dev/mobile-dev-quick-fill"
import { createClientSubmissionKey } from "@/lib/client-submission-key"
import { todayDateOnly } from "@/lib/date-only"
import { useMobileFormDraft } from "@/hooks/use-mobile-form-draft"
import { useState } from "react"
import { View } from "react-native"
import { setContributionPlan } from "../api/admin-contribution-operations-api"
import {
  formatCurrency,
  formatDate,
} from "../lib/admin-contribution-presentation"
import type { ContributionMemberWorkspace } from "../model/admin-contribution-operations-types"
import { validatePlanAmount } from "../model/contribution-forms"
import { ContributionMemberSummary } from "./contribution-member-summary"
import type { ContributionReview } from "./contribution-review-sheet"

/** T18 screen 4 (01 Large title): monthly amount and effective date only. */
export function ContributionPlanSheet({
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
  const initial = member.commitmentTarget ? String(member.commitmentTarget) : ""
  const [amount, setAmount] = useState(initial)
  const [startsAt, setStartsAt] = useState(todayDateOnly())
  const [error, setError] = useState<string | null>(null)
  const [restored, setRestored] = useState(false)
  const active = member.planHistory.find((plan) => plan.isActive)
  const clearDraft = useMobileFormDraft({
    key: `admin.contributions.plan.${member.id}`,
    onHydrate: (draft: { amount: string; startsAt: string }) => {
      if (draft.amount === initial && draft.startsAt === todayDateOnly()) return
      setAmount(draft.amount)
      setStartsAt(draft.startsAt)
      setRestored(true)
    },
    value: { amount, startsAt },
  })
  const dirty = amount !== initial || startsAt !== todayDateOnly()

  function review() {
    const checked = validatePlanAmount(amount)
    setError(checked.error)
    if (!checked.amount) return
    const input = {
      amount: checked.amount,
      commandId: createClientSubmissionKey(),
      expectedState: member.activePlanId ?? "none",
      memberId: member.id,
      startsAt: `${startsAt}T00:00:00.000Z`,
    }
    const money = formatCurrency(checked.amount, currencyCode)
    onReview({
      amount: money,
      busyLabel: "Saving",
      cta: "Save plan",
      failure: "The plan wasn’t saved. The current plan is unchanged. Try again.",
      rows: [
        ["Member", member.name],
        ["Effective", formatDate(input.startsAt)],
        ...(member.commitmentTarget
          ? ([
              [
                "Replaces",
                `${formatCurrency(member.commitmentTarget, currencyCode)} monthly`,
              ],
            ] as const)
          : []),
      ],
      run: async () => {
        await setContributionPlan(input)
        await clearDraft()
      },
      sub: "monthly commitment",
      success: [
        "Plan saved",
        `${member.name} commits ${money} monthly from ${formatDate(input.startsAt)}.`,
      ],
      title: "Review commitment",
    })
  }

  return (
    <AppSheet
      dirty={dirty}
      footer={
        <View className="flex-row items-center gap-[10px]">
          <DevQuickFill
            onPress={() => {
              setAmount(mobileDevQuickFill.adminContributions.commitmentAmount)
              setStartsAt(todayDateOnly())
            }}
            placement="footer"
            portal={false}
          />
          <Button
            className="flex-1"
            disabled={blocked}
            onPress={review}
            testID="contribution-plan-review"
          >
            <Text>Review commitment</Text>
          </Button>
        </View>
      }
      onClose={onClose}
      overlayActive={reviewActive}
      title="Set plan"
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
              setAmount(initial)
              setStartsAt(todayDateOnly())
              setRestored(false)
              void clearDraft()
            }}
            retryLabel="Discard"
            title="Restored your unsent entries."
          />
        ) : null}
        <ContributionMemberSummary
          detail={
            active
              ? `Now ${formatCurrency(active.amount, currencyCode)} monthly since ${formatDate(active.startsAt)}`
              : "No commitment yet"
          }
          name={member.name}
        />
        <FormField
          error={error}
          helper={
            active
              ? "The active commitment closes the day before the new one starts."
              : undefined
          }
          label="Monthly commitment"
        >
          <MoneyField
            accessibilityLabel="Monthly commitment"
            currencyCode={currencyCode}
            onChangeValue={(raw) => {
              setAmount(raw)
              setError(null)
            }}
            testID="contribution-plan-amount-input"
            value={amount}
          />
        </FormField>
        <FormField label="Effective date">
          <DateField
            onChange={setStartsAt}
            sheetTitle="Effective date"
            testID="contribution-plan-date-input"
            value={startsAt}
          />
        </FormField>
      </View>
    </AppSheet>
  )
}
