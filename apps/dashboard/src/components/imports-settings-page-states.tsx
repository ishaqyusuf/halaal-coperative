import { Skeleton } from "@halaalvest/ui/components/skeleton"
import { ScrollableContent } from "@/components/dashboard"
import { importMenuItems } from "@/components/imports-settings-view"
import { SecondaryMenu } from "@/components/secondary-menu"

export function ImportsSettingsPageSkeleton() {
  return (
    <ScrollableContent>
      <div className="flex max-w-[980px] flex-col gap-6">
        <SecondaryMenu items={importMenuItems} />
        <div>
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-3 h-7 w-64" />
          <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
        </div>
        <section className="hidden gap-4 md:grid md:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div className="rounded-lg border border-border/70 p-4" key={index}>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-4 h-8 w-16" />
              <Skeleton className="mt-3 h-4 w-full" />
            </div>
          ))}
        </section>
        <section>
          <Skeleton className="h-4 w-36" />
          <Skeleton className="mt-2 h-5 w-56" />
          <Skeleton className="mt-2 h-4 w-full max-w-2xl" />
          <div className="mt-4 divide-y divide-border/70 border-y border-border/70">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                key={index}
              >
                <div>
                  <Skeleton className="h-4 w-52" />
                  <Skeleton className="mt-2 h-4 w-full max-w-xl" />
                </div>
                <Skeleton className="h-5 w-24" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </ScrollableContent>
  )
}
