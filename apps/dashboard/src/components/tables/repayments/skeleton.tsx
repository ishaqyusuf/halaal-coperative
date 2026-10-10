import { Skeleton } from "@halaalvest/ui/components/skeleton"
import { RepaymentsMobileSkeleton } from "./mobile-skeleton"

export function RepaymentsSkeleton() {
  return (
    <>
      <div className="md:hidden">
        <RepaymentsMobileSkeleton />
      </div>
      <div className="hidden overflow-hidden md:block">
        <div className="flex h-11 items-center gap-6 border-b border-border px-4">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-24" />
        </div>
        {Array.from({ length: 8 }, (_, index) => (
          <div
            className="flex h-[72px] items-center gap-6 border-b border-border px-4"
            key={index}
          >
            <div className="space-y-2">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="ml-auto h-5 w-24" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-8" />
          </div>
        ))}
      </div>
    </>
  )
}
