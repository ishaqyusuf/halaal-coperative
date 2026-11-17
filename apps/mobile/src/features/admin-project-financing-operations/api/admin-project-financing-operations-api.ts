import { isMobileDevFixtureSession } from "@/dev/mobile-dev-session"
import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import { isPersistableReadInput, readCachedMobileQuery } from "@/lib/read-cache"
import type {
  ProjectFinancingCommandResult,
  ProjectFinancingDetail,
  ProjectFinancingLane,
  ProjectFinancingStructure,
  ProjectFinancingSummary,
  ProjectFinancingWorkspace,
} from "../model/admin-project-financing-operations-types"
import {
  getDevProjectFinancingDetail,
  getDevProjectFinancingSummary,
  getDevProjectFinancingWorkspace,
  runDevProjectFinancingCommand,
} from "./admin-project-financing-operations-dev-fixtures"

/** Lane page size (T21). */
export const PROJECT_FINANCING_PAGE_SIZE = 20

export function getProjectFinancingOperationsSummary() {
  if (isMobileDevFixtureSession()) return getDevProjectFinancingSummary()
  return readCachedMobileQuery("admin.project-financing-operations.summary", () =>
    createMobileTrpcClient().mobile.admin.projectFinancingOperations.summary.query()
  ) as Promise<ProjectFinancingSummary>
}

export function getProjectFinancingOperationsWorkspace(input: {
  cursor?: string
  lane: ProjectFinancingLane
  search?: string
}) {
  if (isMobileDevFixtureSession()) {
    return getDevProjectFinancingWorkspace(input)
  }
  return readCachedMobileQuery(
    `admin.project-financing-operations.v2.${JSON.stringify(input)}`,
    () =>
      createMobileTrpcClient().mobile.admin.projectFinancingOperations.workspace.query(
        { ...input, limit: PROJECT_FINANCING_PAGE_SIZE }
      ),
    { persist: isPersistableReadInput(input) }
  ) as Promise<ProjectFinancingWorkspace>
}

export function getProjectFinancingOperationDetail(
  projectFinancingRequestId: string
) {
  if (isMobileDevFixtureSession()) {
    return getDevProjectFinancingDetail(projectFinancingRequestId)
  }
  return createMobileTrpcClient().mobile.admin.projectFinancingOperations.detail.query(
    { projectFinancingRequestId }
  ) as Promise<ProjectFinancingDetail>
}

export function reviewProjectFinancingOperation(input: {
  approvedAmount?: number
  approvedPaybackMonths?: number
  approvedStructure?: Exclude<ProjectFinancingStructure, "undecided">
  commandId: string
  expectedState: "submitted" | "under_review"
  notes?: string
  projectFinancingRequestId: string
  status: "approved" | "rejected" | "under_review"
}) {
  if (isMobileDevFixtureSession()) {
    return runDevProjectFinancingCommand({
      commandId: input.commandId,
      entityId: input.projectFinancingRequestId,
      state: input.status,
      update: {
        approvedAmount: input.approvedAmount ?? null,
        approvedPaybackMonths: input.approvedPaybackMonths ?? null,
        approvedStructure: input.approvedStructure ?? null,
        reviewNotes: input.notes ?? null,
        reviewedAt: new Date().toISOString(),
      },
    })
  }
  return createMobileTrpcClient().mobile.admin.projectFinancingOperations.review.mutate(
    input
  ) as Promise<ProjectFinancingCommandResult>
}

export function activateProjectFinancingOperation(input: {
  commandId: string
  expectedState: "approved"
  notes: string
  projectFinancingRequestId: string
}) {
  if (isMobileDevFixtureSession()) {
    return runDevProjectFinancingCommand({
      commandId: input.commandId,
      entityId: input.projectFinancingRequestId,
      state: "active",
    })
  }
  return createMobileTrpcClient().mobile.admin.projectFinancingOperations.activate.mutate(
    input
  ) as Promise<ProjectFinancingCommandResult>
}

export function recordProjectFinancingDisbursement(input: {
  commandId: string
  disbursedAt: string
  expectedState: "active"
  notes?: string
  projectFinancingRequestId: string
  reference: string
}) {
  if (isMobileDevFixtureSession()) {
    return runDevProjectFinancingCommand({
      commandId: input.commandId,
      entityId: input.projectFinancingRequestId,
      state: "active",
      update: {
        disbursedAt: `${input.disbursedAt}T12:00:00.000Z`,
        disbursementNotes: input.notes ?? null,
        disbursementReference: input.reference,
      },
    })
  }
  return createMobileTrpcClient().mobile.admin.projectFinancingOperations.recordDisbursement.mutate(
    input
  ) as Promise<ProjectFinancingCommandResult>
}
