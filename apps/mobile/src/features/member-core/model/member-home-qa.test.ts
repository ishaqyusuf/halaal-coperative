import { expect, test } from "bun:test"
import { applyMemberHomeQaState, parseMemberHomeQaState } from "./member-home-qa"

test("only known QA states are accepted", () => {
  expect(parseMemberHomeQaState("offline")).toBe("offline")
  expect(parseMemberHomeQaState("drop table")).toBeNull()
  expect(parseMemberHomeQaState(["offline"])).toBeNull()
})

test("load states never show data", () => {
  const live = { home: null, isError: false, isOffline: false, isPending: false }
  expect(applyMemberHomeQaState("loading", live)).toMatchObject({ home: null, isPending: true })
  expect(applyMemberHomeQaState("error", live)).toMatchObject({ home: null, isError: true })
})

test("payment QA states switch only the Add payment gate", () => {
  const home = {
    actionItems: [],
    generatedAt: "2026-11-24T08:00:00.000Z",
    member: null,
    readiness: { detail: "", percentage: 100, status: "ready" as const },
    services: [],
    stats: [],
  }
  const live = { home, isError: false, isOffline: false, isPending: false }
  expect(applyMemberHomeQaState("payments-on", live).home?.actions).toEqual({
    canRecordPayment: true,
  })
  expect(applyMemberHomeQaState("payments-off", live).home?.actions).toEqual({
    canRecordPayment: false,
  })
  expect(applyMemberHomeQaState("payments-off", { ...live, home: null }).home).toBeNull()
})
