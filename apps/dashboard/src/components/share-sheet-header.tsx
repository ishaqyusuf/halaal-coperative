"use client"

import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import { useShareParams } from "@/hooks/use-share-params"

const copy = {
  create: {
    description: "The amount members put into shares each month, from a date.",
    title: "New monthly share amount",
  },
  edit: {
    description: "Fix the amount or the date it started.",
    title: "Change monthly share amount",
  },
  policy: {
    description: "How members hold shares in the cooperative.",
    title: "Shares",
  },
} as const

export function ShareSheetHeader() {
  const { shareType } = useShareParams()
  const text = copy[shareType === "create" || shareType === "policy" ? shareType : "edit"]

  return (
    <SheetHeader className="px-0">
      <SheetTitle className="text-xl">{text.title}</SheetTitle>
      <SheetDescription className="text-base">{text.description}</SheetDescription>
    </SheetHeader>
  )
}
