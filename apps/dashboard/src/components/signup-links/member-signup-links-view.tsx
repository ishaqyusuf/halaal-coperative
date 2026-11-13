import {
  WorkspaceEmptyState,
  WorkspacePageShell,
} from "@/components/dashboard"
import { MemberSignupLinkManager } from "@/components/signup-links/member-signup-link-manager"
import { MemberSignupLinksHeaderActions } from "@/components/signup-links/member-signup-links-header-actions"
import {
  memberSignupLinksPageCopy,
  type MemberSignupLinkView,
  type SignupAccessMode,
} from "@/lib/signup-links/member-signup-links"

export function MemberSignupLinksUnavailableView({
  body,
  title,
}: {
  body: string
  title: string
}) {
  return (
    <WorkspacePageShell {...memberSignupLinksPageCopy}>
      <WorkspaceEmptyState title={title} body={body} />
    </WorkspacePageShell>
  )
}

export function MemberSignupLinksView({
  defaultMode,
  links,
}: {
  defaultMode: SignupAccessMode
  links: MemberSignupLinkView[]
}) {
  return (
    <WorkspacePageShell
      actions={<MemberSignupLinksHeaderActions />}
      {...memberSignupLinksPageCopy}
    >
      <MemberSignupLinkManager defaultMode={defaultMode} links={links} />
    </WorkspacePageShell>
  )
}
