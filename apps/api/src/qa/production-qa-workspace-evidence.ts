export function resolveWorkspaceSessionEvidence(input: {
  sessionCount: number
  revokedSessionCount: number
  accessibilityMatrix: boolean
}) {
  const validCounts =
    Number.isInteger(input.sessionCount) &&
    Number.isInteger(input.revokedSessionCount) &&
    input.sessionCount >= 0 &&
    input.revokedSessionCount >= 0 &&
    input.revokedSessionCount <= input.sessionCount
  return {
    // A short/failed journey can clean up correctly without covering the matrix.
    mobileSessionsRevoked:
      validCounts &&
      input.sessionCount > 0 &&
      input.sessionCount === input.revokedSessionCount,
    minimumSessionEvidencePassed:
      validCounts && input.sessionCount >= (input.accessibilityMatrix ? 11 : 5),
  }
}
