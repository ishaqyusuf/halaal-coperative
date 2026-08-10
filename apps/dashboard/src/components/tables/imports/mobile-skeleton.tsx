import { Item, ItemContent, ItemHeader } from "@halaalvest/ui/components/item"
import { Skeleton } from "@halaalvest/ui/components/skeleton"

export function ImportMobileSkeleton() {
  return (
    <div className="divide-y divide-border border-y border-border">
      {Array.from({ length: 6 }, (_, index) => (
        <Item className="gap-3 border-0 bg-transparent px-0 py-4" key={index}>
          <ItemHeader>
            <ItemContent className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-32" />
            </ItemContent>
            <Skeleton className="size-11" />
          </ItemHeader>
          <ItemContent className="basis-full space-y-3">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2">
              {Array.from({ length: 8 }, (_, fieldIndex) => (
                <Skeleton
                  className={fieldIndex % 2 === 0 ? "h-3 w-24" : "h-5 w-24"}
                  key={fieldIndex}
                />
              ))}
            </div>
          </ItemContent>
        </Item>
      ))}
    </div>
  )
}
