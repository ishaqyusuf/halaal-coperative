"use client"

import type { ReactNode } from "react"
import { cn } from "@halaal-vest/ui/lib/utils"

export type HeaderProps = {
  children?: ReactNode
  className?: string
  left?: ReactNode
  right?: ReactNode
}

export function Header({ children, className, left, right }: HeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex min-h-[72px] items-center gap-4 border-b border-border/70 bg-background/90 px-4 backdrop-blur sm:px-6 lg:px-8",
        className,
      )}
    >
      {left}
      <div className="min-w-0 flex-1">{children}</div>
      {right}
    </header>
  )
}
