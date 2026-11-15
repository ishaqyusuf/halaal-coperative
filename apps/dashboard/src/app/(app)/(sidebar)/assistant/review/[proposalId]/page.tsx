import type { Metadata } from "next"
import { AssistantProposalLink } from "@/components/general-assistant/assistant-link-pages"

export const metadata: Metadata = {
  title: "Review your draft | Halaalvest",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
}

/**
 * One assistant draft (`assistantHrefs.proposal`), shown on its own with the
 * normal Edit / Confirm / Cancel controls. Opening it never confirms or runs
 * anything; signed-out visitors go through `/login?next=<this path>`.
 */
export default async function AssistantReviewPage({
  params,
}: {
  params: Promise<{ proposalId: string }>
}) {
  const { proposalId } = await params
  return <AssistantProposalLink proposalId={proposalId} />
}
