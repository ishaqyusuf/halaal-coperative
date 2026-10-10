import type { ProductionQaHarnessPlan } from "./production-qa-harness"

export const PRODUCTION_QA_HARNESS_CLEANUP_CONTRACT_VERSION = 1 as const
export const PRODUCTION_QA_HARNESS_CLEANUP_CONFIRMATION =
  "PURGE TICKET 30 QA HARNESS"
export const PRODUCTION_QA_HARNESS_CLEANUP_REHEARSAL_CONFIRMATION =
  "REHEARSE TICKET 30 QA HARNESS CLEANUP"

export const PRODUCTION_QA_HARNESS_CLEANUP_BLOCKERS = [
  "identity_mismatch",
  "live_classification",
  "qa_domain_mismatch",
  "purge_in_progress",
  "credential_or_session",
  "custom_domain",
  "external_document",
  "provider_resource",
] as const

export type ProductionQaHarnessCleanupBlocker =
  (typeof PRODUCTION_QA_HARNESS_CLEANUP_BLOCKERS)[number]

export type ProductionQaHarnessCleanupCounts = {
  auditLogs: number
  ledgerTransactions: number
  memberDocuments: number
  members: number
  users: number
  workspaces: number
}

export type ProductionQaHarnessCleanupPreview = {
  blockers: Array<{
    category: ProductionQaHarnessCleanupBlocker
    scenarioKey: string
  }>
  canPurge: boolean
  contractVersion: typeof PRODUCTION_QA_HARNESS_CLEANUP_CONTRACT_VERSION
  counts: ProductionQaHarnessCleanupCounts
  environment: ProductionQaHarnessPlan["environment"]
  fingerprint: string
  presentScenarioKeys: string[]
  runId: string
}

export type ProductionQaHarnessCleanupReceipt = {
  after: ProductionQaHarnessCleanupCounts
  before: ProductionQaHarnessCleanupCounts
  completedAt: string
  complete: boolean
  contractVersion: typeof PRODUCTION_QA_HARNESS_CLEANUP_CONTRACT_VERSION
  deleted: ProductionQaHarnessCleanupCounts
  deletedScenarioKeys: string[]
  environment: ProductionQaHarnessPlan["environment"]
  runId: string
  startedAt: string
}

export type ProductionQaHarnessCleanupRehearsalReceipt = {
  afterRollback: ProductionQaHarnessCleanupCounts
  before: ProductionQaHarnessCleanupCounts
  completedAt: string
  complete: boolean
  contractVersion: typeof PRODUCTION_QA_HARNESS_CLEANUP_CONTRACT_VERSION
  environment: ProductionQaHarnessPlan["environment"]
  rehearsalDeleted: ProductionQaHarnessCleanupCounts
  rehearsedScenarioKeys: string[]
  rollbackVerified: boolean
  runId: string
  startedAt: string
}

function countsLines(counts: ProductionQaHarnessCleanupCounts) {
  return [
    `- Workspaces: ${counts.workspaces}`,
    `- Users: ${counts.users}`,
    `- Members: ${counts.members}`,
    `- Member documents: ${counts.memberDocuments}`,
    `- Ledger transactions: ${counts.ledgerTransactions}`,
    `- Audit logs: ${counts.auditLogs}`,
  ]
}

export function createProductionQaHarnessCleanupPreviewReport(
  preview: ProductionQaHarnessCleanupPreview
) {
  const lines = [
    "# Production-contract QA harness cleanup preview",
    "",
    `- Contract: v${preview.contractVersion}`,
    `- Environment: ${preview.environment}`,
    `- Run: ${preview.runId}`,
    `- Safe to purge: ${preview.canPurge ? "yes" : "no"}`,
    `- Present scenarios: ${preview.presentScenarioKeys.length}`,
    `- Blockers: ${preview.blockers.length}`,
    "",
    "## Target counts",
    "",
    ...countsLines(preview.counts),
  ]

  if (preview.blockers.length > 0) {
    lines.push("", "## Blockers", "")
    for (const blocker of preview.blockers) {
      lines.push(`- ${blocker.scenarioKey}: ${blocker.category}`)
    }
  }

  lines.push(
    "",
    "The preview omits tenant identifiers, names, source-domain addresses, cooperative numbers, credentials, sessions, provider identifiers, document URLs, and the purge fingerprint."
  )

  return lines.join("\n")
}

export function createProductionQaHarnessCleanupReport(
  receipt: ProductionQaHarnessCleanupReceipt
) {
  return [
    "# Production-contract QA harness cleanup receipt",
    "",
    `- Contract: v${receipt.contractVersion}`,
    `- Environment: ${receipt.environment}`,
    `- Run: ${receipt.runId}`,
    `- Started: ${receipt.startedAt}`,
    `- Completed: ${receipt.completedAt}`,
    `- Complete: ${receipt.complete ? "yes" : "no"}`,
    `- Deleted scenarios: ${receipt.deletedScenarioKeys.length}`,
    "",
    "## Deleted counts",
    "",
    ...countsLines(receipt.deleted),
    "",
    "## Remaining target counts",
    "",
    ...countsLines(receipt.after),
    "",
    "The receipt contains stable scenario keys and aggregate counts only. Private tenant, identity, credential, session, provider, document, and financial details are omitted.",
  ].join("\n")
}

export function createProductionQaHarnessCleanupRehearsalReport(
  receipt: ProductionQaHarnessCleanupRehearsalReceipt
) {
  return [
    "# Production-contract QA harness cleanup rehearsal",
    "",
    `- Contract: v${receipt.contractVersion}`,
    `- Environment: ${receipt.environment}`,
    `- Run: ${receipt.runId}`,
    `- Started: ${receipt.startedAt}`,
    `- Completed: ${receipt.completedAt}`,
    `- Complete: ${receipt.complete ? "yes" : "no"}`,
    `- Rollback verified: ${receipt.rollbackVerified ? "yes" : "no"}`,
    `- Rehearsed scenarios: ${receipt.rehearsedScenarioKeys.length}`,
    "",
    "## Rehearsed deletion counts",
    "",
    ...countsLines(receipt.rehearsalDeleted),
    "",
    "## Counts after rollback",
    "",
    ...countsLines(receipt.afterRollback),
    "",
    "The exact cleanup transaction was rolled back deliberately. The receipt contains stable scenario keys and aggregate counts only; private tenant, identity, credential, session, provider, document, and financial details are omitted.",
  ].join("\n")
}
