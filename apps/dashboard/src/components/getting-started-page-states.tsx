import { Skeleton } from "@halaalvest/ui/components/skeleton"
import { Card, CardContent, CardHeader } from "@halaalvest/ui/components/card"
import { WorkspacePageShell } from "@/components/dashboard"

function StepListSkeleton({ count }: { count: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton className="h-16 w-full" key={index} />
      ))}
    </div>
  )
}

export function GettingStartedPageSkeleton() {
  return (
    <WorkspacePageShell
      actions={<Skeleton className="h-11 w-full md:h-10 md:w-36" />}
      description="Set the cooperative's migration path and complete each finance gate before live records open."
      eyebrow="Initial migration"
      title="Getting started"
    >
      <div aria-label="Loading migration setup" role="status">
        <div className="flex gap-2 overflow-hidden pb-2 xl:hidden">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton className="h-16 min-w-40" key={index} />
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
          <Card className="hidden self-start xl:block">
            <CardHeader>
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent>
              <StepListSkeleton count={6} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-7 w-64 max-w-full" />
              <Skeleton className="h-4 w-full max-w-2xl" />
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 6 }, (_, index) => (
                  <div key={index}>
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="mt-2 h-11 w-full md:h-9" />
                  </div>
                ))}
              </div>
              <div className="mt-6 grid grid-cols-2 gap-2 border-t pt-5 sm:flex sm:justify-between">
                <Skeleton className="h-11 w-full sm:w-28 md:h-10" />
                <Skeleton className="h-11 w-full sm:w-28 md:h-10" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </WorkspacePageShell>
  )
}
