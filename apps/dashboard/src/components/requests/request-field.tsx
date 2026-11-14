import type { ReactNode } from "react"
import { cn } from "@halaalvest/ui/lib/utils"

/** A form field with a large, plain label. "Optional" marks what can be left out. */
export function RequestField({
  children,
  className,
  hint,
  label,
  optional = false,
}: {
  children: ReactNode
  className?: string
  hint?: string
  label: string
  optional?: boolean
}) {
  return (
    <label className={cn("grid gap-2", className)}>
      <span className="text-base font-medium text-foreground">
        {label}
        {optional ? (
          <span className="font-normal text-muted-foreground"> (optional)</span>
        ) : null}
      </span>
      {children}
      {hint ? (
        <span className="text-sm text-muted-foreground">{hint}</span>
      ) : null}
    </label>
  )
}

/** The form's main button row: full width on phones. */
export function RequestFormActions({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-3 border-t border-border pt-5 sm:flex sm:flex-wrap sm:items-center [&_button]:h-12 [&_button]:w-full sm:[&_button]:w-auto">
      {children}
    </div>
  )
}
