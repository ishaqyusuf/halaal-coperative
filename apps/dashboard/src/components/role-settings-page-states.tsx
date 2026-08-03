import { Skeleton } from "@halaalvest/ui/components/skeleton"
import { WorkspacePageShell } from "@/components/dashboard"

export function RoleSettingsPageSkeleton() {
  return (
    <WorkspacePageShell
      description="Staff provisioning, default-role visibility, and module permission guidance for cooperative operators."
      eyebrow="Settings"
      title="Workspace roles"
    >
      <section className="hidden gap-4 md:grid md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div className="rounded-lg border border-border/70 p-4" key={index}>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-4 h-8 w-12" />
            <Skeleton className="mt-3 h-4 w-full" />
          </div>
        ))}
      </section>

      <div className="flex gap-5 border-b border-border/70 pb-3">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-28" />
      </div>

      <section>
        <Skeleton className="h-5 w-56" />
        <Skeleton className="mt-2 h-4 w-full max-w-xl" />
        <Skeleton className="mt-4 h-10 w-full lg:ml-auto lg:w-64" />
        <div className="mt-4 border-y border-border/70">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              className="border-b border-border/70 py-4 last:border-b-0"
              key={index}
            >
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-2 h-4 w-64 max-w-full" />
              <Skeleton className="mt-3 h-6 w-32" />
            </div>
          ))}
        </div>
      </section>
    </WorkspacePageShell>
  )
}
