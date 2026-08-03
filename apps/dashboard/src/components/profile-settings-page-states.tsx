import { Skeleton } from "@halaalvest/ui/components/skeleton"
import { WorkspacePageShell } from "@/components/dashboard"

export function ProfileSettingsPageSkeleton() {
  return (
    <WorkspacePageShell
      actions={<Skeleton className="h-11 w-full md:h-10 md:w-32" />}
      description="Core cooperative identity and onboarding profile details persisted during workspace setup."
      eyebrow="Settings"
      title="Cooperative profile"
    >
      <section className="hidden gap-4 md:grid md:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="rounded-lg border border-border/70 p-4" key={index}>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-4 h-8 w-28" />
            <Skeleton className="mt-3 h-4 w-full" />
          </div>
        ))}
      </section>

      <section>
        <Skeleton className="h-5 w-52" />
        <Skeleton className="mt-2 h-4 w-full max-w-2xl" />
        <div className="mt-8 space-y-8">
          {Array.from({ length: 3 }, (_, sectionIndex) => (
            <div key={sectionIndex}>
              <Skeleton className="h-5 w-36" />
              <Skeleton className="mt-2 h-4 w-full max-w-xl" />
              <div className="mt-4 divide-y divide-border/70 border-y border-border/70">
                {Array.from(
                  { length: sectionIndex === 2 ? 1 : 4 },
                  (_, fieldIndex) => (
                    <div
                      className="grid gap-2 py-4 sm:grid-cols-2"
                      key={fieldIndex}
                    >
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-full sm:ml-auto sm:w-48" />
                    </div>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </WorkspacePageShell>
  )
}
