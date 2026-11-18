import { LegendList } from "@legendapp/list"
import { type ReactNode, useState } from "react"
import { View } from "react-native"

import { resolveVirtualizedListHeight } from "./virtualized-list-height"

/**
 * @deprecated Legacy (T01): a fixed-height list nested inside a page scroll.
 * New and migrated screens use AppList (components/app/app-list.tsx), which
 * is the screen's own scroll with pull-to-refresh and onEndReached paging.
 * Kept only until the screen threads migrate its remaining callers.
 */
export function VirtualizedCardList<T>({
  data,
  empty,
  estimatedItemSize = 112,
  inline = false,
  keyExtractor,
  maxHeight = 560,
  renderItem,
}: {
  data: readonly T[]
  empty: ReactNode
  estimatedItemSize?: number
  /** Render bounded editable rows in the route-level keyboard-aware scroller. */
  inline?: boolean
  keyExtractor: (item: T, index: number) => string
  maxHeight?: number
  renderItem: (input: { index: number; isFirst: boolean; item: T }) => ReactNode
}) {
  const [contentHeight, setContentHeight] = useState<number | null>(null)

  if (data.length === 0) return <>{empty}</>

  if (inline) {
    return (
      <View className="gap-4">
        {data.map((item, index) => (
          <View key={keyExtractor(item, index)}>
            {renderItem({ index, isFirst: index === 0, item })}
          </View>
        ))}
      </View>
    )
  }

  const height = resolveVirtualizedListHeight({
    contentHeight,
    estimatedItemSize,
    itemCount: data.length,
    maxHeight,
  })

  return (
    <View className="overflow-hidden rounded-md">
      <View style={{ height }}>
        <LegendList
          data={data}
          drawDistance={360}
          estimatedItemSize={estimatedItemSize}
          keyExtractor={keyExtractor}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          maintainVisibleContentPosition
          onContentSizeChange={(_width, nextHeight) =>
            setContentHeight((current) =>
              current !== null && Math.abs(current - nextHeight) < 1
                ? current
                : nextHeight
            )
          }
          recycleItems
          renderItem={({ index, item }) =>
            renderItem({ index, isFirst: index === 0, item })
          }
        />
      </View>
    </View>
  )
}
