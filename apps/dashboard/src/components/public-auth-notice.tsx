import type { ReactNode } from "react"
import { cn } from "@halaalvest/ui/lib/utils"

const noticeToneClassNames = {
  error: "border-destructive/40 bg-destructive/5 text-destructive",
  success:
    "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-500/50 dark:bg-emerald-950/30 dark:text-emerald-100",
  info: "border-border bg-muted text-foreground",
} as const

export function PublicAuthNotice({
  children,
  className,
  title,
  tone = "info",
}: {
  children?: ReactNode
  className?: string
  title?: ReactNode
  tone?: keyof typeof noticeToneClassNames
}) {
  return (
    <div
      className={cn(
        "rounded-(--ui-radius-control) border px-4 py-3 text-lg leading-relaxed",
        noticeToneClassNames[tone],
        className
      )}
      role={tone === "error" ? "alert" : "status"}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className={title ? "mt-1" : undefined}>{children}</div> : null}
    </div>
  )
}

// Text link styled for the public pages: large, underlined, brand green.
export const publicAuthLinkClassName =
  "inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4"
