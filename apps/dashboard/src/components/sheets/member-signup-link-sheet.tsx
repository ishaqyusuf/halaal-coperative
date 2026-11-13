"use client"

import { MemberSignupLinkContent } from "@/components/signup-links/member-signup-link-content"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { WorkflowPresentationHeader } from "@/components/workflow-presentation-header"
import { useMemberSignupLinkParams } from "@/hooks/use-member-signup-link-params"
import type {
  MemberSignupLinkView,
  SignupAccessMode,
} from "@/lib/signup-links/member-signup-links"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

const headerCopy = {
  access: {
    description: "New members still need your approval.",
    title: "Who can join online",
  },
  create: {
    description: "Share it by message. New members still need your approval.",
    title: "New joining link",
  },
  edit: { description: "Change the name, last day or limit.", title: "Edit link" },
} as const

// Access, create and edit are short forms for a secondary record, so all
// three are dialogs (ADR-20261105 SL1–SL3).
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
      {signupLinkSheetType ? (
        <div className="grid gap-6">
          <WorkflowPresentationHeader
            description={headerCopy[signupLinkSheetType].description}
            presentation={presentation.presentation}
            title={headerCopy[signupLinkSheetType].title}
          />
          <MemberSignupLinkContent
            defaultMode={defaultMode}
            selectedLink={selectedLink}
            signupLinkSheetType={signupLinkSheetType}
          />
        </div>
      ) : null}
    </WorkflowPresentation>
  )
}
