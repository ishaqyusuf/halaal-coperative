import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { getMembershipApprovalsListInput } from "./list-input"

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8")
}

describe("membership approvals Midday conformance", () => {
  test("shares one normalized list input between server prefetch and client query", () => {
    const input = getMembershipApprovalsListInput(
      {
        search: "Amina",
        status: "pending_approval",
      },
      ["submittedAt", "asc"]
    )

    expect(input).toEqual({
      q: "Amina",
      sort: ["submittedAt", "asc"],
      status: "pending_approval",
    })
    expect(
      getMembershipApprovalsListInput({ search: null, status: "unknown" }, [
        "bad",
        "sideways",
      ])
    ).toEqual({
      q: undefined,
      sort: null,
      status: undefined,
    })
  })

  test("keeps approval reads behind the member-management permission", () => {
    const router = read("../../../../api/src/routers/onboarding.route.ts")

    expect(router).toContain(
      'roleCan(ctx.auth.activeMembership.role, "manage_members")'
    )
    expect(router).toContain(
      "membershipApprovalSummary: membershipApprovalProcedure"
    )
    expect(router).toContain("membershipApprovals: membershipApprovalProcedure")
  })

  test("uses responsive mobile items, drawers, and breakpoint-aware skeletons", () => {
    const page = read("../../app/(app)/(sidebar)/membership-approvals/page.tsx")
    const view = read("../../components/membership-approvals-view.tsx")
    const header = read("../../components/membership-approvals-header.tsx")
    const toolbar = read(
      "../../components/membership-approvals-mobile-toolbar.tsx"
    )
    const dataView = read(
      "../../components/tables/membership-approvals/data-view.tsx"
    )
    const mobileItem = read(
      "../../components/tables/membership-approvals/mobile-item.tsx"
    )
    const skeleton = read(
      "../../components/tables/membership-approvals/skeleton.tsx"
    )

    expect(page).toContain("export const metadata")
    expect(view).toContain('className="hidden md:block"')
    expect(header).toContain("<MembershipApprovalsMobileToolbar")
    expect(toolbar).toContain("<MembershipApprovalsFilterDrawer")
    expect(toolbar).toContain("<MobileActionsDrawer")
    expect(dataView).toContain("<ResponsiveDataView")
    expect(dataView).toContain("mobile={<MembershipApprovalsMobileList />}")
    expect(mobileItem).toContain('from "@halaalvest/ui/components/item"')
    expect(mobileItem).toContain("<dl")
    expect(mobileItem).toContain("Request status")
    expect(skeleton).toContain('className="md:hidden"')
    expect(skeleton).toContain("<MembershipApprovalsMobileSkeleton")
  })

  test("provides a retryable route error boundary", () => {
    const boundary = read(
      "../../app/(app)/(sidebar)/membership-approvals/error.tsx"
    )

    expect(boundary).toContain('"use client"')
    expect(boundary).toContain("reset")
    expect(boundary).toContain("Try again")
    expect(boundary).toContain("membership approval queue")
    expect(boundary).not.toContain("error.message")
    expect(boundary).not.toContain("error.stack")
  })
})
