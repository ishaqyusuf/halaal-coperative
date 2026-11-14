"use client"

import { Button } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import { PlusIcon } from "lucide-react"
import { useSupportCaseParams } from "@/hooks/use-support-case-params"

/** The page's one main action: "Ask for help" (member) or "New case" (staff). */
export function OpenSupportCaseCreateSheet({
  className,
  mode,
}: {
  className?: string
  mode: "member" | "staff"
}) {
  const { setParams } = useSupportCaseParams()

  return (
    <Button
      className={cn("h-12 px-5 text-base", className)}
      onClick={() =>
        void setParams({
          supportCaseId: null,
          supportCaseSheetType: mode === "member" ? "member-create" : "create",
        })
      }
      type="button"
    >
      <PlusIcon data-icon="inline-start" />
      {mode === "member" ? "Ask for help" : "New case"}
    </Button>
  )
}
