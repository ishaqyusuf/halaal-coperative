"use client"

import { MemberSignupLinkContent } from "@/components/signup-links/member-signup-link-content"
import type {
  MemberSignupLinkView,
  SignupAccessMode,
} from "@/components/signup-links/member-signup-link-content"
import { MemberSignupLinkSheetHeader } from "@/components/signup-links/member-signup-link-sheet-header"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useMemberSignupLinkParams } from "@/hooks/use-member-signup-link-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

export function MemberSignupLinkSheet({
  defaultMode,
  links,
}: {
  defaultMode: SignupAccessMode
  links: MemberSignupLinkView[]
}) {
  const { setParams, signupLinkId, signupLinkSheetType } =
    useMemberSignupLinkParams()
  const selectedLink =
    signupLinkSheetType === "edit"
      ? (links.find((link) => link.id === signupLinkId) ?? null)
      : null
  const title =
    signupLinkSheetType === "access"
      ? "Member signup gate"
      : signupLinkSheetType === "create"
        ? "Create a staff signup link"
        : signupLinkSheetType === "edit"
          ? "Edit signup link"
          : "Signup links"
  const description =
    signupLinkSheetType === "create"
      ? "Generate a controlled signup URL for remote applicants when public signup is closed."
      : "Manage member signup access and staff-issued signup links from a focused workflow."
  const isOpen = Boolean(signupLinkSheetType)
  const presentation = getWorkflowPresentation(
    "memberSignupLink",
    signupLinkSheetType
  )

  function closeSheet() {
    void setParams({
      signupLinkId: null,
      signupLinkSheetType: null,
    })
  }

  return (
    <WorkflowPresentation
      config={presentation}
      open={isOpen}
      onOpenChange={(open) => !open && closeSheet()}
    >
        {isOpen ? (
          <>
            <MemberSignupLinkSheetHeader
              description={description}
              presentation={
                presentation.presentation === "sheet" ? "sheet" : "dialog"
              }
              title={title}
            />
            <div className="px-6">
              <MemberSignupLinkContent
                defaultMode={defaultMode}
                selectedLink={selectedLink}
                signupLinkSheetType={signupLinkSheetType}
              />
            </div>
          </>
        ) : null}
    </WorkflowPresentation>
  )
}
