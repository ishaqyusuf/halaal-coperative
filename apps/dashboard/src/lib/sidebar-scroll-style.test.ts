import { describe, expect, test } from "bun:test"

describe("dashboard sidebar scrolling", () => {
  test("keeps one scrollable navigation region with hidden scrollbar tracks", async () => {
    const sidebar = await Bun.file(
      new URL("../components/dashboard/sidebar.tsx", import.meta.url),
    ).text()
    const mobileSheet = await Bun.file(
      new URL("../components/sheets/dashboard-sidebar-sheet.tsx", import.meta.url),
    ).text()
    const globalStyles = await Bun.file(
      new URL(
        "../../../../packages/ui/src/styles/globals.css",
        import.meta.url,
      ),
    ).text()

    expect(sidebar).toContain(
      "scrollbar-hide mt-4 min-h-0 w-full flex-1 overflow-x-hidden overflow-y-auto",
    )
    expect(sidebar).toContain("flex-shrink-0 overflow-hidden border-r")
    expect(mobileSheet).toContain("overflow-hidden md:hidden")
    expect(globalStyles).toContain(".scrollbar-hide::-webkit-scrollbar")
    expect(globalStyles).toContain("scrollbar-width: none")
  })
})
