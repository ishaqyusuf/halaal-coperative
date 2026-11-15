import { describe, expect, test } from "bun:test"
import { readSupportCaseAssignee } from "./support-assignee"

function form(value?: string) {
  const formData = new FormData()
  if (value !== undefined) formData.set("assignedToUserId", value)
  return formData
}

describe("readSupportCaseAssignee", () => {
  test("a user id assigns the case", () => {
    expect(readSupportCaseAssignee(form(" user-1 "))).toBe("user-1")
  })

  test("`none` takes the case off everyone", () => {
    expect(readSupportCaseAssignee(form("none"))).toBeNull()
  })

  test("a missing or empty field keeps the current assignee", () => {
    expect(readSupportCaseAssignee(form())).toBeUndefined()
    expect(readSupportCaseAssignee(form(""))).toBeUndefined()
  })
})
