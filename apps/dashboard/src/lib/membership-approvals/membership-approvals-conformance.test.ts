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
    expect(router).toContain("membershipApproval: membershipApprovalProcedure")
  })

  test("uses responsive mobile items, a filter drawer, and breakpoint-aware skeletons", () => {
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
    expect(view).toContain("<MembershipApprovalsSummary />")
    expect(header).toContain("<MembershipApprovalsMobileToolbar")
    expect(toolbar).toContain("<MembershipApprovalsFilterDrawer")
    // The only extra action is a plain link, so there is no actions drawer.
    expect(toolbar).not.toContain("<MobileActionsDrawer")
    expect(dataView).toContain("<ResponsiveDataView")
    expect(dataView).toContain("mobile={<MembershipApprovalsMobileList />}")
    expect(mobileItem).toContain('from "@halaalvest/ui/components/item"')
    expect(mobileItem).toContain("membershipRequestId: request.id")
    expect(mobileItem).not.toContain("MobileActionsDrawer")
    expect(skeleton).toContain('className="md:hidden"')
    expect(skeleton).toContain("<MembershipApprovalsMobileSkeleton")
  })

  test("reviews a request in a URL-addressed sheet; the old route redirects", () => {
    const detailRoute = read(
      "../../app/(app)/(sidebar)/membership-approvals/[requestId]/page.tsx"
    )
    const sheet = read("../../components/sheets/membership-approval-sheet.tsx")
    const globalSheets = read("../../components/sheets/global-sheets.tsx")
    const form = read("../../components/onboarding/membership-approval-form.tsx")

    expect(detailRoute).toContain("tenantRedirect")
    expect(detailRoute).toContain("membershipRequestId=")
    expect(sheet).toContain('getWorkflowPresentation("membershipApproval", "review")')
    expect(globalSheets).toContain("<MembershipApprovalSheet />")
    // Declining is consequential: a real AlertDialog with an optional reason.
    expect(form).toContain("<AlertDialogContent>")
    expect(form).toContain("trpc.onboarding.pathKey()")
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
