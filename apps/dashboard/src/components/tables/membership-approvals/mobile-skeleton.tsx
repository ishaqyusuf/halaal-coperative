import { Item, ItemContent, ItemHeader } from "@halaalvest/ui/components/item"
import { Skeleton } from "@halaalvest/ui/components/skeleton"

export function MembershipApprovalsMobileSkeleton() {
  return (
    <div className="divide-y divide-border border-y border-border">
      {Array.from({ length: 6 }, (_, index) => (
        <Item className="gap-3 border-0 bg-transparent px-0 py-4" key={index}>
          <ItemHeader>
            <ItemContent className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-44" />
            </ItemContent>
            <Skeleton className="size-8" />
          </ItemHeader>
          <ItemContent className="basis-full space-y-3">
            <Skeleton className="h-3 w-56" />
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2">
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-24" />
            </div>
          </ItemContent>
        </Item>
      ))}
    </div>
  )
}
