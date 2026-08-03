import { Skeleton } from "@halaalvest/ui/components/skeleton"
import { WorkspacePageShell } from "@/components/dashboard"

export function MemberSignupLinksPageSkeleton() {
  return (
    <WorkspacePageShell
      description="Control who can start member signup and manage staff-issued signup links."
      eyebrow="Membership"
      title="Member signup links"
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
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-2 h-4 w-full max-w-xl" />
        <div className="mt-4 border-y border-border/70">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              className="grid gap-4 border-b border-border/70 py-5 last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto]"
              key={index}
            >
              <div>
                <Skeleton className="h-4 w-40" />
                <Skeleton className="mt-2 h-3 w-full max-w-md" />
              </div>
              <Skeleton className="h-11 w-full md:h-10 md:w-32" />
            </div>
          ))}
        </div>
      </section>
    </WorkspacePageShell>
  )
}
