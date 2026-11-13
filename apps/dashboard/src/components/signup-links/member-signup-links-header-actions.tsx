"use client"

import { Button } from "@halaalvest/ui/components/button"
import { PlusIcon } from "lucide-react"
import { useMemberSignupLinkParams } from "@/hooks/use-member-signup-link-params"

export function MemberSignupLinksHeaderActions() {
  const { setParams } = useMemberSignupLinkParams()

  return (
    <Button
      className="h-11 md:h-10"
      onClick={() =>
        setParams({ signupLinkId: null, signupLinkSheetType: "create" })
      }
      type="button"
    >
      <PlusIcon />
      New link
    </Button>
  )
}
