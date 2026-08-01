import { Item, ItemContent, ItemHeader } from "@halaalvest/ui/components/item"
import { Skeleton } from "@halaalvest/ui/components/skeleton"

export function MembersMobileSkeleton() {
  return (
    <div className="divide-y divide-border border-y border-border">
      {Array.from({ length: 6 }, (_, index) => (
        <Item className="gap-3 border-0 bg-transparent px-0 py-4" key={index}>
          <ItemHeader>
            <Skeleton className="size-4" />
            <ItemContent className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-5 w-20" />
            </ItemContent>
            <Skeleton className="size-8" />
          </ItemHeader>
          <ItemContent className="basis-full space-y-2 pl-7">
            <Skeleton className="h-3 w-48" />
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-5 w-20" />
            </div>
          </ItemContent>
        </Item>
      ))}
    </div>
  )
}
