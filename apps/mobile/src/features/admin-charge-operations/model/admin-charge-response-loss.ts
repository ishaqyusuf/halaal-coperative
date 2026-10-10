import { AppError } from "@halaalvest/errors"

export const duplicateChargeResponseLossQaState =
  "duplicate-charge-response-loss" as const

export type AdminChargeOperationsQaState =
  typeof duplicateChargeResponseLossQaState

const committedChargeResponseLossOperation =
  "mobile.qa.charge_response_loss_after_commit"

export function getAdminChargeOperationsQaState(
  value: string | string[] | undefined,
  qaClientEnabled: boolean
): AdminChargeOperationsQaState | null {
  return qaClientEnabled && value === duplicateChargeResponseLossQaState
    ? duplicateChargeResponseLossQaState
    : null
}

export function throwCommittedChargeResponseLoss(input: {
  enabled: boolean
  qaClientEnabled: boolean
}) {
  if (!input.enabled || !input.qaClientEnabled) return

  throw new AppError({
    code: "NETWORK_UNAVAILABLE",
    internalMessage:
      "The charge was recorded, but the response was interrupted. Retry to confirm it.",
    operation: committedChargeResponseLossOperation,
    publicMessage:
      "The charge was recorded, but the response was interrupted. Retry to confirm it.",
    reportable: false,
    retryable: true,
  })
}

export function isCommittedChargeResponseLoss(error: unknown) {
  return (
    error instanceof AppError &&
    error.operation === committedChargeResponseLossOperation
  )
}
