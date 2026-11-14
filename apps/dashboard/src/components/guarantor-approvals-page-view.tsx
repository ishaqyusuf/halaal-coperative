import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { buttonVariants } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import { MemberGuarantorApprovalsView } from "@/components/member-guarantor-approvals-view"
import { GuarantorApprovalSheet } from "@/components/sheets/guarantor-approval-sheet"
import type { GuarantorApprovalsPageData } from "@/lib/guarantor-approvals/load-guarantor-approvals-page"

const description = "Members who asked you to be their guarantor."

export function GuarantorApprovalsPageView({
  data,
}: {
  data: GuarantorApprovalsPageData
}) {
  return (
    <WorkspacePageShell
      description={description}
      eyebrow="Guarantor"
      title="Guarantor requests"
    >
      {data.state === "staff" ? (
        <div className="grid gap-4">
          <WorkspaceEmptyState
            body="Members answer their own guarantor requests here. To record an answer given to you, open the request on Loans."
            title="This page is for members."
          />
          <Link
            className={cn(buttonVariants(), "h-11 w-fit text-base")}
            href="/loans"
          >
            Go to Loans
          </Link>
        </div>
      ) : data.state === "unavailable" ? (
        <WorkspaceEmptyState
          body="Please try again later."
          title="Guarantor requests cannot be shown right now."
        />
      ) : data.state === "member-profile-missing" ? (
        <WorkspaceEmptyState
          body="Your account is not linked to a member yet. Please contact the cooperative."
          title="We could not find your member record."
        />
      ) : (
        <>
          <MemberGuarantorApprovalsView
            canAnswer={data.canAnswer}
            requests={data.requests}
          />
          <GuarantorApprovalSheet requests={data.requests} />
        </>
      )}
    </WorkspacePageShell>
  )
}
