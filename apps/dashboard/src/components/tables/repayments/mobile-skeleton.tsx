import { Item, ItemContent, ItemHeader } from "@halaalvest/ui/components/item"
import { Skeleton } from "@halaalvest/ui/components/skeleton"

export function RepaymentsMobileSkeleton() {
  return (
    <div className="divide-y divide-border border-y border-border">
      {Array.from({ length: 6 }, (_, index) => (
        <Item className="gap-3 border-0 bg-transparent px-0 py-4" key={index}>
          <ItemHeader>
            <ItemContent className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-52" />
            </ItemContent>
            <Skeleton className="size-11" />
          </ItemHeader>
          <ItemContent className="basis-full space-y-3">
            <Skeleton className="h-5 w-24" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="ml-auto h-3 w-28" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="ml-auto h-3 w-32" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="ml-auto h-3 w-24" />
            </div>
          </ItemContent>
        </Item>
      ))}
    </div>
  )
}
