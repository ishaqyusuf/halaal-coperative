import { CalendarDateField } from "@/components/app/calendar-date-field"
import { FormStateBanner } from "@/components/app/form-state-banner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import { View } from "react-native"
import {
  adminFinanceActionNeedsLongForm,
  type AdminFinanceSupportReviewIntent,
} from "../model/admin-finance-support-action"
import {
  formatAdminFinanceAge,
  formatAdminFinanceStatus,
} from "../model/admin-finance-support-presentation"

export type AdminFinanceActionDraft = {
  adjustmentDecision: "approved" | "rejected"
  approvedAmount: string
  approvedMonths: string
  approvedStructure:
    | "investment_partnership"
    | "profit_sharing"
    | "repayable_facility"
  approvedUnits: string
  followUpStatus: "promise_to_pay" | "reminded" | "settled" | "unreachable"
  nextActionAt: string
  note: string
  priority: "low" | "normal" | "high" | "urgent"
  supportStatus:
    | "open"
    | "in_progress"
    | "waiting_on_member"
    | "resolved"
    | "closed"
}

type AdminFinanceActionFormProps = {
  draft: AdminFinanceActionDraft
  error: string | null
  hasDraft: boolean
  intent: AdminFinanceSupportReviewIntent
  isBlocked: boolean
  onAdjustmentDecisionChange: (
    value: AdminFinanceActionDraft["adjustmentDecision"]
  ) => void
  onApprovedAmountChange: (value: string) => void
  onApprovedMonthsChange: (value: string) => void
  onApprovedStructureChange: (
    value: AdminFinanceActionDraft["approvedStructure"]
  ) => void
  onApprovedUnitsChange: (value: string) => void
  onFollowUpStatusChange: (
    value: AdminFinanceActionDraft["followUpStatus"]
  ) => void
  onNextActionCalendarOpen: () => void
  onNoteChange: (value: string) => void
  onPriorityChange: (value: AdminFinanceActionDraft["priority"]) => void
  onSupportStatusChange: (
    value: AdminFinanceActionDraft["supportStatus"]
  ) => void
}

export function AdminFinanceActionForm({
  draft,
  error,
  hasDraft,
  intent,
  isBlocked,
  onAdjustmentDecisionChange,
  onApprovedAmountChange,
  onApprovedMonthsChange,
  onApprovedStructureChange,
  onApprovedUnitsChange,
  onFollowUpStatusChange,
  onNextActionCalendarOpen,
  onNoteChange,
  onPriorityChange,
  onSupportStatusChange,
}: AdminFinanceActionFormProps) {
  const needsLongForm = adminFinanceActionNeedsLongForm(intent)

  return (
    <>
      <View className="gap-2 border-b border-border pb-4">
        <Text className="text-sm font-bold text-foreground">
          {intent.item.title}
        </Text>
        <Text className="text-xs leading-5 text-muted-foreground">
          {formatAdminFinanceStatus(intent.item.state)} ·{" "}
          {formatAdminFinanceAge(intent.item.ageMinutes)}
        </Text>
      </View>

      <FormStateBanner hasDraft={hasDraft} isStale={isBlocked} />

      {error ? (
        <View className="bg-destructive/10 px-3 py-2">
          <Text
            accessibilityLiveRegion="assertive"
            className="text-sm leading-5 text-destructive"
          >
            {error}
          </Text>
        </View>
      ) : null}

      <View className="gap-2">
        <Text className="text-sm font-semibold text-foreground">
          {intent.action.key === "reply" ? "Reply" : "Review evidence"}
        </Text>
        <Textarea
          accessibilityLabel="Review evidence"
          onChangeText={onNoteChange}
          placeholder="Record the evidence supporting this action"
          returnKeyType="done"
          value={draft.note}
        />
      </View>

      {needsLongForm ? (
        <>
          {intent.item.queueKey !== "shares" ? (
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">
                Approved amount
              </Text>
              <Input
                accessibilityLabel="Approved amount"
                keyboardType="decimal-pad"
                onChangeText={onApprovedAmountChange}
                placeholder="0"
                value={draft.approvedAmount}
              />
            </View>
          ) : null}

          {intent.item.queueKey === "procurement" ||
          intent.item.queueKey === "foodPurchase" ||
          intent.item.queueKey === "projectFinancing" ? (
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">
                Approved months
              </Text>
              <Input
                accessibilityLabel="Approved months"
                keyboardType="number-pad"
                onChangeText={onApprovedMonthsChange}
                placeholder="6"
                value={draft.approvedMonths}
              />
            </View>
          ) : null}

          {intent.item.queueKey === "shares" ? (
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">
                Approved units
              </Text>
              <Input
                accessibilityLabel="Approved units"
                keyboardType="number-pad"
                onChangeText={onApprovedUnitsChange}
                placeholder="1"
                value={draft.approvedUnits}
              />
            </View>
          ) : null}

          {intent.item.queueKey === "projectFinancing" ? (
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">
                Approved structure
              </Text>
              <View className="gap-2">
                {(
                  [
                    "repayable_facility",
                    "profit_sharing",
                    "investment_partnership",
                  ] as const
                ).map((value) => (
                  <Button
                    accessibilityState={{
                      selected: draft.approvedStructure === value,
                    }}
                    className="justify-start"
                    key={value}
                    onPress={() => onApprovedStructureChange(value)}
                    variant={
                      draft.approvedStructure === value ? "secondary" : "ghost"
                    }
                  >
                    <Text>{formatAdminFinanceStatus(value)}</Text>
                  </Button>
                ))}
              </View>
            </View>
          ) : null}
        </>
      ) : null}

      {intent.action.key === "record_follow_up" ? (
        <>
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">
              Next action date
            </Text>
            <CalendarDateField
              accessibilityLabel="Next action date"
              onPress={onNextActionCalendarOpen}
              testID="admin-finance-next-action-date-input"
              value={draft.nextActionAt}
            />
          </View>

          <View className="flex-row flex-wrap gap-2">
            {(["normal", "high", "urgent"] as const).map((value) => (
              <Button
                accessibilityState={{ selected: draft.priority === value }}
                className="h-10 px-3"
                key={value}
                onPress={() => onPriorityChange(value)}
                variant={draft.priority === value ? "secondary" : "ghost"}
              >
                <Text>{formatAdminFinanceStatus(value)}</Text>
              </Button>
            ))}
          </View>

          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">
              Contact outcome
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {(
                [
                  "reminded",
                  "promise_to_pay",
                  "unreachable",
                  "settled",
                ] as const
              ).map((value) => (
                <Button
                  accessibilityState={{
                    selected: draft.followUpStatus === value,
                  }}
                  className="h-10 px-3"
                  key={value}
                  onPress={() => onFollowUpStatusChange(value)}
                  variant={
                    draft.followUpStatus === value ? "secondary" : "ghost"
                  }
                >
                  <Text>{formatAdminFinanceStatus(value)}</Text>
                </Button>
              ))}
            </View>
          </View>
        </>
      ) : null}

      {intent.action.key === "update_support_status" ? (
        <View className="gap-2">
          <Text className="text-sm font-semibold text-foreground">
            Next status
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {(
              [
                "in_progress",
                "waiting_on_member",
                "resolved",
                "closed",
              ] as const
            ).map((value) => (
              <Button
                accessibilityState={{
                  selected: draft.supportStatus === value,
                }}
                className="h-10 px-3"
                key={value}
                onPress={() => onSupportStatusChange(value)}
                variant={draft.supportStatus === value ? "secondary" : "ghost"}
              >
                <Text>{formatAdminFinanceStatus(value)}</Text>
              </Button>
            ))}
          </View>
        </View>
      ) : null}

      {intent.action.key === "review_financial_adjustment" ? (
        <View className="gap-2">
          <Text className="text-sm font-semibold text-foreground">
            Governance decision
          </Text>
          <View className="flex-row gap-2">
            {(["approved", "rejected"] as const).map((value) => (
              <Button
                accessibilityState={{
                  selected: draft.adjustmentDecision === value,
                }}
                className="h-10 flex-1"
                key={value}
                onPress={() => onAdjustmentDecisionChange(value)}
                variant={
                  draft.adjustmentDecision === value ? "secondary" : "outline"
                }
              >
                <Text>{formatAdminFinanceStatus(value)}</Text>
              </Button>
            ))}
          </View>
          <Text className="text-xs leading-5 text-muted-foreground">
            Records governance approval only.
          </Text>
        </View>
      ) : null}
    </>
  )
}
