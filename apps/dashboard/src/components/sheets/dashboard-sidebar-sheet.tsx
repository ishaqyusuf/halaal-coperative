"use client"

import type { ReactNode } from "react"
import { Sheet, SheetContent } from "@halaalvest/ui/components/sheet"

export function DashboardSidebarSheet({
  children,
  onOpenChange,
  open,
}: {
  children: ReactNode
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-[min(calc(100vw-2rem),22rem)] max-w-[calc(100vw-2rem)] overflow-hidden md:hidden"
      >
        {children}
      </SheetContent>
    </Sheet>
  )
}
