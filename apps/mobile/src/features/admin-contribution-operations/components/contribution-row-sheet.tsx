import { AppSheet } from "@/components/app/app-sheet"
import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { MoneyField } from "@/components/ui/money-field"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { StatusBanner } from "@/components/ui/status-banner"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import { mobileDevQuickFill } from "@/dev/mobile-dev-quick-fill"
import { createClientSubmissionKey } from "@/lib/client-submission-key"
import { useState } from "react"
import { View } from "react-native"
import { updateContributionBatchRows } from "../api/admin-contribution-operations-api"
import { formatCurrency } from "../lib/admin-contribution-presentation"
import type {
  CollectionBatchDetail,
  CollectionBatchRow,
} from "../model/admin-contribution-operations-types"
import {
  amountOf,
  contributionStatus,
  validateRow,
  type RowStatus,
} from "../model/contribution-forms"
import { ContributionMemberSummary } from "./contribution-member-summary"
import type { ContributionReview } from "./contribution-review-sheet"

const STATUSES = [
  { icon: "Check", label: "Collected", value: "collected" },
  { icon: "CircleAlert", label: "Exception", value: "exception" },
  { icon: "CirclePause", label: "Skipped", value: "skipped" },
] as const

/** T18 screen 8 (02 Brand hero): mark one batch row before posting. */
export function ContributionRowSheet({
  batch,
  blocked,
  currencyCode,
  onClose,
  onReview,
  reviewActive,
  row,
}: {
  batch: CollectionBatchDetail
  blocked: boolean
  currencyCode: string
  onClose: () => void
  onReview: (review: ContributionReview) => void
  reviewActive: boolean
  row: CollectionBatchRow
}) {
  const initialStatus: RowStatus =
    row.status === "exception" || row.status === "skipped"
      ? row.status
      : "collected"
  const [status, setStatus] = useState<RowStatus>(initialStatus)
  const [amount, setAmount] = useState(
    String(row.paidAmount || row.expectedAmount)
  )
  const [reason, setReason] = useState(row.exceptionReason ?? "")
  const [errors, setErrors] = useState<{ amount?: string; reason?: string }>(
    {}
  )
  const expected = formatCurrency(row.expectedAmount, currencyCode)

  function review() {
    const found = validateRow({ amount, reason, status })
    setErrors(found)
    if (Object.keys(found).length) return
    const paid = status === "collected" ? (amountOf(amount) ?? 0) : null
    const label = contributionStatus(status).label
    const input = {
      batchId: batch.id,
      commandId: createClientSubmissionKey(),
      expectedState: batch.status,
      rows: [
        {
          exceptionReason: status === "collected" ? null : reason.trim() || null,
          paidAmount: paid,
          rowId: row.id,
          status,
        },
      ],
    }
    onReview({
      amount: paid === null ? label : formatCurrency(paid, currencyCode),
      busyLabel: "Saving",
      cta: "Save row",
      failure: "The row wasn’t updated. Try again.",
      rows: [
        ["Member", row.memberName],
        ["Status", label],
        ...(paid === null
          ? ([["Reason", reason.trim() || "Not provided"]] as const)
          : ([
              ["Collected", formatCurrency(paid, currencyCode)],
              ["Expected", expected],
            ] as const)),
      ],
      run: () => updateContributionBatchRows(input),
      sub: row.memberName,
      success: [
        "Row updated",
        `${row.memberName}’s row is now ${label.toLowerCase()}.`,
      ],
      title: "Review row",
    })
  }

  return (
    <AppSheet
      dirty={
        status !== initialStatus ||
        reason !== (row.exceptionReason ?? "") ||
        amount !== String(row.paidAmount || row.expectedAmount)
      }
      footer={
        <View className="flex-row items-center gap-[10px]">
          <DevQuickFill
            onPress={() => {
              setStatus("collected")
              setAmount(
                String(
                  row.expectedAmount ||
                    mobileDevQuickFill.adminContributions.rowAmount
                )
              )
              setReason("")
            }}
            placement="footer"
            portal={false}
          />
          <Button
            className="flex-1"
            disabled={blocked}
            onPress={review}
            testID="contribution-row-review"
          >
            <Text>Review row</Text>
          </Button>
        </View>
      }
      onClose={onClose}
      overlayActive={reviewActive}
      title="Edit row"
      variant="form"
      visible
    >
      <View className="gap-[16px]">
        {blocked ? (
          <StatusBanner
            description="Review needs a connection."
            kind="offline"
            title="Offline"
          />
        ) : null}
        <ContributionMemberSummary
          detail={`${row.memberNumber} · expected ${expected}`}
          name={row.memberName}
        />
        <FormField label="Row status">
          <SegmentedControl
            accessibilityLabel="Row status"
            onChange={(next) => {
              setStatus(next)
              setErrors({})
            }}
            options={STATUSES}
            value={status}
          />
        </FormField>
        {status === "collected" ? (
          <FormField
            error={errors.amount}
            helper={`Expected ${expected}`}
            label="Collected amount"
          >
            <MoneyField
              accessibilityLabel="Collected amount"
              allowDecimals
              currencyCode={currencyCode}
              onChangeValue={(raw) => {
                setAmount(raw)
                setErrors({})
              }}
              testID="contribution-row-amount-input"
              value={amount}
            />
          </FormField>
        ) : (
          <FormField
            error={errors.reason}
            label={status === "exception" ? "Exception reason" : "Skip note"}
            optional={status === "skipped"}
          >
            <Textarea
              accessibilityLabel={
                status === "exception" ? "Exception reason" : "Skip note"
              }
              onChangeText={(next) => {
                setReason(next)
                setErrors({})
              }}
              placeholder={
                status === "exception"
                  ? "Why this deduction failed"
                  : "Why this row is skipped"
              }
              testID="contribution-row-reason-input"
              value={reason}
            />
          </FormField>
        )}
      </View>
    </AppSheet>
  )
}
