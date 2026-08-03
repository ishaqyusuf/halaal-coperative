import { Skeleton } from "@halaalvest/ui/components/skeleton"
import { WorkspacePageShell } from "@/components/dashboard"

export function OperationProfileSettingsPageSkeleton() {
  return (
    <WorkspacePageShell
      description="Choose which cooperative services are offered and how members can access them."
      eyebrow="Settings"
      title="Operation profile"
    >
      <section className="hidden gap-4 md:grid md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div className="rounded-lg border border-border/70 p-4" key={index}>
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-4 h-8 w-16" />
            <Skeleton className="mt-3 h-4 w-full" />
          </div>
        ))}
      </section>

      <section>
        <Skeleton className="h-5 w-36" />
        <Skeleton className="mt-2 h-4 w-full max-w-xl" />
        <div className="mt-4 border-y border-border/70">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              className="flex min-h-16 items-center justify-between gap-4 border-b border-border/70 py-3 last:border-b-0"
              key={index}
            >
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="mt-2 h-3 w-full max-w-md" />
              </div>
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </div>
      </section>
    </WorkspacePageShell>
  )
}
