import { cn } from "@halaalvest/ui/lib/utils"

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
        "bg-dashboard-canvas min-h-[calc(100svh-72px)] px-4 py-6 sm:px-6 lg:px-8",
        className
      )}
    >
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        {children}
      </div>
    </main>
  )
}
