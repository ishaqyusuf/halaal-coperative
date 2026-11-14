import { Skeleton } from "@halaalvest/ui/components/skeleton"
import { ScrollableContent } from "@/components/dashboard"
import { importMenuItems } from "@/components/imports-settings-view"
import { SecondaryMenu } from "@/components/secondary-menu"

export function ImportsSettingsPageSkeleton() {
  return (
    <ScrollableContent>
      <div className="flex max-w-[980px] flex-col gap-6">
        <SecondaryMenu items={importMenuItems} />
        <Skeleton className="h-6 w-full max-w-xl" />
        <Skeleton className="h-12 w-full sm:w-56" />
        <div className="divide-y divide-border/70 border-y border-border/70">
          {Array.from({ length: 5 }, (_, index) => (
            <div
              className="flex min-h-[72px] items-center gap-4 py-3"
              key={index}
            >
              <Skeleton className="size-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScrollableContent>
  )
}
