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
