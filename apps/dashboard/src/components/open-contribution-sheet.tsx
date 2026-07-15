"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  CheckCircle2Icon,
  FileWarningIcon,
  PencilIcon,
  PlusIcon,
  ReceiptTextIcon,
  SendIcon,
  Settings2Icon,
  UploadIcon,
} from "lucide-react"
import { useContributionParams } from "@/hooks/use-contribution-params"

export function OpenContributionPlanSheet({
  disabled,
}: {
  disabled?: boolean
}) {
  const { setParams } = useContributionParams()

  return (
    <Button
      disabled={disabled}
      onClick={() =>
        setParams({
          contributionSheetType: "plan",
          selectedCollectionBatchId: null,
          selectedCollectionRowId: null,
          selectedContributionMemberId: null,
          selectedContributionPlanId: null,
        })
      }
      type="button"
    >
      <PlusIcon data-icon="inline-start" />
      Set commitment
    </Button>
  )
}

export function OpenMemberPaymentSheet({
  disabled,
}: {
  disabled?: boolean
}) {
  const { setParams } = useContributionParams()

  return (
    <Button
      disabled={disabled}
      onClick={() =>
        setParams({
          contributionSheetType: "payment",
          selectedCollectionBatchId: null,
          selectedCollectionRowId: null,
          selectedContributionMemberId: null,
          selectedContributionPlanId: null,
        })
      }
      type="button"
      variant="outline"
    >
      <ReceiptTextIcon data-icon="inline-start" />
      Record payment
    </Button>
  )
}

export function OpenMemberPaymentPreferenceSheet({
  memberId,
}: {
  memberId: string
}) {
  const { setParams } = useContributionParams()

  return (
    <Button
      onClick={() =>
        setParams({
          contributionSheetType: "preference",
          selectedCollectionBatchId: null,
          selectedCollectionRowId: null,
          selectedContributionMemberId: memberId,
          selectedContributionPlanId: null,
        })
      }
      size="sm"
      type="button"
      variant="outline"
    >
      <Settings2Icon data-icon="inline-start" />
      Preference
    </Button>
  )
}

export function OpenContributionPlanEditSheet({
  planId,
}: {
  planId: string
}) {
  const { setParams } = useContributionParams()

  return (
    <Button
      onClick={() =>
        setParams({
          contributionSheetType: "editPlan",
          selectedCollectionBatchId: null,
          selectedCollectionRowId: null,
          selectedContributionMemberId: null,
          selectedContributionPlanId: planId,
        })
      }
      size="sm"
      type="button"
      variant="outline"
    >
      <PencilIcon data-icon="inline-start" />
      Manage
    </Button>
  )
}

export function OpenContributionBatchStageSheet({
  disabled,
}: {
  disabled?: boolean
}) {
  const { setParams } = useContributionParams()

  return (
    <Button
      disabled={disabled}
      onClick={() =>
        setParams({
          contributionSheetType: "stageBatch",
          selectedCollectionBatchId: null,
          selectedCollectionRowId: null,
          selectedContributionMemberId: null,
          selectedContributionPlanId: null,
        })
      }
      type="button"
    >
      <UploadIcon data-icon="inline-start" />
      Stage batch
    </Button>
  )
}

export function OpenContributionBatchPostSheet({
  batchId,
  disabled,
}: {
  batchId: string
  disabled?: boolean
}) {
  const { setParams } = useContributionParams()

  return (
    <Button
      disabled={disabled}
      onClick={() =>
        setParams({
          contributionSheetType: "postBatchRows",
          selectedCollectionBatchId: batchId,
          selectedCollectionRowId: null,
          selectedContributionMemberId: null,
          selectedContributionPlanId: null,
        })
      }
      size="sm"
      type="button"
      variant="outline"
    >
      <SendIcon data-icon="inline-start" />
      Post collected rows
    </Button>
  )
}

export function OpenContributionBatchRowCollectedSheet({
  batchId,
  rowId,
}: {
  batchId: string
  rowId: string
}) {
  const { setParams } = useContributionParams()

  return (
    <Button
      onClick={() =>
        setParams({
          contributionSheetType: "markBatchRowCollected",
          selectedCollectionBatchId: batchId,
          selectedCollectionRowId: rowId,
          selectedContributionMemberId: null,
          selectedContributionPlanId: null,
        })
      }
      size="sm"
      type="button"
      variant="outline"
    >
      <CheckCircle2Icon data-icon="inline-start" />
      Mark collected
    </Button>
  )
}

export function OpenContributionBatchRowExceptionSheet({
  batchId,
  rowId,
}: {
  batchId: string
  rowId: string
}) {
  const { setParams } = useContributionParams()

  return (
    <Button
      onClick={() =>
        setParams({
          contributionSheetType: "markBatchRowException",
          selectedCollectionBatchId: batchId,
          selectedCollectionRowId: rowId,
          selectedContributionMemberId: null,
          selectedContributionPlanId: null,
        })
      }
      size="sm"
      type="button"
      variant="outline"
    >
      <FileWarningIcon data-icon="inline-start" />
      Exception
    </Button>
  )
}

export function OpenContributionBatchRowPostSheet({
  batchId,
  rowId,
}: {
  batchId: string
  rowId: string
}) {
  const { setParams } = useContributionParams()

  return (
    <Button
      onClick={() =>
        setParams({
          contributionSheetType: "postBatchRow",
          selectedCollectionBatchId: batchId,
          selectedCollectionRowId: rowId,
          selectedContributionMemberId: null,
          selectedContributionPlanId: null,
        })
      }
      size="sm"
      type="button"
    >
      <SendIcon data-icon="inline-start" />
      Post row
    </Button>
  )
}
