"use client"

import type { ReactNode } from "react"
import { Button } from "@halaalvest/ui/components/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@halaalvest/ui/components/drawer"

export function MobileFilterDrawer({
  children,
  description,
  onApply,
  onClear,
  onOpenChange,
  open,
  title,
}: {
  children: ReactNode
  description: string
  onApply: () => void
  onClear: () => void
  onOpenChange: (open: boolean) => void
  open: boolean
  title: string
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90dvh]">
        <DrawerHeader className="border-b border-border text-left">
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
          {children}
        </div>

        <DrawerFooter className="border-t border-border pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="grid grid-cols-2 gap-2">
            <Button
              className="h-11"
              onClick={onClear}
              type="button"
              variant="outline"
            >
              Clear all
            </Button>
            <Button className="h-11" onClick={onApply} type="button">
              Apply filters
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
