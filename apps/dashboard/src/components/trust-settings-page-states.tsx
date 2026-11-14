import { Skeleton } from "@halaalvest/ui/components/skeleton"
import { SettingsPage } from "@/components/workspace-settings/settings-page"

export function TrustSettingsPageSkeleton() {
  return (
    <SettingsPage
      action={<Skeleton className="h-11 w-full sm:w-36" />}
      intro="What members and partners may ask before they trust you with their money."
    >
      <section className="grid gap-4">
        <Skeleton className="h-6 w-32" />
        <div className="divide-y divide-border border-y border-border">
          {Array.from({ length: 6 }, (_, index) => (
            <div className="flex gap-3 py-4" key={index}>
              <Skeleton className="size-6 rounded-full" />
              <div className="grid flex-1 gap-2">
                <Skeleton className="h-5 w-56 max-w-full" />
                <Skeleton className="h-5 w-72 max-w-full" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </SettingsPage>
  )
}
