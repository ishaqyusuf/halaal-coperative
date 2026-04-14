import { cn } from "@halaal-vest/ui/lib/utils"

export function DashboardPageFrame({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <main
      className={cn(
        "min-h-[calc(100svh-72px)] bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.035),_transparent_28%),linear-gradient(180deg,_rgba(255,255,255,1)_0%,_rgba(248,250,252,1)_100%)] px-4 py-6 sm:px-6 lg:px-8",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">{children}</div>
    </main>
  )
}
