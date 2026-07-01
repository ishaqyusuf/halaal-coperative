import { describe, expect, test } from "bun:test"
import {
  memberImportColumns,
  normalizeMemberImportColumnSettings,
} from "./member-import-column-settings"

describe("member import column settings", () => {
  test("forces required columns visible and appends missing columns", () => {
    const settings = normalizeMemberImportColumnSettings({
      order: ["email", "memberNumber"],
      visible: {
        email: false,
        fullName: false,
        joinedAt: false,
        memberNumber: false,
        memberType: false,
        monthlyCommitment: false,
      },
    })

    expect(settings.order.slice(0, 2)).toEqual(["email", "memberNumber"])
    expect(settings.order).toHaveLength(memberImportColumns.length)
    expect(settings.visible.email).toBe(false)
    expect(settings.visible.memberNumber).toBe(true)
    expect(settings.visible.fullName).toBe(true)
    expect(settings.visible.memberType).toBe(true)
    expect(settings.visible.joinedAt).toBe(true)
    expect(settings.visible.monthlyCommitment).toBe(true)
  })
})
