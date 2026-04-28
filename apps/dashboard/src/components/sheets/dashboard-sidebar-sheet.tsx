"use client"

import type { ReactNode } from "react"

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
    <div
      className={`fixed inset-0 z-50 bg-background/70 backdrop-blur-sm transition md:hidden ${
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      onClick={() => onOpenChange(false)}
    >
      <aside
        className={`absolute inset-y-0 left-0 flex w-[min(calc(100vw-2rem),22rem)] max-w-[calc(100vw-2rem)] flex-col border-r border-border bg-background shadow-[0_24px_80px_rgba(15,23,42,0.2)] transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </aside>
    </div>
  )
}
