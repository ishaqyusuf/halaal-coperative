"use client"

import { useState, type ReactNode } from "react"
import { Button } from "@halaalvest/ui/components/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import { cn } from "@halaalvest/ui/lib/utils"

export function MigrationActionSheet({
  bodyClassName = "px-6",
  children,
  contentClassName = "w-full overflow-y-auto sm:max-w-2xl",
  description,
  disabled,
  eyebrow,
  title,
  triggerClassName,
  triggerLabel,
  variant = "outline",
}: {
  bodyClassName?: string
  children: ReactNode
  contentClassName?: string
  description: string
  disabled?: boolean
  eyebrow?: string
  title: ReactNode
  triggerClassName?: string
  triggerLabel: string
  variant?: "default" | "outline"
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        className={triggerClassName}
        disabled={disabled}
        onClick={() => setOpen(true)}
        size="sm"
        type="button"
        variant={variant}
      >
        {triggerLabel}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className={contentClassName}>
          <SheetHeader>
            {eyebrow ? (
              <p className="text-xs font-medium text-muted-foreground uppercase">
                {eyebrow}
              </p>
            ) : null}
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          <div className={cn(bodyClassName)}>{children}</div>
        </SheetContent>
      </Sheet>
    </>
  )
}
