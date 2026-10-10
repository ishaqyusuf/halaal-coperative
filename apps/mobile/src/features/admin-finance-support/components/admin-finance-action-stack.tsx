import { CalendarPickerSheet } from "@/components/app/calendar-picker-sheet"
import { CompactFormSheet } from "@/components/app/compact-form-sheet"
import type { ConfirmationRowProps } from "@/components/app/confirmation-row"
import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { FullScreenFormSheet } from "@/components/app/full-screen-form-sheet"
import { SubmissionReviewSheet } from "@/components/app/submission-review-sheet"
import { SubmissionSuccessSheet } from "@/components/app/submission-success-sheet"
import { Button } from "@/components/ui/button"
import { Text } from "@/components/ui/text"
import { View } from "react-native"
import type { AdminFinanceSupportReviewIntent } from "../model/admin-finance-support-action"
import {
  AdminFinanceActionForm,
  type AdminFinanceActionDraft,
} from "./admin-finance-action-form"

type AdminFinanceActionStackProps = {
  compactVisible: boolean
  draft: AdminFinanceActionDraft
  error: string | null
  fullVisible: boolean
  hasDraft: boolean
  intent: AdminFinanceSupportReviewIntent | null
  isBlocked: boolean
  isSubmitting: boolean
  nextActionCalendarVisible: boolean
  onAdjustmentDecisionChange: (
    value: AdminFinanceActionDraft["adjustmentDecision"]
  ) => void
  onApprovedAmountChange: (value: string) => void
  onApprovedMonthsChange: (value: string) => void
  onApprovedStructureChange: (
    value: AdminFinanceActionDraft["approvedStructure"]
  ) => void
  onApprovedUnitsChange: (value: string) => void
  onCalendarClose: () => void
  onCalendarOpen: () => void
  onCompactClose: () => void
  onConfirmReview: () => void
  onFollowUpStatusChange: (
    value: AdminFinanceActionDraft["followUpStatus"]
  ) => void
  onFormDismissed: () => void
  onFullClose: () => void
  onNextActionAtChange: (value: string) => void
  onNoteChange: (value: string) => void
  onPriorityChange: (value: AdminFinanceActionDraft["priority"]) => void
  onQuickFill: () => void
  onReviewClose: () => void
  onReviewDismissed: () => void
  onSuccessClose: () => void
  onSupportStatusChange: (
    value: AdminFinanceActionDraft["supportStatus"]
  ) => void
  onValidateAndReview: () => void
  reviewRows: ConfirmationRowProps[]
  reviewVisible: boolean
  successMessage: string
  successVisible: boolean
}

export function AdminFinanceActionStack({
  compactVisible,
  draft,
  error,
  fullVisible,
  hasDraft,
  intent,
  isBlocked,
  isSubmitting,
  nextActionCalendarVisible,
  onAdjustmentDecisionChange,
  onApprovedAmountChange,
  onApprovedMonthsChange,
  onApprovedStructureChange,
  onApprovedUnitsChange,
  onCalendarClose,
  onCalendarOpen,
  onCompactClose,
  onConfirmReview,
  onFollowUpStatusChange,
  onFormDismissed,
  onFullClose,
  onNextActionAtChange,
  onNoteChange,
  onPriorityChange,
  onQuickFill,
  onReviewClose,
  onReviewDismissed,
  onSuccessClose,
  onSupportStatusChange,
  onValidateAndReview,
  reviewRows,
  reviewVisible,
  successMessage,
  successVisible,
}: AdminFinanceActionStackProps) {
  const form = intent ? (
    <AdminFinanceActionForm
      draft={draft}
      error={error}
      hasDraft={hasDraft}
      intent={intent}
      isBlocked={isBlocked}
      onAdjustmentDecisionChange={onAdjustmentDecisionChange}
      onApprovedAmountChange={onApprovedAmountChange}
      onApprovedMonthsChange={onApprovedMonthsChange}
      onApprovedStructureChange={onApprovedStructureChange}
      onApprovedUnitsChange={onApprovedUnitsChange}
      onFollowUpStatusChange={onFollowUpStatusChange}
      onNextActionCalendarOpen={onCalendarOpen}
      onNoteChange={onNoteChange}
      onPriorityChange={onPriorityChange}
      onSupportStatusChange={onSupportStatusChange}
    />
  ) : null

  const footer = intent ? (
    <View className="flex-row items-center gap-3 px-5 pt-3 pb-5">
      <DevQuickFill onPress={onQuickFill} placement="footer" portal={false} />
      <Button
        className="h-12 flex-1"
        disabled={isBlocked}
        onPress={onValidateAndReview}
      >
        <Text>Review action</Text>
      </Button>
    </View>
  ) : undefined

  return (
    <>
      <CompactFormSheet
        dirty={hasDraft}
        footer={footer}
        isSubmitting={isSubmitting}
        onClose={onCompactClose}
        onDismissed={onFormDismissed}
        overlay={
          <CalendarPickerSheet
            label="Next action date"
            onChange={onNextActionAtChange}
            onClose={onCalendarClose}
            testID="admin-finance-next-action-date-calendar"
            value={draft.nextActionAt}
            visible={nextActionCalendarVisible}
          />
        }
        title={intent?.action.label ?? "Review work"}
        visible={compactVisible}
      >
        {compactVisible ? form : null}
      </CompactFormSheet>

      <FullScreenFormSheet
        dirty={hasDraft}
        footer={footer}
        isSubmitting={isSubmitting}
        onClose={onFullClose}
        onDismissed={onFormDismissed}
        title={intent?.action.label ?? "Review work"}
        visible={fullVisible}
      >
        {fullVisible ? form : null}
      </FullScreenFormSheet>

      <SubmissionReviewSheet
        confirmLabel={
          intent?.action.destructive ? "Confirm rejection" : "Confirm action"
        }
        description="We’ll verify the record is unchanged before applying this action."
        error={reviewVisible ? error : null}
        isSubmitting={isSubmitting}
        onClose={onReviewClose}
        onConfirm={onConfirmReview}
        onDismissed={onReviewDismissed}
        rows={reviewRows}
        title="Confirm reviewed evidence"
        visible={reviewVisible}
      />

      <SubmissionSuccessSheet
        description={successMessage}
        onClose={onSuccessClose}
        title="Queue updated"
        visible={successVisible}
      />
    </>
  )
}
