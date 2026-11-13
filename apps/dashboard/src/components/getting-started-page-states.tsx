import { Skeleton } from "@halaalvest/ui/components/skeleton"
import { Card, CardContent, CardHeader } from "@halaalvest/ui/components/card"
import { DashboardPageShell } from "@/components/dashboard"

// Mirrors the Getting started layout: the step rail (a compact bar below lg)
// beside one step card with a sticky footer.
export function GettingStartedPageSkeleton() {
  return (
    <DashboardPageShell>
      <div
        aria-label="Loading migration setup"
        className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]"
        role="status"
      >
        <Skeleton className="h-24 w-full rounded-xl lg:hidden" />
        <Card className="hidden self-start lg:block">
          <CardContent className="flex flex-col gap-2">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton className="h-11 w-full" key={index} />
            ))}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-9 w-80 max-w-full" />
              <Skeleton className="h-5 w-full max-w-xl" />
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }, (_, index) => (
                  <Skeleton className="h-28 w-full" key={index} />
                ))}
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-between gap-3">
            <Skeleton className="h-11 w-28" />
            <Skeleton className="h-11 w-32" />
          </div>
        </div>
      </div>
    </DashboardPageShell>
  )
}
