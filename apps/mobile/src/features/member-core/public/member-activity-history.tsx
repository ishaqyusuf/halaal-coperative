import { EmptyState } from "@/components/app/empty-state"
import { SectionCard } from "@/components/app/section-card"
import { VirtualizedCardList } from "@/components/app/virtualized-card-list"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { useColors } from "@/hooks/use-color"
import { cn } from "@/lib/utils"
import {
  formatMobileActivityDetail,
  formatMobileMetricValue,
} from "@/lib/mobile-metrics"
import type {
  MemberActivityHistoryState,
  MobileMemberSectionRow,
} from "./member-core-types"
import {
  useWindowDimensions,
  View,
  type TextStyle,
} from "react-native"

function scaledTextStyle(
  accessibilityScale: number,
  fontSize: number,
  lineHeight: number,
  overrides?: Pick<TextStyle, "color" | "fontWeight">
) {
  return {
    fontSize: fontSize * accessibilityScale,
    lineHeight: lineHeight * accessibilityScale,
    ...overrides,
  }
}

function MemberActivityRow({
  currencyCode,
  accessibilityScale,
  largeTextLayout,
  row,
  showStatus,
}: {
  currencyCode: string
  accessibilityScale: number
  largeTextLayout: boolean
  row: MobileMemberSectionRow
  showStatus: boolean
}) {
  const colors = useColors()
  const value =
    row.value !== null && row.format
      ? formatMobileMetricValue(
          {
            detail: row.detail,
            format: row.format,
            key: row.key,
            label: row.label,
            value: row.value,
          },
          currencyCode
        )
      : null
  const detail = formatMobileActivityDetail(
    row.detail,
    showStatus ? row.status : null
  )

  return (
    <View className="gap-1.5 border-b border-border py-4">
      <View
        className={cn(
          "gap-2",
          largeTextLayout
            ? "items-start"
            : "flex-row items-start justify-between"
        )}
      >
        <View
          className={cn(
            "min-w-0",
            largeTextLayout ? "w-full" : "flex-1 pr-2"
          )}
        >
          <Text
            allowFontScaling={false}
            className="text-sm leading-5 font-semibold text-foreground"
            style={scaledTextStyle(accessibilityScale, 14, 20, {
              color: colors.foreground,
              fontWeight: "600",
            })}
          >
            {row.label}
          </Text>
        </View>
        {value ? (
          <Text
            allowFontScaling={false}
            className={cn(
              "shrink-0 text-right text-sm font-semibold text-foreground",
              largeTextLayout && "self-start"
            )}
            style={scaledTextStyle(accessibilityScale, 14, 20, {
              color: colors.foreground,
              fontWeight: "600",
            })}
          >
            {value}
          </Text>
        ) : null}
      </View>
      <Text
        allowFontScaling={false}
        accessibilityLabel={detail}
        className="text-sm leading-5 text-muted-foreground"
        style={scaledTextStyle(accessibilityScale, 14, 20, {
          color: colors.mutedForeground,
        })}
      >
        {detail}
      </Text>
    </View>
  )
}

export function MemberActivityHistory({
  compactEmpty = false,
  currencyCode,
  emptyDescription,
  emptyTitle = "No posted entries yet",
  flat = false,
  history,
  inline = false,
  showStatus = true,
  title,
}: {
  compactEmpty?: boolean
  currencyCode: string
  emptyDescription?: string
  emptyTitle?: string
  flat?: boolean
  history: MemberActivityHistoryState
  /** Use when the parent screen already owns the vertical scroll container. */
  inline?: boolean
  /** Hide a status that is already guaranteed by the surrounding section. */
  showStatus?: boolean
  title: string
}) {
  const colors = useColors()
  const largeTextLayout = useLargeTextLayout()
  const { fontScale } = useWindowDimensions()
  const accessibilityScale = Number.isFinite(fontScale)
    ? Math.max(fontScale, 1)
    : 1
  const content = history.isLoading ? (
    <LoadingSpinner />
  ) : history.error ? (
    <EmptyState
      description={history.error}
      icon="CircleAlert"
      title="History unavailable"
    />
  ) : (
    <View className="gap-3">
      <VirtualizedCardList
        data={history.rows}
        empty={
          compactEmpty ? (
            <View
              className={cn(
                "gap-3 border-b border-border py-4",
                largeTextLayout ? "items-start" : "flex-row items-center"
              )}
            >
              <View className="size-10 items-center justify-center rounded-xl bg-accent">
                <Icon
                  className="size-sm text-accent-foreground"
                  name="History"
                />
              </View>
              <View
                className={cn(
                  "min-w-0 gap-0.5",
                  largeTextLayout ? "w-full" : "flex-1"
                )}
              >
                <Text
                  allowFontScaling={false}
                  className="text-sm font-semibold text-foreground"
                  style={scaledTextStyle(accessibilityScale, 14, 20, {
                    color: colors.foreground,
                    fontWeight: "600",
                  })}
                >
                  {emptyTitle}
                </Text>
                {emptyDescription ? (
                  <Text
                    allowFontScaling={false}
                    className="text-xs leading-5 text-muted-foreground"
                    style={scaledTextStyle(accessibilityScale, 12, 20, {
                      color: colors.mutedForeground,
                    })}
                  >
                    {emptyDescription}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : (
            <EmptyState
              description={emptyDescription ?? ""}
              icon="History"
              title="No history yet"
            />
          )
        }
        estimatedItemSize={largeTextLayout ? 148 : 104}
        inline={inline || largeTextLayout}
        keyExtractor={(row) => row.key}
        renderItem={({ item }) => (
          <MemberActivityRow
            accessibilityScale={accessibilityScale}
            currencyCode={currencyCode}
            largeTextLayout={largeTextLayout}
            row={item}
            showStatus={showStatus}
          />
        )}
      />
      {history.hasNextPage ? (
        <Button
          disabled={history.isFetchingNextPage}
          onPress={history.onLoadMore}
          variant="outline"
        >
          <Text
            allowFontScaling={false}
            className="text-sm font-medium text-foreground"
            style={scaledTextStyle(accessibilityScale, 14, 20, {
              color: colors.foreground,
              fontWeight: "500",
            })}
          >
            {history.isFetchingNextPage ? "Loading" : "Load more"}
          </Text>
        </Button>
      ) : null}
    </View>
  )

  if (flat) {
    return (
      <View className="gap-2 border-b border-border pb-5">
        <Text
          allowFontScaling={false}
          className="text-lg font-semibold text-foreground"
          style={scaledTextStyle(accessibilityScale, 18, 24, {
            color: colors.foreground,
            fontWeight: "600",
          })}
        >
          {title}
        </Text>
        {content}
      </View>
    )
  }

  return (
    <SectionCard icon="History" title={title}>
      {content}
    </SectionCard>
  )
}
