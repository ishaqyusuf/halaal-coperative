import * as React from "react"
import { cn } from "@halaal-vest/ui/lib/utils"

function Checkbox({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type="checkbox"
      data-slot="checkbox"
      className={cn(
        "h-4 w-4 rounded-[0.35rem] border border-input bg-background text-primary shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/20",
        className,
      )}
      {...props}
    />
  )
}

export { Checkbox }
