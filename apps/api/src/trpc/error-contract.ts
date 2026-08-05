import { classifyError, toPublicError } from "@halaalvest/errors"
import { TRPCError } from "@trpc/server"

const APPROVED_PUBLIC_MESSAGE_PATTERNS = [
  /^You must be signed in to continue\.$/,
  /^Switch to the member workspace to (?:continue|view member data)\.$/,
  /^This action requires [a-z_]+ role or above\.$/,
  /^That mobile workspace is not available(?: for this account)?\.$/,
]
const APPROVED_UNAVAILABLE_MESSAGES = new Set([
  "Financing requests are unavailable.",
  "Financing request review is unavailable.",
  "Foodstuff Purchase applications are unavailable.",
  "Foodstuff Purchase review is unavailable.",
  "Guarantor approvals are unavailable.",
  "Member creation is unavailable.",
  "Member KYC review is unavailable.",
  "Member onboarding review is unavailable.",
  "Member status review is unavailable.",
  "Mobile device registration is unavailable.",
  "Procurement requests are unavailable.",
  "Procurement request review is unavailable.",
  "Project financing requests are unavailable.",
  "Project financing review is unavailable.",
  "Receipt review is unavailable.",
  "Receipts are unavailable.",
  "Share application review is unavailable.",
  "Share requests are unavailable.",
  "Support is unavailable.",
  "Support reply is unavailable.",
  "Support status update is unavailable.",
  "Collection follow-up is unavailable.",
  "Workspace invitation is unavailable.",
])
const APPROVED_WORKFLOW_MESSAGES = new Set([
  "Member verification is required before financial or operational actions can continue.",
  "Resolve all live provider blockers before purging QA data.",
  "This account is not active for the selected cooperative.",
  "This QA workspace is being purged and no longer accepts writes.",
  "The QA purge preview expired or changed. Preview again.",
  "There are no marked QA workspaces to purge.",
  "Your user account is not linked to a member profile.",
])
function getApprovedUnavailableMessage(message: string) {
  const publicMessage = message.replace(" without database configuration.", ".")
  return APPROVED_UNAVAILABLE_MESSAGES.has(publicMessage)
    ? publicMessage
    : undefined
}

function getApprovedPublicMessage(
  error: unknown,
  depth = 0
): string | undefined {
  if (!(error instanceof Error) || depth > 3) return undefined
  const unavailableMessage = getApprovedUnavailableMessage(error.message)
  if (unavailableMessage) return unavailableMessage
  if (APPROVED_WORKFLOW_MESSAGES.has(error.message)) return error.message
  if (
    APPROVED_PUBLIC_MESSAGE_PATTERNS.some((pattern) =>
      pattern.test(error.message)
    )
  ) {
    return error.message
  }

  return getApprovedPublicMessage(error.cause, depth + 1)
}

export function normalizeTrpcError(error: unknown, operation?: string) {
  const classified = classifyError(error, {
    operation,
    publicMessage: getApprovedPublicMessage(error),
  })

  return new TRPCError({
    cause: classified,
    code: classified.transportCode,
    message: classified.publicMessage,
  })
}

export function getTrpcPublicError(error: unknown) {
  return toPublicError(error)
}
