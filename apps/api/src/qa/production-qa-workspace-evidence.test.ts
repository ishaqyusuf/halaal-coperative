import { expect, test } from "bun:test"
import { resolveWorkspaceSessionEvidence } from "./production-qa-workspace-evidence"

test("separates cleanup of an early failed run from full matrix coverage", () => {
  expect(
    resolveWorkspaceSessionEvidence({
      sessionCount: 4,
      revokedSessionCount: 4,
      accessibilityMatrix: true,
    })
  ).toEqual({
    mobileSessionsRevoked: true,
    minimumSessionEvidencePassed: false,
  })
  expect(
    resolveWorkspaceSessionEvidence({
      sessionCount: 12,
      revokedSessionCount: 12,
      accessibilityMatrix: true,
    })
  ).toEqual({ mobileSessionsRevoked: true, minimumSessionEvidencePassed: true })
  expect(
    resolveWorkspaceSessionEvidence({
      sessionCount: 12,
      revokedSessionCount: 11,
      accessibilityMatrix: true,
    })
  ).toEqual({
    mobileSessionsRevoked: false,
    minimumSessionEvidencePassed: true,
  })
})

test("rejects absent or invalid session evidence", () => {
  for (const [sessionCount, revokedSessionCount] of [
    [0, 0],
    [-1, -1],
    [1, 2],
    [NaN, 0],
    [2.5, 2.5],
  ]) {
    expect(
      resolveWorkspaceSessionEvidence({
        sessionCount: sessionCount!,
        revokedSessionCount: revokedSessionCount!,
        accessibilityMatrix: false,
      })
    ).toEqual({
      mobileSessionsRevoked: false,
      minimumSessionEvidencePassed: false,
    })
  }
})
