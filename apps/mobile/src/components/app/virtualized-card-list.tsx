import { LegendList } from "@legendapp/list"
import type { ReactNode } from "react"
import { View } from "react-native"

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

  const height = Math.min(
    maxHeight,
    Math.max(estimatedItemSize, data.length * estimatedItemSize)
  )

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
          recycleItems
          renderItem={({ index, item }) =>
            renderItem({ index, isFirst: index === 0, item })
          }
        />
      </View>
    </View>
  )
}
