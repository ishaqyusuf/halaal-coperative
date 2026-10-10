import { CalendarDateField } from "@/components/app/calendar-date-field"
import { CalendarPickerSheet } from "@/components/app/calendar-picker-sheet"
import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { FormStateBanner } from "@/components/app/form-state-banner"
import { FullScreenFormSheet } from "@/components/app/full-screen-form-sheet"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Text } from "@/components/ui/text"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { todayDateOnly } from "@/lib/date-only"
import { View } from "react-native"

import { formatCurrency } from "../lib/admin-contribution-presentation"
import type { ContributionMemberWorkspace } from "../model/admin-contribution-operations-types"

function FieldLabel({ children }: { children: string }) {
  return (
    <Text className="text-sm font-semibold text-foreground">{children}</Text>
  )
}

function SubmitError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <View className="bg-destructive/10 px-3 py-2">
      <Text className="text-sm leading-5 text-destructive">{message}</Text>
    </View>
  )
}

function Initials({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")

  return (
    <View className="size-11 items-center justify-center rounded-xl bg-card">
      <Text className="text-brand-surface text-xs font-extrabold">
        {initials}
      </Text>
    </View>
  )
}

function AmountField({
  accessibilityLabel,
  currencySymbol,
  label,
  onChangeText,
  testID,
  value,
}: {
  accessibilityLabel: string
  label: string
  onChangeText: (value: string) => void
  testID: string
  value: string
  currencySymbol?: string
}) {
  return (
    <View className="min-w-0 flex-1 gap-2">
      <FieldLabel>{label}</FieldLabel>
      <Input
        accessibilityLabel={accessibilityLabel}
        keyboardType="decimal-pad"
        leading={
          <Text className="text-base font-bold text-muted-foreground">
            {currencySymbol}
          </Text>
        }
        onChangeText={onChangeText}
        placeholder="0"
        testID={testID}
        value={value}
      />
    </View>
  )
}

export function PostContributionPaymentSheet({
  calendarVisible,
  committedAmount,
  currencyCode,
  extraPayoff,
  extraSavings,
  hasDraft,
  isStale,
  isWritable,
  isSubmitting,
  reviewVisible,
  member,
  onClose,
  onCloseCalendar,
  onOpenCalendar,
  onQuickFill,
  onReview,
  onSetCommittedAmount,
  onSetExtraPayoff,
  onSetExtraSavings,
  onSetPaymentDate,
  onSetPaymentReference,
  onSetScheduledServicing,
  paymentDate,
  paymentReference,
  scheduledServicing,
  submitError,
  total,
  visible,
}: {
  calendarVisible: boolean
  committedAmount: string
  currencyCode: string
  extraPayoff: string
  extraSavings: string
  hasDraft: boolean
  isStale: boolean
  isWritable: boolean
  isSubmitting: boolean
  reviewVisible: boolean
  member: ContributionMemberWorkspace | null
  onClose: () => void
  onCloseCalendar: () => void
  onOpenCalendar: () => void
  onQuickFill: () => void
  onReview: () => void
  onSetCommittedAmount: (value: string) => void
  onSetExtraPayoff: (value: string) => void
  onSetExtraSavings: (value: string) => void
  onSetPaymentDate: (value: string) => void
  onSetPaymentReference: (value: string) => void
  onSetScheduledServicing: (value: string) => void
  paymentDate: string
  paymentReference: string
  scheduledServicing: string
  submitError: string | null
  total: number
  visible: boolean
}) {
  const largeTextLayout = useLargeTextLayout()
  const currencySymbol =
    new Intl.NumberFormat("en-NG", {
      currency: currencyCode,
      style: "currency",
    })
      .formatToParts(0)
      .find((part) => part.type === "currency")?.value ?? currencyCode

  return (
    <FullScreenFormSheet
      dirty={hasDraft}
      isSubmitting={isSubmitting}
      footer={
        <View className="flex-row items-center gap-3">
          <DevQuickFill
            onPress={onQuickFill}
            placement="footer"
            portal={false}
          />
          <Button
            accessibilityLabel={`Review payment, ${formatCurrency(total, currencyCode)}`}
            className="min-h-12 min-w-0 flex-1 py-2"
            disabled={!isWritable || isSubmitting || total <= 0}
            onPress={onReview}
          >
            <Icon className="size-sm text-primary-foreground" name="Check" />
            <View className="min-w-0 items-center">
              <Text>Review payment</Text>
              {total > 0 ? (
                <Text className="text-[10px] text-primary-foreground/70">
                  {formatCurrency(total, currencyCode)}
                </Text>
              ) : null}
            </View>
          </Button>
        </View>
      }
      onClose={onClose}
      overlay={
        <CalendarPickerSheet
          label="Posting date"
          maximumDate={todayDateOnly()}
          onChange={onSetPaymentDate}
          onClose={onCloseCalendar}
          testID="contribution-payment-date-calendar"
          value={paymentDate}
          visible={calendarVisible}
        />
      }
      overlayActive={calendarVisible || reviewVisible}
      title="Post contribution"
      visible={visible}
    >
      <FormStateBanner hasDraft={hasDraft} isStale={isStale} />
      <SubmitError message={submitError} />

      {member ? (
        <View className="bg-brand-surface -mx-5 -mt-5 overflow-hidden px-5 py-4">
          <View className="bg-brand-warm/15 absolute -right-10 -bottom-16 size-36 rounded-full" />
          <View className="flex-row items-center gap-3">
            <Initials name={member.name} />
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-brand-surface-foreground text-base font-extrabold">
                {member.name}
              </Text>
              <Text className="text-brand-surface-foreground/75 text-xs">
                {member.number} · Monthly target{" "}
                {formatCurrency(member.commitmentTarget, currencyCode)}
              </Text>
            </View>
            <View className="bg-success size-2 rounded-full" />
          </View>
        </View>
      ) : null}

      <View className="gap-4 border-b border-border pb-5">
        <View className="flex-row items-baseline justify-between gap-3">
          <Text className="text-base font-extrabold text-foreground">
            Savings allocation
          </Text>
          <Text className="text-sm font-extrabold text-accent-foreground">
            {formatCurrency(
              (Number(committedAmount.replace(/,/g, "")) || 0) +
                (Number(extraSavings.replace(/,/g, "")) || 0),
              currencyCode
            )}
          </Text>
        </View>
        <View className={largeTextLayout ? "gap-4" : "flex-row gap-3"}>
          <AmountField
            accessibilityLabel="Commitment savings"
            label="Commitment savings"
            currencySymbol={currencySymbol}
            onChangeText={onSetCommittedAmount}
            testID="contribution-payment-commitment-input"
            value={committedAmount}
          />
          <AmountField
            accessibilityLabel="Special savings"
            label="Special savings"
            currencySymbol={currencySymbol}
            onChangeText={onSetExtraSavings}
            testID="contribution-payment-special-input"
            value={extraSavings}
          />
        </View>
      </View>

      {member?.activeLoan ? (
        <View className="gap-4 border-b border-border pb-5">
          <View className="flex-row items-baseline justify-between gap-3">
            <Text className="text-base font-extrabold text-foreground">
              Loan payment
            </Text>
            <Text className="text-xs text-muted-foreground">
              Scheduled{" "}
              {formatCurrency(
                member.activeLoan.estimatedMonthlyServicing,
                currencyCode
              )}
            </Text>
          </View>
          <View className={largeTextLayout ? "gap-4" : "flex-row gap-3"}>
            <AmountField
              accessibilityLabel="Scheduled servicing"
              label="Scheduled servicing"
              currencySymbol={currencySymbol}
              onChangeText={onSetScheduledServicing}
              testID="contribution-payment-servicing-input"
              value={scheduledServicing}
            />
            <AmountField
              accessibilityLabel="Extra payoff"
              label="Extra payoff"
              currencySymbol={currencySymbol}
              onChangeText={onSetExtraPayoff}
              testID="contribution-payment-payoff-input"
              value={extraPayoff}
            />
          </View>
        </View>
      ) : null}

      <View className="gap-4">
        <Text className="text-base font-extrabold text-foreground">
          Payment details
        </Text>
        <View className="gap-2">
          <FieldLabel>Posting date</FieldLabel>
          <CalendarDateField
            accessibilityLabel="Posting date"
            onPress={onOpenCalendar}
            testID="contribution-payment-date-input"
            value={paymentDate}
          />
        </View>
        <View className="gap-2">
          <View className="flex-row items-center justify-between gap-3">
            <FieldLabel>Reference</FieldLabel>
            <Text className="text-[10px] font-semibold text-muted-foreground">
              Optional
            </Text>
          </View>
          <Input
            accessibilityLabel="Payment reference"
            onChangeText={onSetPaymentReference}
            placeholder="Bank or receipt reference"
            testID="contribution-payment-reference-input"
            value={paymentReference}
          />
        </View>
      </View>
    </FullScreenFormSheet>
  )
}
