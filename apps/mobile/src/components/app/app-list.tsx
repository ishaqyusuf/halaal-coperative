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
import { LegendList } from "@legendapp/list"
import { type ReactElement, type ReactNode, useState } from "react"
import { ActivityIndicator, RefreshControl, View } from "react-native"

export type AppListSearch = {
  autoFocus?: boolean
  value: string
  onChangeText: (value: string) => void
  onFocusChange?: (focused: boolean) => void
  placeholder: string
  accessibilityLabel?: string
  /** The search shows only when the list has more than 10 items. */
  totalCount: number
  /** Filters loaded rows only, so it still works offline. */
  localSearch?: boolean
}

export type AppListProps<T> = {
  data: readonly T[]
  /** Changes to row presentation that are independent of the item data. */
  extraData?: unknown
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

  /** Only the visible list in a pager renders the shared status bar. */
  active?: boolean
  /** The parent owns the top safe area and renders the status bar. */
  embedded?: boolean
  title?: string
  back?: boolean | (() => void)
  headerActions?: ReactNode
  /** Pinned navigation for long pushed lists after the large title scrolls off. */
  compactHeader?: ReactNode
  /** Navigation that stays pinned above the scrolling title and rows. */
  fixedHeader?: ReactNode
  /** Edge-to-edge brand hero (use ScreenHero). Replaces the title header. */
  hero?: ReactNode
  /** Content between the title and the rows: summary, segments, banners. */
  header?: ReactNode

  /** Pull-to-refresh (replaces header Refresh buttons). */
  onRefresh?: () => void
  refreshing?: boolean

  /** Paging: call fetchNextPage; the footer shows a spinner meanwhile. */
  onEndReached?: () => void
  isFetchingNextPage?: boolean
  /** Retry or end-of-history message under the loaded rows. */
  listFooter?: ReactNode
  stickyIndices?: number[]

  /** First load with no data: skeleton rows instead of a spinner. */
  isLoading?: boolean
  loading?: ReactNode
  /** No rows after loading. */
  empty?: ReactNode
  /** A failed read. With data it shows as a banner above the rows. */
  error?: string | null
  errorTitle?: string
  onRetry?: () => void

  search?: AppListSearch
  searchBottomOffset?: number
  /** Optional floating action aligned beside search and hidden with it. */
  bottomAction?: ReactNode
  fullWidthBottomAction?: boolean
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
  active = true,
  back,
  bottomAction,
  compactHeader,
  data,
  embedded = false,
  empty,
  error,
  errorTitle = "Couldn’t load this list",
  estimatedItemSize = 72,
  extraData,
  fixedHeader,
  fullWidthBottomAction = false,
  header,
  headerActions,
  hero,
  isFetchingNextPage = false,
  isLoading = false,
  keyExtractor,
  listFooter,
  loading,
  onEndReached,
  onRefresh,
  onRetry,
  overlay,
  refreshing = false,
  renderItem,
  search,
  searchBottomOffset = 0,
  stickyIndices,
  testID,
  title,
}: AppListProps<T>) {
  const colors = useColors()
  const chrome = useScreenChrome({ hero: Boolean(hero) })
  const [searchHeight, setSearchHeight] = useState(0)
  const [showCompactHeader, setShowCompactHeader] = useState(false)
  const [viewport, setViewport] = useState({ active, revision: 0 })
  // On iOS an offscreen virtualized ScrollView can return with its entire
  // content clipped. Recreate the incoming list and keep the outgoing one.
  if (active !== viewport.active) {
    setViewport({
      active,
      revision: viewport.revision + (active ? 1 : 0),
    })
  }
  const hasData = data.length > 0
  const count = data.length

  const listHeader = (
    <>
      {hero ? (
        <View
          onLayout={(event) =>
            chrome.onHeroLayout(event.nativeEvent.layout.height)
          }
        >
          {hero}
        </View>
      ) : null}
      <View
        style={{
          gap: 16,
          paddingBottom: 12,
          paddingHorizontal: 18,
          paddingTop: hero
            ? 16
            : fixedHeader || embedded
              ? 8
              : chrome.insetsTop + 8,
        }}
      >
        {hero ? (
          header
        ) : (
          <ScreenTitleHeader
            back={back}
            headerActions={headerActions}
            title={title}
          >
            {header}
          </ScreenTitleHeader>
        )}
        {error && hasData ? (
          <StatusBanner
            description={error}
            kind="error"
            onRetry={onRetry}
            title="Couldn’t refresh"
          />
        ) : null}
      </View>
    </>
  )

  const listEmpty = isLoading ? (
    <View className="px-[18px]">{loading ?? <ListSkeleton rows={6} />}</View>
  ) : error ? (
    <EmptyState
      action={onRetry ? { label: "Try again", onPress: onRetry } : undefined}
      description={error}
      icon="CircleAlert"
      title={errorTitle}
      tone="error"
    />
  ) : (
    (empty ?? <EmptyState title="Nothing here yet" />)
  )

  return (
    <View className="flex-1 bg-background" testID={testID}>
      {active && !embedded ? chrome.chrome : null}
      {fixedHeader ? (
        <View
          style={{
            backgroundColor: colors.background,
            paddingTop: chrome.insetsTop,
          }}
        >
          {fixedHeader}
        </View>
      ) : null}
      <LegendList
        key={viewport.revision}
        ListEmptyComponent={<View>{listEmpty}</View>}
        ListFooterComponent={
          <View
            style={{
              paddingBottom:
                chrome.contentBottomInset +
                (search || bottomAction ? searchHeight : 0),
              paddingTop: 12,
            }}
          >
            {isFetchingNextPage ? (
              <ActivityIndicator
                accessibilityLabel="Loading more"
                color={colors.mutedForeground}
              />
            ) : (
              listFooter
            )}
          </View>
        }
        ListHeaderComponent={
          embedded && !header && !(error && hasData) ? undefined : listHeader
        }
        data={data as T[]}
        drawDistance={600}
        estimatedItemSize={estimatedItemSize}
        extraData={extraData}
        keyExtractor={keyExtractor}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        onEndReached={onEndReached}
        onEndReachedThreshold={0.6}
        onScroll={(event) => {
          chrome.onScroll(event)
          if (compactHeader) {
            const visible = event.nativeEvent.contentOffset.y >= 96
            setShowCompactHeader((previous) =>
              previous === visible ? previous : visible
            )
          }
        }}
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
        stickyHeaderConfig={
          stickyIndices
            ? { offset: chrome.insetsTop + (compactHeader ? 52 : 0) }
            : undefined
        }
        stickyIndices={stickyIndices}
      />
      {active && showCompactHeader && compactHeader ? (
        <View
          style={{
            backgroundColor: colors.background,
            left: 0,
            right: 0,
            top: chrome.insetsTop,
            position: "absolute",
            zIndex: 2,
          }}
        >
          {compactHeader}
        </View>
      ) : null}
      {search || bottomAction ? (
        <BottomSearchFooter
          accessibilityLabel={
            search?.accessibilityLabel ?? search?.placeholder ?? "Search"
          }
          autoFocus={search?.autoFocus}
          bottomOffset={chrome.dockLift + searchBottomOffset}
          hidden={chrome.barsHidden}
          localSearch={search?.localSearch}
          onChangeText={search?.onChangeText ?? (() => {})}
          onFocusChange={search?.onFocusChange}
          onHeightChange={setSearchHeight}
          placeholder={search?.placeholder ?? ""}
          searchVisible={Boolean(search)}
          totalCount={search?.totalCount ?? 0}
          value={search?.value ?? ""}
          floatActions={Boolean(bottomAction)}
          fullWidthActions={fullWidthBottomAction}
          layout={bottomAction ? "inline" : "stacked"}
        >
          {bottomAction}
        </BottomSearchFooter>
      ) : null}
      {overlay}
    </View>
  )
}
