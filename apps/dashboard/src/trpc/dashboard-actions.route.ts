import "server-only"

import {
  authenticatedProcedure,
  createTRPCRouter,
} from "@halaalvest/api/trpc"
import { z } from "zod"
import * as dashboardActionHandlers from "@/lib/dashboard-action-handlers"

export const dashboardActionInputSchema = z.object({
  fields: z.array(z.tuple([z.string(), z.string()])),
})

export type DashboardActionInput = z.infer<typeof dashboardActionInputSchema>

function formDataFromInput(input: DashboardActionInput) {
  const formData = new FormData()

  for (const [key, value] of input.fields) {
    formData.append(key, value)
  }

  return formData
}

function formAction<TResult>(
  handler: (formData: FormData) => Promise<TResult>
) {
  return authenticatedProcedure
    .input(dashboardActionInputSchema)
    .mutation(({ input }) => handler(formDataFromInput(input)))
}

function noInputAction<TResult>(handler: () => Promise<TResult>) {
  return authenticatedProcedure.mutation(() => handler())
}

export const dashboardActionsRouter = createTRPCRouter({
  createMemberAction: formAction(dashboardActionHandlers.createMemberAction),
  updateMemberStatusAction: formAction(
    dashboardActionHandlers.updateMemberStatusAction
  ),
  approveMemberOnboardingAction: formAction(
    dashboardActionHandlers.approveMemberOnboardingAction
  ),
  rejectMemberOnboardingAction: formAction(
    dashboardActionHandlers.rejectMemberOnboardingAction
  ),
  updateMemberKycAction: formAction(
    dashboardActionHandlers.updateMemberKycAction
  ),
  createMemberDocumentAction: formAction(
    dashboardActionHandlers.createMemberDocumentAction
  ),
  updateMemberDocumentReviewAction: formAction(
    dashboardActionHandlers.updateMemberDocumentReviewAction
  ),
  recordContributionAction: formAction(
    dashboardActionHandlers.recordContributionAction
  ),
  setMemberContributionPlanAction: formAction(
    dashboardActionHandlers.setMemberContributionPlanAction
  ),
  updateContributionPlanAction: formAction(
    dashboardActionHandlers.updateContributionPlanAction
  ),
  closeContributionPlanAction: formAction(
    dashboardActionHandlers.closeContributionPlanAction
  ),
  updateMemberPaymentAllocationPreferenceAction: formAction(
    dashboardActionHandlers.updateMemberPaymentAllocationPreferenceAction
  ),
  recordMemberPaymentAction: formAction(
    dashboardActionHandlers.recordMemberPaymentAction
  ),
  createMonthlyRecordAction: formAction(
    dashboardActionHandlers.createMonthlyRecordAction
  ),
  updateMonthlyRecordSettingsAction: formAction(
    dashboardActionHandlers.updateMonthlyRecordSettingsAction
  ),
  generateMonthlyRecordsNowAction: noInputAction(
    dashboardActionHandlers.generateMonthlyRecordsNowAction
  ),
  applyMonthlyRecordMemberAction: formAction(
    dashboardActionHandlers.applyMonthlyRecordMemberAction
  ),
  cancelMonthlyRecordMemberAction: formAction(
    dashboardActionHandlers.cancelMonthlyRecordMemberAction
  ),
  createChargeDefinitionAction: formAction(
    dashboardActionHandlers.createChargeDefinitionAction
  ),
  createTenantShareStructureVersionAction: formAction(
    dashboardActionHandlers.createTenantShareStructureVersionAction
  ),
  updateTenantShareStructureVersionAction: formAction(
    dashboardActionHandlers.updateTenantShareStructureVersionAction
  ),
  createChargeDefinitionVersionAction: formAction(
    dashboardActionHandlers.createChargeDefinitionVersionAction
  ),
  updateChargeDefinitionVersionAction: formAction(
    dashboardActionHandlers.updateChargeDefinitionVersionAction
  ),
  createShareBusinessAction: formAction(
    dashboardActionHandlers.createShareBusinessAction
  ),
  updateShareBusinessAction: formAction(
    dashboardActionHandlers.updateShareBusinessAction
  ),
  createShareBusinessProfitEntryAction: formAction(
    dashboardActionHandlers.createShareBusinessProfitEntryAction
  ),
  updateShareBusinessProfitEntryAction: formAction(
    dashboardActionHandlers.updateShareBusinessProfitEntryAction
  ),
  generateShareProfitAllocationsAction: formAction(
    dashboardActionHandlers.generateShareProfitAllocationsAction
  ),
  publishShareProfitAllocationsAction: formAction(
    dashboardActionHandlers.publishShareProfitAllocationsAction
  ),
  saveBusinessProfitMigrationWorksheetAction: formAction(
    dashboardActionHandlers.saveBusinessProfitMigrationWorksheetAction
  ),
  updateChargeDefinitionAction: formAction(
    dashboardActionHandlers.updateChargeDefinitionAction
  ),
  applyChargeAction: formAction(dashboardActionHandlers.applyChargeAction),
  waiveChargeApplicationAction: formAction(
    dashboardActionHandlers.waiveChargeApplicationAction
  ),
  reverseChargeApplicationAction: formAction(
    dashboardActionHandlers.reverseChargeApplicationAction
  ),
  submitLoanRequestAction: formAction(
    dashboardActionHandlers.submitLoanRequestAction
  ),
  reviewLoanRequestAction: formAction(
    dashboardActionHandlers.reviewLoanRequestAction
  ),
  disburseLoanAction: formAction(dashboardActionHandlers.disburseLoanAction),
  postRepaymentAction: formAction(dashboardActionHandlers.postRepaymentAction),
  updateCooperativeProfileAction: formAction(
    dashboardActionHandlers.updateCooperativeProfileAction
  ),
  updateTenantFinanceStartDateAction: formAction(
    dashboardActionHandlers.updateTenantFinanceStartDateAction
  ),
  finalizeInitialMigrationAction: formAction(
    dashboardActionHandlers.finalizeInitialMigrationAction
  ),
  unlockInitialMigrationAction: formAction(
    dashboardActionHandlers.unlockInitialMigrationAction
  ),
  createLegacyLoanMigrationDraftAction: formAction(
    dashboardActionHandlers.createLegacyLoanMigrationDraftAction
  ),
  updateLegacyLoanMigrationDraftAction: formAction(
    dashboardActionHandlers.updateLegacyLoanMigrationDraftAction
  ),
  upsertMemberAmountLogAction: formAction(
    dashboardActionHandlers.upsertMemberAmountLogAction
  ),
  markLegacyLoansReviewedAction: formAction(
    dashboardActionHandlers.markLegacyLoansReviewedAction
  ),
  markBusinessProfitPoolsReviewedAction: formAction(
    dashboardActionHandlers.markBusinessProfitPoolsReviewedAction
  ),
  upsertMigrationBackfillAdjustmentAction: formAction(
    dashboardActionHandlers.upsertMigrationBackfillAdjustmentAction
  ),
  setMigrationBackfillDefaultingMonthsAction: formAction(
    dashboardActionHandlers.setMigrationBackfillDefaultingMonthsAction
  ),
  upsertMemberActivityEventAction: formAction(
    dashboardActionHandlers.upsertMemberActivityEventAction
  ),
  deleteMemberActivityEventAction: formAction(
    dashboardActionHandlers.deleteMemberActivityEventAction
  ),
  upsertMigrationProfitAdjustmentAction: formAction(
    dashboardActionHandlers.upsertMigrationProfitAdjustmentAction
  ),
  updateMemberSignupAccessModeAction: formAction(
    dashboardActionHandlers.updateMemberSignupAccessModeAction
  ),
  createMemberSignupLinkAction: formAction(
    dashboardActionHandlers.createMemberSignupLinkAction
  ),
  updateMemberSignupLinkAction: formAction(
    dashboardActionHandlers.updateMemberSignupLinkAction
  ),
  toggleMemberSignupLinkAction: formAction(
    dashboardActionHandlers.toggleMemberSignupLinkAction
  ),
  rotateMemberSignupLinkAction: formAction(
    dashboardActionHandlers.rotateMemberSignupLinkAction
  ),
  createTenantDomainAction: formAction(
    dashboardActionHandlers.createTenantDomainAction
  ),
  setTenantDomainPrimaryAction: formAction(
    dashboardActionHandlers.setTenantDomainPrimaryAction
  ),
  updateTenantDomainVerificationStatusAction: formAction(
    dashboardActionHandlers.updateTenantDomainVerificationStatusAction
  ),
  runTenantDomainVerificationCheckAction: formAction(
    dashboardActionHandlers.runTenantDomainVerificationCheckAction
  ),
  provisionTenantUserRoleAction: formAction(
    dashboardActionHandlers.provisionTenantUserRoleAction
  ),
  saveNotificationPreferenceAction: formAction(
    dashboardActionHandlers.saveNotificationPreferenceAction
  ),
  refreshCollectionsStatusesAction: noInputAction(
    dashboardActionHandlers.refreshCollectionsStatusesAction
  ),
  recordCollectionFollowUpAction: formAction(
    dashboardActionHandlers.recordCollectionFollowUpAction
  ),
  importMembersCsvAction: formAction(
    dashboardActionHandlers.importMembersCsvAction
  ),
  importDeductionSourcesCsvAction: formAction(
    dashboardActionHandlers.importDeductionSourcesCsvAction
  ),
  importLoanProductsCsvAction: formAction(
    dashboardActionHandlers.importLoanProductsCsvAction
  ),
  importContributionsCsvAction: formAction(
    dashboardActionHandlers.importContributionsCsvAction
  ),
  importChargesCsvAction: formAction(
    dashboardActionHandlers.importChargesCsvAction
  ),
  importLoanMigrationsCsvAction: formAction(
    dashboardActionHandlers.importLoanMigrationsCsvAction
  ),
  importRepaymentMigrationsCsvAction: formAction(
    dashboardActionHandlers.importRepaymentMigrationsCsvAction
  ),
  stageImportBatchAction: formAction(
    dashboardActionHandlers.stageImportBatchAction
  ),
  applyImportBatchAction: formAction(
    dashboardActionHandlers.applyImportBatchAction
  ),
  queueBackfillDraftAction: formAction(
    dashboardActionHandlers.queueBackfillDraftAction
  ),
  getBackfillPreviewAction: formAction(
    dashboardActionHandlers.getBackfillPreviewAction
  ),
  queueBackfillApplyAction: formAction(
    dashboardActionHandlers.queueBackfillApplyAction
  ),
})
