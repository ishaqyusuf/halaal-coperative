import { describe, expect, test } from "bun:test"
import { getImportListInput } from "./import-list-input"

describe("getImportListInput", () => {
  test("normalizes the shared server and client query input", () => {
    expect(
      getImportListInput({
        importKind: "members",
        q: "Amina",
        sort: ["createdAt", "desc"],
        status: "draft",
      })
    ).toEqual({
      importType: "members",
      q: "Amina",
      sort: ["createdAt", "desc"],
      status: "draft",
    })
  })

  test("drops invalid URL filter and sort values", () => {
    expect(
      getImportListInput({
        q: "",
        sort: ["unknown", "sideways"],
        status: "unknown",
      })
    ).toEqual({
      importType: undefined,
      q: undefined,
      sort: null,
      status: undefined,
    })
  })
})
