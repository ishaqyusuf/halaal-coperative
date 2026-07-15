import { GuarantorApprovalsPageView } from "@/components/guarantor-approvals-page-view"
import { loadGuarantorApprovalParams } from "@/hooks/use-guarantor-approval-params"
import { loadGuarantorApprovalsPageData } from "@/lib/guarantor-approvals/load-guarantor-approvals-page"

export default async function GuarantorApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  loadGuarantorApprovalParams(await searchParams)
  const data = await loadGuarantorApprovalsPageData()

  return <GuarantorApprovalsPageView data={data} />
}
