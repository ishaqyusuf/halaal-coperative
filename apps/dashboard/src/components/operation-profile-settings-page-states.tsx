import { Skeleton } from "@halaalvest/ui/components/skeleton"
import { SettingsPage } from "@/components/workspace-settings/settings-page"

export function OperationProfileSettingsPageSkeleton() {
  return (
    <SettingsPage intro="Which services your cooperative offers, and who can start them.">
      {[3, 3].map((rows, sectionIndex) => (
        <section className="grid gap-4" key={sectionIndex}>
          <Skeleton className="h-6 w-40" />
          <div className="divide-y divide-border border-y border-border">
            {Array.from({ length: rows }, (_, index) => (
              <div className="flex items-center gap-3 py-4" key={index}>
                <div className="grid flex-1 gap-2">
                  <Skeleton className="h-5 w-44" />
                  <Skeleton className="h-5 w-72 max-w-full" />
                </div>
                <Skeleton className="h-11 w-24" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </SettingsPage>
  )
}
