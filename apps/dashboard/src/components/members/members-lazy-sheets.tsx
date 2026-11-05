"use client"

import dynamic from "next/dynamic"
import { useState, type ComponentProps } from "react"
import type { MemberImportSheet } from "@/components/sheets/member-import-sheet"
import type { MemberSheet as MemberSheetComponent } from "@/components/sheets/member-sheet"
import { useMemberParams } from "@/hooks/use-member-params"

// next/dynamic only code-splits from a client component. Each sheet's chunk
// (forms, import grid, SheetJS loader) is fetched the first time the URL opens
// it, then stays mounted so close animations and follow-up sheets still run.
const LoadedMemberImportSheet = dynamic(() =>
  import("@/components/sheets/member-import-sheet").then(
    (mod) => mod.MemberImportSheet
  )
)
const LoadedMemberSheet = dynamic(() =>
  import("@/components/sheets/member-sheet").then((mod) => mod.MemberSheet)
)

function useOpenedOnce(isOpen: boolean) {
  const [opened, setOpened] = useState(isOpen)

  if (isOpen && !opened) {
    setOpened(true)
  }

  return opened || isOpen
}

export function MemberImportPanel(
  props: ComponentProps<typeof MemberImportSheet>
) {
  const { memberSheetType } = useMemberParams()
  const mounted = useOpenedOnce(props.open ?? memberSheetType === "import")

  return mounted ? <LoadedMemberImportSheet {...props} /> : null
}

export function MemberSheet(
  props: ComponentProps<typeof MemberSheetComponent>
) {
  const { memberSheetType } = useMemberParams()
  const mounted = useOpenedOnce(
    memberSheetType === "create" || memberSheetType === "status"
  )

  return mounted ? <LoadedMemberSheet {...props} /> : null
}
