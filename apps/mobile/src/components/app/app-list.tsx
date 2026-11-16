import { EmptyState } from "@/components/app/empty-state"
import {
  ScreenTitleHeader,
  useScreenChrome,
} from "@/components/app/screen-shell"
import { BottomSearchFooter } from "@/components/search/bottom-search-footer"
import { type RowPosition, rowPosition } from "@/components/ui/list-card"
import { ListSkeleton } from "@/components/ui/skeleton"
import { StatusBanner } from "@/components/ui/status-banner"
import { useColors } from "@/hooks/use-color"
import { useDockVisibilityStore } from "@/lib/dock-visibility-store"
import { LegendList } from "@legendapp/list"
import { type ReactElement, type ReactNode, useState } from "react"
import { ActivityIndicator, RefreshControl, View } from "react-native"

export type AppListSearch = {
  value: string
  onChangeText: (value: string) => void
  placeholder: string
  accessibilityLabel?: string
  /** The search shows only when the list has more than 10 items. */
  totalCount: number
  /** Filters loaded rows only, so it still works offline. */
  localSearch?: boolean
}

export type AppListProps<T> = {
  data: readonly T[]
  keyExtractor: (item: T, index: number) => string
  /**
   * `position` lets RecordRow join consecutive rows into one rounded card.
   */
  renderItem: (input: {
    index: number
    item: T
    position: RowPosition
  }) => ReactElement | null
  estimatedItemSize?: number

  title?: string
  back?: boolean | (() => void)
  headerActions?: ReactNode
  /** Content between the title and the rows: summary, segments, banners. */
  header?: ReactNode

  /** Pull-to-refresh (replaces header Refresh buttons). */
  onRefresh?: () => void
  refreshing?: boolean

  /** Paging: call fetchNextPage; the footer shows a spinner meanwhile. */
  onEndReached?: () => void
  isFetchingNextPage?: boolean

  /** First load with no data: skeleton rows instead of a spinner. */
  isLoading?: boolean
  loading?: ReactNode
  /** No rows after loading. */
  empty?: ReactNode
  /** A failed read. With data it shows as a banner above the rows. */
  error?: string | null
  onRetry?: () => void

  search?: AppListSearch
  /** A FAB or other overlay pinned above the list. */
  overlay?: ReactNode
  testID?: string
}

/**
 * The native list (ADR-20261116 §4): the screen's own scroll (no nested
 * fixed-height lists), LegendList virtualization, pull-to-refresh,
 * onEndReached paging with a footer spinner, skeleton / empty / error
 * slots, the shared title header and the floating search footer. On tab
 * screens it scrolls under the floating dock and sinks it on scroll.
 */
export function AppList<T>({
  back,
  data,
  empty,
  error,
  estimatedItemSize = 72,
  header,
  headerActions,
  isFetchingNextPage = false,
  isLoading = false,
  keyExtractor,
  loading,
  onEndReached,
  onRefresh,
  onRetry,
  overlay,
  refreshing = false,
  renderItem,
  search,
  testID,
  title,
}: AppListProps<T>) {
  const colors = useColors()
  const chrome = useScreenChrome({ hero: false })
  const dockHidden = useDockVisibilityStore((store) => store.hidden)
  const [searchHeight, setSearchHeight] = useState(0)
  const hasData = data.length > 0
  const count = data.length

  const listHeader = (
    <View
      style={{
        gap: 16,
        paddingBottom: 12,
        paddingHorizontal: 18,
        paddingTop: chrome.insetsTop + 8,
      }}
    >
      <ScreenTitleHeader back={back} headerActions={headerActions} title={title}>
        {header}
      </ScreenTitleHeader>
      {error && hasData ? (
        <StatusBanner
          description={error}
          kind="error"
          onRetry={onRetry}
          title="Couldn’t refresh"
        />
      ) : null}
    </View>
  )

  const listEmpty = isLoading ? (
    <View className="px-[18px]">{loading ?? <ListSkeleton rows={6} />}</View>
  ) : error ? (
    <EmptyState
      action={onRetry ? { label: "Try again", onPress: onRetry } : undefined}
      description={error}
      icon="CircleAlert"
      title="Couldn’t load this list"
      tone="error"
    />
  ) : (
    (empty ?? <EmptyState title="Nothing here yet" />)
  )

  return (
    <View className="flex-1 bg-background" testID={testID}>
      {chrome.chrome}
      <LegendList
        ListEmptyComponent={<View>{listEmpty}</View>}
        ListFooterComponent={
          <View
            style={{
              paddingBottom:
                chrome.contentBottomInset + (search ? searchHeight : 0),
              paddingTop: 12,
            }}
          >
            {isFetchingNextPage ? (
              <ActivityIndicator
                accessibilityLabel="Loading more"
                color={colors.mutedForeground}
              />
            ) : null}
          </View>
        }
        ListHeaderComponent={listHeader}
        data={data as T[]}
        drawDistance={600}
        estimatedItemSize={estimatedItemSize}
        keyExtractor={keyExtractor}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        onEndReached={onEndReached}
        onEndReachedThreshold={0.6}
        onScroll={chrome.onScroll}
        recycleItems
        refreshControl={
          onRefresh ? (
            <RefreshControl
              colors={[colors.primary]}
              onRefresh={onRefresh}
              progressViewOffset={chrome.insetsTop}
              refreshing={refreshing}
              tintColor={colors.mutedForeground}
            />
          ) : undefined
        }
        renderItem={({ index, item }) =>
          renderItem({ index, item, position: rowPosition(index, count) })
        }
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      />
      {search ? (
        <BottomSearchFooter
          accessibilityLabel={search.accessibilityLabel ?? search.placeholder}
          bottomOffset={chrome.dockLift}
          hidden={dockHidden}
          localSearch={search.localSearch}
          onChangeText={search.onChangeText}
          onHeightChange={setSearchHeight}
          placeholder={search.placeholder}
          totalCount={search.totalCount}
          value={search.value}
        />
      ) : null}
      {overlay}
    </View>
  )
}
