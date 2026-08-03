"use client"

import { Button } from "@halaalvest/ui/components/button"
import { PlusIcon, Settings2Icon } from "lucide-react"
import { useMemberSignupLinkParams } from "@/hooks/use-member-signup-link-params"

export function MemberSignupLinksHeaderActions() {
  const { setParams } = useMemberSignupLinkParams()

  return (
    <>
      <Button
        aria-label="Create signup link"
        className="size-11 md:h-10 md:w-auto md:px-4"
        onClick={() =>
          setParams({ signupLinkId: null, signupLinkSheetType: "create" })
        }
        type="button"
      >
        <PlusIcon />
        <span className="sr-only md:not-sr-only">Create link</span>
      </Button>
      <Button
        aria-label="Edit member signup gate"
        className="size-11 md:h-10 md:w-auto md:px-4"
        onClick={() =>
          setParams({ signupLinkId: null, signupLinkSheetType: "access" })
        }
        type="button"
        variant="outline"
      >
        <Settings2Icon />
        <span className="sr-only md:not-sr-only">Signup gate</span>
      </Button>
    </>
  )
}
