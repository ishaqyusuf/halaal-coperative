import { DateField } from "@/components/ui/date-field"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { ListCard, RecordRow } from "@/components/ui/list-card"
import { MoneyField } from "@/components/ui/money-field"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { SelectField } from "@/components/ui/select-field"
import { StatusBanner } from "@/components/ui/status-banner"
import { Textarea } from "@/components/ui/textarea"
import { View } from "react-native"
import {
  adminFinanceActionNeedsLongForm,
  type AdminFinanceSupportReviewIntent,
} from "../model/admin-finance-support-action"
import {
  financeDeskItemStatus,
  formatAdminFinanceCurrency,
} from "../model/admin-finance-support-presentation"

export type AdminFinanceActionDraft = {
  adjustmentDecision: "approved" | "rejected"
  approvedAmount: string
  approvedMonths: string
  approvedStructure:
    | "investment_partnership"
    | "profit_sharing"
    | "repayable_facility"
    | null
  approvedUnits: string
  followUpStatus: "promise_to_pay" | "reminded" | "settled" | "unreachable"
  nextActionAt: string
  note: string
  priority: "normal" | "high" | "urgent"
  supportStatus:
    | "open"
    | "in_progress"
    | "waiting_on_member"
    | "resolved"
    | "closed"
}

export function AdminFinanceActionForm({
  blocked,
  currencyCode,
  draft,
  error,
  intent,
  onChange,
  restored,
}: {
  blocked: boolean
  currencyCode: string
  draft: AdminFinanceActionDraft
  error: string | null
  intent: AdminFinanceSupportReviewIntent
  onChange: <K extends keyof AdminFinanceActionDraft>(
    key: K,
    value: AdminFinanceActionDraft[K]
  ) => void
  restored: boolean
}) {
  const { item, action } = intent
  const status = financeDeskItemStatus(item)
  const approval = adminFinanceActionNeedsLongForm(intent)
  const shares = item.queueKey === "shares"
  const project = item.queueKey === "projectFinancing"
  const amount =
    item.amount === null
      ? undefined
      : formatAdminFinanceCurrency(item.amount, currencyCode)
  const reply = action.key === "reply"
  return (
    <View className="gap-[16px]">
      {blocked ? (
        <StatusBanner
          kind="stale"
          title="Reviews are paused"
          description="Refresh online before continuing."
        />
      ) : null}
      {restored ? <StatusBanner kind="info" title="Draft restored" /> : null}
      {error ? (
        <StatusBanner
          description={error}
          kind="error"
          title="Check these details"
        />
      ) : null}
      <ListCard>
        <RecordRow
          amount={amount}
          meta={item.subtitle}
          status={status.label}
          statusTone={status.tone}
          title={item.title}
        />
      </ListCard>

      {approval ||
      action.key === "record_follow_up" ||
      action.key === "update_support_status" ||
      action.key === "review_financial_adjustment" ? (
        <View className="gap-[16px] rounded-[20px] bg-card p-[16px]">
          {approval && !shares ? (
            <>
              <FormField
                helper={amount ? `Requested ${amount}` : undefined}
                label="Approved amount"
                optional
              >
                <MoneyField
                  allowDecimals
                  currencyCode={currencyCode}
                  onChangeValue={(raw) => onChange("approvedAmount", raw)}
                  value={draft.approvedAmount}
                />
              </FormField>
              {!project ||
              draft.approvedStructure === null ||
              draft.approvedStructure === "repayable_facility" ? (
                <FormField label="Approved months" optional>
                  <Input
                    accessibilityLabel="Approved months"
                    keyboardType="number-pad"
                    onChangeText={(value) => onChange("approvedMonths", value)}
                    value={draft.approvedMonths}
                  />
                </FormField>
              ) : null}
            </>
          ) : null}
          {approval && shares ? (
            <FormField label="Approved units" optional>
              <Input
                accessibilityLabel="Approved units"
                keyboardType="number-pad"
                onChangeText={(value) => onChange("approvedUnits", value)}
                value={draft.approvedUnits}
              />
            </FormField>
          ) : null}
          {approval && project ? (
            <FormField
              helper="How the cooperative takes part in this project."
              label="Structure"
            >
              <SelectField
                onChange={(value) => onChange("approvedStructure", value)}
                options={[
                  { label: "Repayable facility", value: "repayable_facility" },
                  { label: "Profit sharing", value: "profit_sharing" },
                  {
                    label: "Investment partnership",
                    value: "investment_partnership",
                  },
                ]}
                value={draft.approvedStructure}
              />
            </FormField>
          ) : null}
          {action.key === "record_follow_up" ? (
            <>
              <FormField
                helper="When to contact the member again."
                label="Next action date"
                optional
              >
                <DateField
                  onChange={(value) => onChange("nextActionAt", value)}
                  testID="admin-finance-next-action-date-input"
                  value={draft.nextActionAt}
                />
              </FormField>
              <FormField label="Priority">
                <SegmentedControl
                  accessibilityLabel="Priority"
                  onChange={(value) => onChange("priority", value)}
                  options={[
                    { label: "Normal", value: "normal" },
                    { label: "High", value: "high" },
                    { label: "Urgent", value: "urgent" },
                  ]}
                  value={draft.priority}
                />
              </FormField>
              <FormField label="Contact outcome">
                <SelectField
                  onChange={(value) => onChange("followUpStatus", value)}
                  options={[
                    { label: "Reminded", value: "reminded" },
                    { label: "Promise to pay", value: "promise_to_pay" },
                    { label: "Unreachable", value: "unreachable" },
                    { label: "Settled", value: "settled" },
                  ]}
                  value={draft.followUpStatus}
                />
              </FormField>
            </>
          ) : null}
          {action.key === "update_support_status" ? (
            <FormField label="Next status">
              <SelectField
                onChange={(value) => onChange("supportStatus", value)}
                options={[
                  { label: "Open", value: "open" },
                  { label: "In progress", value: "in_progress" },
                  { label: "Waiting on member", value: "waiting_on_member" },
                  { label: "Resolved", value: "resolved" },
                  { label: "Closed", value: "closed" },
                ]}
                value={draft.supportStatus}
              />
            </FormField>
          ) : null}
          {action.key === "review_financial_adjustment" ? (
            <FormField
              helper="Records a governance decision only."
              label="Governance decision"
            >
              <SegmentedControl
                accessibilityLabel="Governance decision"
                onChange={(value) => onChange("adjustmentDecision", value)}
                options={[
                  { label: "Approve", value: "approved" },
                  { label: "Reject", value: "rejected" },
                ]}
                value={draft.adjustmentDecision}
              />
            </FormField>
          ) : null}
        </View>
      ) : null}

      <View className="rounded-[20px] bg-card p-[16px]">
        <FormField
          label={reply ? "Reply to member" : "Review evidence"}
          optional={!action.requiresEvidence}
        >
          <Textarea
            accessibilityLabel={reply ? "Reply to member" : "Review evidence"}
            className="bg-surface-raised min-h-[96px] rounded-[14px]"
            maxLength={reply ? 2000 : 1000}
            numberOfLines={4}
            onChangeText={(value) => onChange("note", value)}
            placeholder={
              reply
                ? "Write your reply"
                : "What did you check before this decision?"
            }
            testID="admin-finance-review-evidence"
            value={draft.note}
          />
        </FormField>
      </View>
    </View>
  )
}
