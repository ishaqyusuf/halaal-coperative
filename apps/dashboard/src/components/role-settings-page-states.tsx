import { Skeleton } from "@halaalvest/ui/components/skeleton"
import { SettingsPage } from "@/components/workspace-settings/settings-page"

export function RoleSettingsPageSkeleton() {
  return (
    <SettingsPage
      action={<Skeleton className="h-11 w-full sm:w-36" />}
      intro="Who can run the cooperative from this dashboard."
    >
      <section className="grid gap-4">
        <Skeleton className="h-6 w-24" />
        <div className="divide-y divide-border border-y border-border">
          {Array.from({ length: 3 }, (_, index) => (
            <div className="grid gap-2 py-4" key={index}>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-5 w-64 max-w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
          ))}
        </div>
      </section>
    </SettingsPage>
  )
}
