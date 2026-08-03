import { Skeleton } from "@halaalvest/ui/components/skeleton"
import { WorkspacePageShell } from "@/components/dashboard"

export function TrustSettingsPageSkeleton() {
  return (
    <WorkspacePageShell
      actions={<Skeleton className="h-11 w-full md:h-10 md:w-40" />}
      description="Pilot-facing posture for legal readiness, exports, monitoring, feature requests, reliability, and safe error handling."
      eyebrow="Settings"
      title="Trust readiness"
    >
      <section className="hidden gap-4 md:grid md:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="rounded-lg border border-border/70 p-4" key={index}>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-4 h-8 w-20" />
            <Skeleton className="mt-3 h-4 w-full" />
          </div>
        ))}
      </section>

      <section>
        <Skeleton className="h-5 w-56" />
        <Skeleton className="mt-2 h-4 w-full max-w-2xl" />
        <div className="mt-4 divide-y divide-border/70 border-y border-border/70">
          {Array.from({ length: 6 }, (_, index) => (
            <div className="grid gap-3 py-5 md:grid-cols-2" key={index}>
              <div>
                <Skeleton className="h-4 w-48" />
                <Skeleton className="mt-3 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-4/5" />
              </div>
              <div className="md:justify-self-end">
                <Skeleton className="h-9 w-full md:w-28" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <Skeleton className="h-5 w-44" />
        <Skeleton className="mt-2 h-4 w-full max-w-2xl" />
        <div className="mt-4 divide-y divide-border/70 border-y border-border/70">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="grid gap-3 py-4 md:grid-cols-2" key={index}>
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-full md:ml-auto md:w-44" />
            </div>
          ))}
        </div>
      </section>
    </WorkspacePageShell>
  )
}
