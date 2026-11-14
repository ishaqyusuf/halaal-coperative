import { Skeleton } from "@halaalvest/ui/components/skeleton"
import { SettingsPage } from "@/components/workspace-settings/settings-page"

/** Same shape as the loaded page: intro, then two lists of details. */
export function ProfileSettingsPageSkeleton() {
  return (
    <SettingsPage
      action={<Skeleton className="h-11 w-full sm:w-36" />}
      intro="Your cooperative's name and office, as members see them."
    >
      {[5, 4].map((rows, sectionIndex) => (
        <section className="grid gap-4" key={sectionIndex}>
          <Skeleton className="h-6 w-40" />
          <div className="divide-y divide-border border-y border-border">
            {Array.from({ length: rows }, (_, index) => (
              <div className="grid gap-2 py-4 sm:grid-cols-2" key={index}>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-full sm:w-56" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </SettingsPage>
  )
}
