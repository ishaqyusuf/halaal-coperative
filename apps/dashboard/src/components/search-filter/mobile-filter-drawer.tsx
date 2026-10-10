"use client"

import { useRef, useState, type ReactNode } from "react"
import { Button } from "@halaalvest/ui/components/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import { MobileFilterGroupsContext } from "./mobile-filter-group"

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
  onApply: () => void | Promise<unknown>
  onClear: () => void
  onOpenChange: (open: boolean) => void
  open: boolean
  title: string
}) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const focusReturn = useRef<HTMLElement | null>(
    typeof document === "undefined"
      ? null
      : (document.activeElement as HTMLElement)
  )

  async function apply() {
    setPending(true)
    setError(null)
    try {
      await onApply()
      onOpenChange(false)
    } catch {
      setError("Filters could not be applied. Try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next)
      }}
    >
      <SheetContent
        className="max-h-[90dvh] min-h-0 motion-reduce:transition-none"
        finalFocus={focusReturn}
        side="bottom"
      >
        <SheetHeader className="shrink-0 border-b border-border">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <MobileFilterGroupsContext.Provider value={{ expanded, setExpanded }}>
          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4"
            data-mobile-filter-content
          >
            {children}
          </div>
        </MobileFilterGroupsContext.Provider>
        <SheetFooter className="shrink-0 border-t border-border pb-[max(1rem,env(safe-area-inset-bottom))]">
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <Button
              className="h-11"
              disabled={pending}
              onClick={() => {
                onClear()
                setError(null)
              }}
              type="button"
              variant="outline"
            >
              Reset
            </Button>
            <Button
              className="h-11"
              disabled={pending}
              onClick={apply}
              type="button"
            >
              {pending ? "Applying…" : "Apply filters"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
