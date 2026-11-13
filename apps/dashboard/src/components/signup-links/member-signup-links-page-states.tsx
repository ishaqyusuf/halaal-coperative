import { Skeleton } from "@halaalvest/ui/components/skeleton"
import { WorkspacePageShell } from "@/components/dashboard"
import { memberSignupLinksPageCopy } from "@/lib/signup-links/member-signup-links"

export function MemberSignupLinksPageSkeleton() {
  return (
    <WorkspacePageShell {...memberSignupLinksPageCopy}>
      <div className="grid gap-8">
        <div className="grid gap-3 border-b border-border/70 pb-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 h-6 w-56" />
          </div>
          <Skeleton className="h-11 w-full md:h-10 md:w-28" />
        </div>
        <div>
          <Skeleton className="h-6 w-20" />
          <div className="mt-2 border-y border-border/70">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                className="grid gap-4 border-b border-border/70 py-5 last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto]"
                key={index}
              >
                <div>
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="mt-2 h-4 w-full max-w-sm" />
                </div>
                <Skeleton className="h-11 w-full md:h-10 md:w-64" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </WorkspacePageShell>
  )
}
