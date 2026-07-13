"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import type {
  DashboardActionHandlers,
  DashboardActionInput,
  DashboardActionResult,
} from "@halaalvest/api/trpc/routers/dashboard-actions"
import { getServerCaller } from "@/trpc/server"

type DashboardActionName = Extract<keyof DashboardActionHandlers, string>
type FormActionName = {
  [TName in DashboardActionName]: Parameters<
    DashboardActionHandlers[TName]
  > extends [FormData]
    ? TName
    : never
}[DashboardActionName]
type NoInputActionName = Exclude<DashboardActionName, FormActionName>
type HandlerReturn<TName extends DashboardActionName> = Awaited<
  ReturnType<DashboardActionHandlers[TName]>
>

function toDashboardActionInput(formData: FormData): DashboardActionInput {
  const fields: DashboardActionInput["fields"] = []

  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string") {
      throw new Error("Dashboard tRPC actions only support string form fields.")
    }

    fields.push([key, value])
  }

  return { fields }
}

async function callDashboardFormAction<TName extends FormActionName>(
  actionName: TName,
  formData: FormData
): Promise<HandlerReturn<TName>> {
  const caller = await getServerCaller()
  const action = (
    caller.dashboardActions as unknown as Record<
      string,
      (input: DashboardActionInput) => Promise<unknown>
    >
  )[actionName]
  if (!action) {
    throw new Error(`Unknown dashboard form action: ${actionName}`)
  }

  const result = (await action(toDashboardActionInput(formData))) as
    | DashboardActionResult<HandlerReturn<TName>>
    | HandlerReturn<TName>

  if (
    result &&
    typeof result === "object" &&
    result !== null &&
    "revalidatePaths" in result
  ) {
    for (const path of result.revalidatePaths) {
      revalidatePath(path)
    }

    return result.data
  }

  return result as HandlerReturn<TName>
}

async function callDashboardNoInputAction<TName extends NoInputActionName>(
  actionName: TName
): Promise<HandlerReturn<TName>> {
  const caller = await getServerCaller()
  const action = (
    caller.dashboardActions as unknown as Record<string, () => Promise<unknown>>
  )[actionName]
  if (!action) {
    throw new Error(`Unknown dashboard action: ${actionName}`)
  }

  const result = (await action()) as
    | DashboardActionResult<HandlerReturn<TName>>
    | HandlerReturn<TName>

  if (
    typeof result === "object" &&
    result !== null &&
    "revalidatePaths" in result
  ) {
    for (const path of result.revalidatePaths) {
      revalidatePath(path)
    }

    return result.data
  }

  return result as HandlerReturn<TName>
}

export async function createMemberAction(formData: FormData) {
  return callDashboardFormAction("createMemberAction", formData)
}

export async function updateMemberAction(formData: FormData) {
  return callDashboardFormAction("updateMemberAction", formData)
}

export async function updateMemberStatusAction(formData: FormData) {
  return callDashboardFormAction("updateMemberStatusAction", formData)
}

export async function approveMemberOnboardingAction(formData: FormData) {
  return callDashboardFormAction("approveMemberOnboardingAction", formData)
}

export async function rejectMemberOnboardingAction(formData: FormData) {
  return callDashboardFormAction("rejectMemberOnboardingAction", formData)
}

export async function updateMemberKycAction(formData: FormData) {
  return callDashboardFormAction("updateMemberKycAction", formData)
}

export async function createMemberDocumentAction(formData: FormData) {
  return callDashboardFormAction("createMemberDocumentAction", formData)
}

export async function createOwnMemberDocumentAction(formData: FormData) {
  return callDashboardFormAction("createOwnMemberDocumentAction", formData)
}

export async function updateMemberDocumentReviewAction(formData: FormData) {
  return callDashboardFormAction("updateMemberDocumentReviewAction", formData)
}

export async function recordContributionAction(formData: FormData) {
  return callDashboardFormAction("recordContributionAction", formData)
}

export async function setMemberContributionPlanAction(formData: FormData) {
  return callDashboardFormAction("setMemberContributionPlanAction", formData)
}

export async function updateContributionPlanAction(formData: FormData) {
  return callDashboardFormAction("updateContributionPlanAction", formData)
}

export async function closeContributionPlanAction(formData: FormData) {
  return callDashboardFormAction("closeContributionPlanAction", formData)
}

export async function updateMemberPaymentAllocationPreferenceAction(
  formData: FormData
) {
  return callDashboardFormAction(
    "updateMemberPaymentAllocationPreferenceAction",
    formData
  )
}

export async function recordMemberPaymentAction(formData: FormData) {
  return callDashboardFormAction("recordMemberPaymentAction", formData)
}

export async function createMonthlyRecordAction(formData: FormData) {
  const result = await callDashboardFormAction(
    "createMonthlyRecordAction",
    formData
  )

  redirect(result.redirectTo)
}

export async function updateMonthlyRecordSettingsAction(formData: FormData) {
  return callDashboardFormAction("updateMonthlyRecordSettingsAction", formData)
}

export async function generateMonthlyRecordsNowAction() {
  return callDashboardNoInputAction("generateMonthlyRecordsNowAction")
}

export async function applyMonthlyRecordMemberAction(formData: FormData) {
  return callDashboardFormAction("applyMonthlyRecordMemberAction", formData)
}

export async function cancelMonthlyRecordMemberAction(formData: FormData) {
  return callDashboardFormAction("cancelMonthlyRecordMemberAction", formData)
}

export async function stageCollectionSourceContributionBatchAction(
  formData: FormData
) {
  const result = await callDashboardFormAction(
    "stageCollectionSourceContributionBatchAction",
    formData
  )

  redirect(result.redirectTo)
}

export async function updateCollectionSourceContributionBatchRowsAction(
  formData: FormData
) {
  return callDashboardFormAction(
    "updateCollectionSourceContributionBatchRowsAction",
    formData
  )
}

export async function postCollectionSourceContributionBatchRowsAction(
  formData: FormData
) {
  return callDashboardFormAction(
    "postCollectionSourceContributionBatchRowsAction",
    formData
  )
}

export async function createChargeDefinitionAction(formData: FormData) {
  return callDashboardFormAction("createChargeDefinitionAction", formData)
}

export async function createTenantShareStructureVersionAction(
  formData: FormData
) {
  return callDashboardFormAction(
    "createTenantShareStructureVersionAction",
    formData
  )
}

export async function updateTenantShareStructureVersionAction(
  formData: FormData
) {
  return callDashboardFormAction(
    "updateTenantShareStructureVersionAction",
    formData
  )
}

export async function updateTenantSharePolicyAction(formData: FormData) {
  return callDashboardFormAction("updateTenantSharePolicyAction", formData)
}

export async function updateTenantMigrationSetupAction(formData: FormData) {
  return callDashboardFormAction("updateTenantMigrationSetupAction", formData)
}

export async function updateTenantOperationProfileAction(formData: FormData) {
  const result = await callDashboardFormAction(
    "updateTenantOperationProfileAction",
    formData
  )

  if (result?.redirectTo) {
    redirect(result.redirectTo)
  }
}

export async function createMemberShareApplicationAction(formData: FormData) {
  return callDashboardFormAction("createMemberShareApplicationAction", formData)
}

export async function createOwnMemberShareApplicationAction(
  formData: FormData
) {
  return callDashboardFormAction(
    "createOwnMemberShareApplicationAction",
    formData
  )
}

export async function reviewMemberShareApplicationAction(formData: FormData) {
  return callDashboardFormAction("reviewMemberShareApplicationAction", formData)
}

export async function createChargeDefinitionVersionAction(formData: FormData) {
  return callDashboardFormAction(
    "createChargeDefinitionVersionAction",
    formData
  )
}

export async function updateChargeDefinitionVersionAction(formData: FormData) {
  return callDashboardFormAction(
    "updateChargeDefinitionVersionAction",
    formData
  )
}

export async function updateTenantBusinessProfitPolicyAction(
  formData: FormData
) {
  return callDashboardFormAction(
    "updateTenantBusinessProfitPolicyAction",
    formData
  )
}

export async function updateTenantFinancingPolicyAction(formData: FormData) {
  return callDashboardFormAction("updateTenantFinancingPolicyAction", formData)
}

export async function updateLoanProductSettingsAction(formData: FormData) {
  return callDashboardFormAction("updateLoanProductSettingsAction", formData)
}

export async function openMonthlyFinancingCycleAction(formData: FormData) {
  return callDashboardFormAction("openMonthlyFinancingCycleAction", formData)
}

export async function updateMonthlyFinancingCycleStatusAction(
  formData: FormData
) {
  return callDashboardFormAction(
    "updateMonthlyFinancingCycleStatusAction",
    formData
  )
}

export async function createShareBusinessAction(formData: FormData) {
  return callDashboardFormAction("createShareBusinessAction", formData)
}

export async function updateShareBusinessAction(formData: FormData) {
  return callDashboardFormAction("updateShareBusinessAction", formData)
}

export async function createShareBusinessProfitEntryAction(formData: FormData) {
  return callDashboardFormAction(
    "createShareBusinessProfitEntryAction",
    formData
  )
}

export async function updateShareBusinessProfitEntryAction(formData: FormData) {
  return callDashboardFormAction(
    "updateShareBusinessProfitEntryAction",
    formData
  )
}

export async function generateShareProfitAllocationsAction(formData: FormData) {
  return callDashboardFormAction(
    "generateShareProfitAllocationsAction",
    formData
  )
}

export async function generateHistoricalBackfillShareProfitAllocationsAction() {
  return callDashboardNoInputAction(
    "generateHistoricalBackfillShareProfitAllocationsAction"
  )
}

export async function publishShareProfitAllocationsAction(formData: FormData) {
  return callDashboardFormAction(
    "publishShareProfitAllocationsAction",
    formData
  )
}

export async function saveBusinessProfitMigrationWorksheetAction(
  formData: FormData
) {
  return callDashboardFormAction(
    "saveBusinessProfitMigrationWorksheetAction",
    formData
  )
}

export async function saveBusinessProfitSeasonReviewAction(formData: FormData) {
  const result = await callDashboardFormAction(
    "saveBusinessProfitSeasonReviewAction",
    formData
  )

  redirect(result.redirectTo)
}

export async function updateChargeDefinitionAction(formData: FormData) {
  return callDashboardFormAction("updateChargeDefinitionAction", formData)
}

export async function applyChargeAction(formData: FormData) {
  return callDashboardFormAction("applyChargeAction", formData)
}

export async function waiveChargeApplicationAction(formData: FormData) {
  return callDashboardFormAction("waiveChargeApplicationAction", formData)
}

export async function reverseChargeApplicationAction(formData: FormData) {
  return callDashboardFormAction("reverseChargeApplicationAction", formData)
}

export async function submitLoanRequestAction(formData: FormData) {
  return callDashboardFormAction("submitLoanRequestAction", formData)
}

export async function reviewLoanRequestAction(formData: FormData) {
  return callDashboardFormAction("reviewLoanRequestAction", formData)
}

export async function reviewLoanGuarantorApprovalAction(formData: FormData) {
  return callDashboardFormAction("reviewLoanGuarantorApprovalAction", formData)
}

export async function respondMemberLoanGuarantorApprovalAction(
  formData: FormData
) {
  return callDashboardFormAction(
    "respondMemberLoanGuarantorApprovalAction",
    formData
  )
}

export async function disburseLoanAction(formData: FormData) {
  return callDashboardFormAction("disburseLoanAction", formData)
}

export async function postRepaymentAction(formData: FormData) {
  return callDashboardFormAction("postRepaymentAction", formData)
}

export async function updateCooperativeProfileAction(formData: FormData) {
  return callDashboardFormAction("updateCooperativeProfileAction", formData)
}

export async function updateTenantTrustProfileAction(formData: FormData) {
  return callDashboardFormAction("updateTenantTrustProfileAction", formData)
}

export async function updateTenantFinanceStartDateAction(formData: FormData) {
  return callDashboardFormAction("updateTenantFinanceStartDateAction", formData)
}

export async function finalizeInitialMigrationAction(formData: FormData) {
  return callDashboardFormAction("finalizeInitialMigrationAction", formData)
}

export async function unlockInitialMigrationAction(formData: FormData) {
  return callDashboardFormAction("unlockInitialMigrationAction", formData)
}

export async function createMemberOpeningBalanceAction(formData: FormData) {
  return callDashboardFormAction("createMemberOpeningBalanceAction", formData)
}

export async function createHistoricalMemberSharePurchaseAction(
  formData: FormData
) {
  return callDashboardFormAction(
    "createHistoricalMemberSharePurchaseAction",
    formData
  )
}

export async function reviewMemberOpeningBalanceAction(formData: FormData) {
  return callDashboardFormAction("reviewMemberOpeningBalanceAction", formData)
}

export async function applyMemberOpeningBalanceAction(formData: FormData) {
  return callDashboardFormAction("applyMemberOpeningBalanceAction", formData)
}

export async function reverseMemberOpeningBalanceAction(formData: FormData) {
  return callDashboardFormAction("reverseMemberOpeningBalanceAction", formData)
}

export async function createLegacyLoanMigrationDraftAction(formData: FormData) {
  return callDashboardFormAction(
    "createLegacyLoanMigrationDraftAction",
    formData
  )
}

export async function updateLegacyLoanMigrationDraftAction(formData: FormData) {
  return callDashboardFormAction(
    "updateLegacyLoanMigrationDraftAction",
    formData
  )
}

export async function upsertMemberAmountLogAction(formData: FormData) {
  return callDashboardFormAction("upsertMemberAmountLogAction", formData)
}

export async function markLegacyLoansReviewedAction(formData: FormData) {
  return callDashboardFormAction("markLegacyLoansReviewedAction", formData)
}

export async function markBusinessProfitPoolsReviewedAction(
  formData: FormData
) {
  return callDashboardFormAction(
    "markBusinessProfitPoolsReviewedAction",
    formData
  )
}

export async function upsertMigrationBackfillAdjustmentAction(
  formData: FormData
) {
  return callDashboardFormAction(
    "upsertMigrationBackfillAdjustmentAction",
    formData
  )
}

export async function setMigrationBackfillDefaultingMonthsAction(
  formData: FormData
) {
  return callDashboardFormAction(
    "setMigrationBackfillDefaultingMonthsAction",
    formData
  )
}

export async function upsertMemberActivityEventAction(formData: FormData) {
  return callDashboardFormAction("upsertMemberActivityEventAction", formData)
}

export async function deleteMemberActivityEventAction(formData: FormData) {
  return callDashboardFormAction("deleteMemberActivityEventAction", formData)
}

export async function upsertMigrationProfitAdjustmentAction(
  formData: FormData
) {
  return callDashboardFormAction(
    "upsertMigrationProfitAdjustmentAction",
    formData
  )
}

export async function saveMemberProfitSeasonAdjustmentsAction(
  formData: FormData
) {
  const result = await callDashboardFormAction(
    "saveMemberProfitSeasonAdjustmentsAction",
    formData
  )

  if (result.redirectTo) {
    redirect(result.redirectTo)
  }
}

export async function updateMemberSignupAccessModeAction(formData: FormData) {
  return callDashboardFormAction("updateMemberSignupAccessModeAction", formData)
}

export async function createMemberSignupLinkAction(formData: FormData) {
  return callDashboardFormAction("createMemberSignupLinkAction", formData)
}

export async function updateMemberSignupLinkAction(formData: FormData) {
  return callDashboardFormAction("updateMemberSignupLinkAction", formData)
}

export async function toggleMemberSignupLinkAction(formData: FormData) {
  return callDashboardFormAction("toggleMemberSignupLinkAction", formData)
}

export async function rotateMemberSignupLinkAction(formData: FormData) {
  return callDashboardFormAction("rotateMemberSignupLinkAction", formData)
}

export async function createTenantDomainAction(formData: FormData) {
  return callDashboardFormAction("createTenantDomainAction", formData)
}

export async function setTenantDomainPrimaryAction(formData: FormData) {
  return callDashboardFormAction("setTenantDomainPrimaryAction", formData)
}

export async function updateTenantDomainVerificationStatusAction(
  formData: FormData
) {
  return callDashboardFormAction(
    "updateTenantDomainVerificationStatusAction",
    formData
  )
}

export async function runTenantDomainVerificationCheckAction(
  formData: FormData
) {
  return callDashboardFormAction(
    "runTenantDomainVerificationCheckAction",
    formData
  )
}

export async function provisionTenantUserRoleAction(formData: FormData) {
  return callDashboardFormAction("provisionTenantUserRoleAction", formData)
}

export async function saveNotificationPreferenceAction(formData: FormData) {
  return callDashboardFormAction("saveNotificationPreferenceAction", formData)
}

export async function refreshCollectionsStatusesAction() {
  return callDashboardNoInputAction("refreshCollectionsStatusesAction")
}

export async function recordCollectionFollowUpAction(formData: FormData) {
  return callDashboardFormAction("recordCollectionFollowUpAction", formData)
}

export async function createSupportCaseAction(formData: FormData) {
  return callDashboardFormAction("createSupportCaseAction", formData)
}

export async function addSupportCaseMessageAction(formData: FormData) {
  return callDashboardFormAction("addSupportCaseMessageAction", formData)
}

export async function createMemberSupportCaseAction(formData: FormData) {
  return callDashboardFormAction("createMemberSupportCaseAction", formData)
}

export async function addMemberSupportCaseMessageAction(formData: FormData) {
  return callDashboardFormAction("addMemberSupportCaseMessageAction", formData)
}

export async function updateSupportCaseStatusAction(formData: FormData) {
  return callDashboardFormAction("updateSupportCaseStatusAction", formData)
}

export async function reviewSupportCaseFinancialAdjustmentAction(
  formData: FormData
) {
  return callDashboardFormAction(
    "reviewSupportCaseFinancialAdjustmentAction",
    formData
  )
}

export async function createFoodPurchaseCycleAction(formData: FormData) {
  return callDashboardFormAction("createFoodPurchaseCycleAction", formData)
}

export async function submitFoodPurchaseApplicationAction(formData: FormData) {
  return callDashboardFormAction(
    "submitFoodPurchaseApplicationAction",
    formData
  )
}

export async function submitOwnFoodPurchaseApplicationAction(
  formData: FormData
) {
  return callDashboardFormAction(
    "submitOwnFoodPurchaseApplicationAction",
    formData
  )
}

export async function reviewFoodPurchaseApplicationAction(formData: FormData) {
  return callDashboardFormAction(
    "reviewFoodPurchaseApplicationAction",
    formData
  )
}

export async function recordFoodPurchaseAccountingAction(formData: FormData) {
  return callDashboardFormAction("recordFoodPurchaseAccountingAction", formData)
}

export async function reviewFoodPurchaseAccountingAction(formData: FormData) {
  return callDashboardFormAction("reviewFoodPurchaseAccountingAction", formData)
}

export async function createProcurementRequestAction(formData: FormData) {
  return callDashboardFormAction("createProcurementRequestAction", formData)
}

export async function createOwnProcurementRequestAction(formData: FormData) {
  return callDashboardFormAction("createOwnProcurementRequestAction", formData)
}

export async function reviewProcurementRequestAction(formData: FormData) {
  return callDashboardFormAction("reviewProcurementRequestAction", formData)
}

export async function recordProcurementPurchaseAction(formData: FormData) {
  return callDashboardFormAction("recordProcurementPurchaseAction", formData)
}

export async function createProjectFinancingRequestAction(formData: FormData) {
  return callDashboardFormAction(
    "createProjectFinancingRequestAction",
    formData
  )
}

export async function createOwnProjectFinancingRequestAction(
  formData: FormData
) {
  return callDashboardFormAction(
    "createOwnProjectFinancingRequestAction",
    formData
  )
}

export async function reviewProjectFinancingRequestAction(formData: FormData) {
  return callDashboardFormAction(
    "reviewProjectFinancingRequestAction",
    formData
  )
}

export async function recordProjectFinancingDisbursementAction(
  formData: FormData
) {
  return callDashboardFormAction(
    "recordProjectFinancingDisbursementAction",
    formData
  )
}

export async function createMemberPaymentReceiptAction(formData: FormData) {
  return callDashboardFormAction("createMemberPaymentReceiptAction", formData)
}

export async function createOwnMemberPaymentReceiptAction(formData: FormData) {
  return callDashboardFormAction(
    "createOwnMemberPaymentReceiptAction",
    formData
  )
}

export async function reviewMemberPaymentReceiptAction(formData: FormData) {
  return callDashboardFormAction("reviewMemberPaymentReceiptAction", formData)
}

export async function importMembersCsvAction(formData: FormData) {
  return callDashboardFormAction("importMembersCsvAction", formData)
}

export async function importDeductionSourcesCsvAction(formData: FormData) {
  return callDashboardFormAction("importDeductionSourcesCsvAction", formData)
}

export async function importLoanProductsCsvAction(formData: FormData) {
  return callDashboardFormAction("importLoanProductsCsvAction", formData)
}

export async function importContributionsCsvAction(formData: FormData) {
  return callDashboardFormAction("importContributionsCsvAction", formData)
}

export async function importChargesCsvAction(formData: FormData) {
  return callDashboardFormAction("importChargesCsvAction", formData)
}

export async function importLoanMigrationsCsvAction(formData: FormData) {
  return callDashboardFormAction("importLoanMigrationsCsvAction", formData)
}

export async function importRepaymentMigrationsCsvAction(formData: FormData) {
  return callDashboardFormAction("importRepaymentMigrationsCsvAction", formData)
}

export async function stageImportBatchAction(formData: FormData) {
  return callDashboardFormAction("stageImportBatchAction", formData)
}

export async function applyImportBatchAction(formData: FormData) {
  return callDashboardFormAction("applyImportBatchAction", formData)
}

export async function queueBackfillDraftAction(formData: FormData) {
  return callDashboardFormAction("queueBackfillDraftAction", formData)
}

export async function getBackfillPreviewAction(formData: FormData) {
  return callDashboardFormAction("getBackfillPreviewAction", formData)
}

export async function queueBackfillApplyAction(formData: FormData) {
  return callDashboardFormAction("queueBackfillApplyAction", formData)
}
