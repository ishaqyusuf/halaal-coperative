import { CachedReadBanner } from "@/components/app/cached-read-banner"
import { EmptyState } from "@/components/app/empty-state"
import { ScreenHeader } from "@/components/app/screen-header"
import { StatusBadge } from "@/components/app/status-badge"
import { LoadingSpinner } from "@/components/loading-spinner"
import { SafeArea } from "@/components/safe-area"
import { Text } from "@/components/ui/text"
import { useColors } from "@/hooks/use-color"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { resolveDisplayTextScale } from "@/lib/mobile-accessibility-layout"
import type { MobileProfile } from "@/lib/session-store"
import { cn } from "@/lib/utils"
import { useMemo } from "react"
import {
  ScrollView,
  type TextStyle,
  useWindowDimensions,
  View,
} from "react-native"
import { buildMemberCommitmentsPresentation } from "../model/member-commitments-presentation"
import type {
  MemberActivityHistoryState,
  MobileMemberSection,
} from "../model/member-core-types"
import { MemberActivityHistory } from "../public/member-activity-history"

function scaledTextStyle(
  scale: number,
  fontSize: number,
  lineHeight: number,
  fontWeight?: TextStyle["fontWeight"],
  color?: TextStyle["color"]
) {
  return {
    color,
    fontSize: fontSize * scale,
    fontWeight,
    lineHeight: lineHeight * scale,
  }
}

export type MemberCommitmentsScreenProps = {
  activity: MemberActivityHistoryState
  canUseServerData: boolean
  error: string | null
  isLoading: boolean
  profile: MobileProfile
  section: MobileMemberSection | null
}

function SectionHeading({ title }: { title: string }) {
  const colors = useColors()
  const { fontScale } = useWindowDimensions()
  const accessibilityScale = Number.isFinite(fontScale)
    ? Math.max(fontScale, 1)
    : 1

  return (
    <View className="border-b border-border pb-2">
      <Text
        allowFontScaling={false}
        className="text-lg font-extrabold tracking-tight text-foreground"
        style={scaledTextStyle(
          accessibilityScale,
          18,
          24,
          "800",
          colors.foreground
        )}
      >
        {title}
      </Text>
    </View>
  )
}

function PositionRow({
  detail,
  label,
  status,
  value,
}: {
  detail: string | null
  label: string
  status?: string | null
  value: string | null
}) {
  const largeTextLayout = useLargeTextLayout()
  const colors = useColors()
  const { fontScale } = useWindowDimensions()
  const accessibilityScale = Number.isFinite(fontScale)
    ? Math.max(fontScale, 1)
    : 1

  return (
    <View className="gap-2 border-b border-border py-4">
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
            "min-w-0 gap-1",
            largeTextLayout ? "w-full" : "flex-1 pr-3"
          )}
        >
          <Text
            allowFontScaling={false}
            className="text-sm font-bold text-foreground"
            style={scaledTextStyle(
              accessibilityScale,
              14,
              20,
              "700",
              colors.foreground
            )}
          >
            {label}
          </Text>
          {detail ? (
            <Text
              allowFontScaling={false}
              className="text-sm leading-5 text-muted-foreground"
              style={scaledTextStyle(
                accessibilityScale,
                14,
                20,
                "400",
                colors.mutedForeground
              )}
            >
              {detail}
            </Text>
          ) : null}
        </View>
        {value ? (
          <Text
            allowFontScaling={false}
            className={cn(
              "shrink-0 text-sm font-extrabold text-foreground",
              largeTextLayout && "w-full self-start text-left"
            )}
            style={scaledTextStyle(
              accessibilityScale,
              14,
              20,
              "800",
              colors.foreground
            )}
          >
            {value}
          </Text>
        ) : null}
      </View>
      {status ? (
        <StatusBadge label={status} tone="success" wrap={largeTextLayout} />
      ) : null}
    </View>
  )
}

export function MemberCommitmentsScreen({
  activity,
  canUseServerData,
  error,
  isLoading,
  profile,
  section,
}: MemberCommitmentsScreenProps) {
  const colors = useColors()
  const { fontScale } = useWindowDimensions()
  const accessibilityScale = Number.isFinite(fontScale)
    ? Math.max(fontScale, 1)
    : 1
  const displayTextScale = resolveDisplayTextScale(fontScale)
  const presentation = useMemo(
    () =>
      section
        ? buildMemberCommitmentsPresentation(
            section,
            profile.tenant.currencyCode
          )
        : null,
    [profile.tenant.currencyCode, section]
  )

  return (
    <SafeArea className="bg-background">
      <ScrollView
        contentContainerClassName="gap-5 px-5 pb-8 pt-5"
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Plans" />

        {canUseServerData ? (
          <CachedReadBanner cache={section?.cache} label="plan data" />
        ) : null}

        {!canUseServerData ? (
          <EmptyState
            description="Your plan position is unavailable in this session."
            icon="CircleAlert"
            title="Plans unavailable"
          />
        ) : null}

        {canUseServerData && isLoading ? <LoadingSpinner /> : null}

        {canUseServerData && error ? (
          <EmptyState
            description={error}
            icon="CircleAlert"
            title="Plans unavailable"
          />
        ) : null}

        {canUseServerData && !isLoading && !error && presentation ? (
          <>
            <View className="gap-3 border-y border-border py-4">
              <Text
                allowFontScaling={false}
                className="text-xs font-extrabold tracking-[1px] text-muted-foreground uppercase"
                style={{
                  ...scaledTextStyle(
                    accessibilityScale,
                    12,
                    16,
                    "800",
                    colors.mutedForeground
                  ),
                  letterSpacing: accessibilityScale,
                  textTransform: "uppercase",
                }}
              >
                {presentation.postedSavings.label}
              </Text>
              <Text
                allowFontScaling={false}
                className="text-[38px] leading-[42px] font-black tracking-tight text-foreground"
                style={scaledTextStyle(
                  displayTextScale,
                  38,
                  42,
                  "900",
                  colors.foreground
                )}
              >
                {presentation.postedSavings.value}
              </Text>
              {presentation.contributionSummary ? (
                <Text
                  allowFontScaling={false}
                  className="text-sm leading-5 font-semibold text-muted-foreground"
                  style={scaledTextStyle(
                    accessibilityScale,
                    14,
                    20,
                    "600",
                    colors.mutedForeground
                  )}
                >
                  {presentation.contributionSummary}
                </Text>
              ) : null}
            </View>

            <View className="gap-2">
              <SectionHeading title="Active plan" />
              <PositionRow {...presentation.activePlan} />
            </View>

            <View className="gap-2">
              <SectionHeading title="Savings" />
              <PositionRow {...presentation.specialSavings} />
            </View>

            <MemberActivityHistory
              compactEmpty
              currencyCode={profile.tenant.currencyCode}
              emptyTitle="No posted contributions yet"
              flat
              history={activity}
              inline
              showStatus={false}
              title="Recent contributions"
            />
          </>
        ) : null}

        {canUseServerData && !isLoading && !error && !presentation ? (
          <EmptyState
            description="Refresh to load your plan position."
            icon="BadgeCheck"
            title="No plan data"
          />
        ) : null}
      </ScrollView>
    </SafeArea>
  )
}
