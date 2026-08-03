import type { Metadata } from "next"
import {
  MemberSignupLinksUnavailableView,
  MemberSignupLinksView,
} from "@/components/signup-links/member-signup-links-view"
import { loadMemberSignupLinkParams } from "@/hooks/use-member-signup-link-params"
import { loadMemberSignupLinksPage } from "@/lib/signup-links/load-member-signup-links-page"

export const metadata: Metadata = {
  title: "Member signup links | Halaalvest",
}

export default async function MemberSignupLinksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await loadMemberSignupLinkParams(await searchParams)
  const state = await loadMemberSignupLinksPage()

  if (state.status === "unavailable") {
    return (
      <MemberSignupLinksUnavailableView body={state.body} title={state.title} />
    )
  }

  return (
    <MemberSignupLinksView
      availableLinks={state.availableLinks}
      defaultMode={state.defaultMode}
      links={state.links}
      totalApproved={state.totalApproved}
      totalSignups={state.totalSignups}
    />
  )
}
