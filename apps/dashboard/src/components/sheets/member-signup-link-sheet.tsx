"use client"

import { Sheet, SheetContent } from "@halaalvest/ui/components/sheet"
import { MemberSignupLinkContent } from "@/components/signup-links/member-signup-link-content"
import type {
  MemberSignupLinkView,
  SignupAccessMode,
} from "@/components/signup-links/member-signup-link-content"
import { MemberSignupLinkSheetHeader } from "@/components/signup-links/member-signup-link-sheet-header"
import { useMemberSignupLinkParams } from "@/hooks/use-member-signup-link-params"

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
      ? links.find((link) => link.id === signupLinkId)
      : null
  const title =
    signupLinkSheetType === "access"
      ? "Member signup gate"
      : signupLinkSheetType === "create"
        ? "Create signup link"
        : signupLinkSheetType === "edit"
          ? "Edit signup link"
          : "Signup links"
  const isOpen = Boolean(signupLinkSheetType)

  function closeSheet() {
    void setParams({
      signupLinkId: null,
      signupLinkSheetType: null,
    })
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeSheet()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        {isOpen ? (
          <>
            <MemberSignupLinkSheetHeader title={title} />
            <div className="px-6">
              <MemberSignupLinkContent
                defaultMode={defaultMode}
                selectedLink={selectedLink}
                signupLinkSheetType={signupLinkSheetType}
              />
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
