import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { getBusinessesListInput } from "./business-list-input"
import {
  getBusinessStatusWord,
  getProfitEntryWord,
  getSeasonWord,
} from "./business-words"

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8")
}

describe("business page", () => {
  test("prefetches only the open tab and sheet, with one shared list input", () => {
    const page = read("../../app/(app)/(sidebar)/business/page.tsx")
    const query = read("../../hooks/use-business-list-query.ts")

    expect(page).toContain("batchPrefetch([")
    expect(page).toContain("getBusinessesListInput({ q, status })")
    expect(page).toContain('view === "seasons"')
    expect(page).not.toContain("setQueryData")
    expect(query).toContain("useSuspenseInfiniteQuery")
    expect(query).toContain("getBusinessesListInput")
    expect(query).not.toContain("refetchInterval")
  })

  test("drops empty filters from the list input", () => {
    expect(getBusinessesListInput({ q: "  ", status: null })).toEqual({
      pageSize: 25,
    })
    expect(getBusinessesListInput({ q: " farm ", status: "active" })).toEqual({
      pageSize: 25,
      q: "farm",
      status: "active",
    })
  })

  test("has no second page heading and keeps its own boundaries", () => {
    const view = read("../../components/business-page-view.tsx")
    const states = read("../../components/business-page-states.tsx")
    const error = read("../../app/(app)/(sidebar)/business/error.tsx")

    for (const source of [view, states, error]) {
      expect(source).not.toContain("<h1")
      expect(source).toContain("WorkspacePageShell")
    }
    expect(error).toContain("dashboard.business_error_boundary")
  })

  test("asks before money steps with a real AlertDialog naming the amount", () => {
    const forms = read("../../components/business/business-forms.tsx")
    const season = read("../../components/business/profit-season-details.tsx")

    expect(forms).toContain("<RequestConfirmDialog")
    expect(forms).toContain("title={`Record ${formatCurrency(")
    expect(season).toContain("title={`Close ${season.name}?`}")
    expect(season).toContain("title={`Share ${formatCurrency(season.sharesTotal)}")
    expect(season).toContain("crypto.randomUUID()")
  })

  test("uses plain words", () => {
    expect(getBusinessStatusWord("active").label).toBe("Running")
    expect(getBusinessStatusWord("planned").label).toBe("Not started")
    expect(getSeasonWord("draft").label).toBe("Open")
    expect(getSeasonWord("approved").label).toBe("Ready to share")
    expect(getSeasonWord("published").label).toBe("Shared")
    expect(getProfitEntryWord({ isShared: false, status: "draft" }).label).toBe(
      "Recorded"
    )
    expect(
      getProfitEntryWord({ isShared: false, status: "reviewed" }).label
    ).toBe("Waiting to share")
    expect(getProfitEntryWord({ isShared: true, status: "reviewed" }).label).toBe(
      "Shared"
    )
  })
})
