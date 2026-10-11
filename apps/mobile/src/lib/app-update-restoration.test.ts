import { expect, test } from "bun:test"
import { getAppUpdateResume } from "./app-update-restoration"
const snapshot = {
  schemaVersion: 1,
  route: "/members",
  userId: "u",
  tenantId: "b",
  membershipId: "s",
  targetBuild: 12,
  savedAt: 1000,
}
const current = {
  userId: "u",
  tenantId: "b",
  membershipId: "s",
  buildNumber: 12,
  now: 2000,
}
test("restores only the installed target and same account/workspace", () => {
  expect(getAppUpdateResume(snapshot, current)).toBe("/members")
  for (const changed of [
    { userId: "other" },
    { tenantId: "other" },
    { membershipId: null },
    { buildNumber: 11 },
    { now: 86401000 },
    { now: 999 },
  ])
    expect(getAppUpdateResume(snapshot, { ...current, ...changed })).toBeNull()
})
test("never resumes a form, command or unvalidated snapshot", () => {
  for (const value of [
    null,
    {},
    { ...snapshot, route: "/orders/new" },
    { ...snapshot, schemaVersion: 2 },
  ])
    expect(getAppUpdateResume(value, current)).toBeNull()
})
