import type { ReactNode } from "react"

export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border border-border/70 border-t-0 bg-card px-4 py-3">
      {children}
    </div>
  )
}
