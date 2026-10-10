import { CachedReadBanner } from "@/components/app/cached-read-banner"
import { LoadingSpinner } from "@/components/loading-spinner"
import { ThemeSelector } from "@/components/app/theme-selector"
import { Icon } from "@/components/ui/icon"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { useColors } from "@/hooks/use-color"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import type {
  MobileMemberMore,
  MobileMemberMoreRow,
  MobileMemberMoreSection,
} from "@/features/settings-access/model/member-more-types"
import { formatMobileMetricValue } from "@/lib/mobile-metrics"
import { formatMobileStatus } from "@/lib/format-mobile-status"
import { resolveDisplayTextScale } from "@/lib/mobile-accessibility-layout"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"
import { useWindowDimensions, View, type TextStyle } from "react-native"

type MemberMoreSectionKey = Exclude<MobileMemberMoreSection["key"], "profile">

const moneySectionKeys = new Set<MobileMemberMoreSection["key"]>([
  "statement",
  "receipts",
])

const serviceSectionKeys = new Set<MobileMemberMoreSection["key"]>([
  "procurement",
  "projectFinancing",
  "foodPurchase",
  "guarantors",
  "support",
])

function formatMoreRowValue(row: MobileMemberMoreRow, currencyCode: string) {
  if (row.value === null || !row.format) return null

  return formatMobileMetricValue(
    {
      detail: row.detail,
      format: row.format,
      key: row.key,
      label: row.label,
      value: row.value,
    },
    currencyCode
  )
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
}

function scaledTextStyle(
  scale: number,
  fontSize: number,
  lineHeight: number,
  overrides?: Pick<TextStyle, "color" | "fontWeight" | "letterSpacing">
) {
  return {
    fontSize: fontSize * scale,
    lineHeight: lineHeight * scale,
    ...overrides,
  } satisfies TextStyle
}

function MemberIdentity({
  accessibilityScale,
  hub,
  largeTextLayout,
}: {
  accessibilityScale: number
  hub: MobileMemberMore
  largeTextLayout: boolean
}) {
  const colors = useColors()
  const member = hub.member
  if (!member) return null

  const profileRow = hub.sections.find((section) => section.key === "profile")
    ?.rows[0]

  return (
    <View
      className={cn(
        "min-h-16 flex-row gap-3 border-y border-border py-3",
        largeTextLayout ? "items-start" : "items-center"
      )}
    >
      <View className="bg-brand size-11 items-center justify-center rounded-full">
        <Text
          allowFontScaling={false}
          className="text-brand-foreground text-sm font-extrabold"
          style={scaledTextStyle(
            resolveDisplayTextScale(accessibilityScale),
            14,
            20,
            { color: colors.brandForeground, fontWeight: "800" }
          )}
        >
          {getInitials(member.name)}
        </Text>
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text
          allowFontScaling={false}
          className="text-sm font-bold text-foreground"
          numberOfLines={largeTextLayout ? undefined : 1}
          style={scaledTextStyle(accessibilityScale, 14, 20, {
            color: colors.foreground,
            fontWeight: "700",
          })}
        >
          {member.name}
        </Text>
        <Text
          allowFontScaling={false}
          className="text-xs text-muted-foreground"
          style={scaledTextStyle(accessibilityScale, 12, 18, {
            color: colors.mutedForeground,
          })}
        >
          {`Member · ${member.memberNumber}`}
        </Text>
        {largeTextLayout ? (
          <Text
            allowFontScaling={false}
            className="text-success text-xs font-bold"
            style={scaledTextStyle(accessibilityScale, 12, 18, {
              color: colors.success,
              fontWeight: "700",
            })}
          >
            {formatMobileStatus(profileRow?.status ?? member.kycStatus)}
          </Text>
        ) : null}
      </View>
      {!largeTextLayout ? (
        <Text
          allowFontScaling={false}
          className="text-success text-xs font-bold"
          style={scaledTextStyle(accessibilityScale, 12, 18, {
            color: colors.success,
            fontWeight: "700",
          })}
        >
          {formatMobileStatus(profileRow?.status ?? member.kycStatus)}
        </Text>
      ) : null}
      <Icon
        name="ChevronRight"
        className={cn(
          "size-sm text-muted-foreground",
          largeTextLayout && "mt-1"
        )}
      />
    </View>
  )
}

function DirectorySection({
  accessibilityScale,
  children,
  largeTextLayout,
  title,
}: {
  accessibilityScale: number
  children: ReactNode
  largeTextLayout: boolean
  title: string
}) {
  const colors = useColors()
  const displayTextScale = resolveDisplayTextScale(accessibilityScale)

  return (
    <View className="gap-2">
      <Text
        allowFontScaling={false}
        className={cn(
          "text-sm font-extrabold text-foreground",
          !largeTextLayout && "tracking-tight"
        )}
        style={scaledTextStyle(displayTextScale, 14, 19, {
          color: colors.foreground,
          fontWeight: "800",
          letterSpacing: largeTextLayout ? 0 : -0.2,
        })}
      >
        {title}
      </Text>
      <View className="border-t border-border">{children}</View>
    </View>
  )
}

function getRowMeta(row: MobileMemberMoreRow | undefined) {
  if (!row || row.key === "statement") return null

  const status = row.status
    ? row.status === "pending_review"
      ? "pending"
      : formatMobileStatus(row.status).toLowerCase()
    : null

  return {
    status,
    tone:
      row.status === "pending" || row.status === "pending_review"
        ? "warning"
        : row.status === "active" || row.status === "verified"
          ? "success"
          : "muted",
  } as const
}

function DirectoryRow({
  accessibilityScale,
  currencyCode,
  largeTextLayout,
  onPress,
  section,
}: {
  accessibilityScale: number
  currencyCode: string
  largeTextLayout: boolean
  onPress: () => void
  section: MobileMemberMoreSection
}) {
  const colors = useColors()
  const row = section.rows[0]
  const value = row ? formatMoreRowValue(row, currencyCode) : null
  const meta = getRowMeta(row)
  const isCount = row?.format === "count"
  const accessibilityDetails = row
    ? [row.label, row.detail, value, meta?.status].filter(Boolean).join(". ")
    : null

  return (
    <Pressable
      accessibilityHint={row?.detail}
      accessibilityLabel={`Open ${section.title}${accessibilityDetails ? `. ${accessibilityDetails}` : ""}`}
      accessibilityRole="button"
      className={cn(
        "min-h-14 flex-row gap-3 border-b border-border active:bg-accent/30",
        largeTextLayout ? "items-start py-4" : "items-center py-2"
      )}
      haptic
      onPress={onPress}
    >
      <View className="size-9 shrink-0 items-center justify-center rounded-xl bg-accent">
        <Icon className="size-sm text-accent-foreground" name={section.icon} />
      </View>
      <View className="min-w-0 flex-1 gap-1">
        <Text
          allowFontScaling={false}
          className="text-sm font-bold text-foreground"
          style={scaledTextStyle(accessibilityScale, 14, 20, {
            color: colors.foreground,
            fontWeight: "700",
          })}
        >
          {section.title}
        </Text>
        {largeTextLayout && (value || meta?.status) ? (
          <Text
            allowFontScaling={false}
            className={cn(
              "text-xs font-semibold",
              meta?.tone === "warning"
                ? "text-warn"
                : meta?.tone === "success"
                  ? "text-success"
                  : "text-muted-foreground"
            )}
            style={scaledTextStyle(accessibilityScale, 12, 18, {
              color:
                meta?.tone === "warning"
                  ? colors.warn
                  : meta?.tone === "success"
                    ? colors.success
                    : colors.mutedForeground,
              fontWeight: "600",
            })}
          >
            {[value, meta?.status].filter(Boolean).join(" · ")}
          </Text>
        ) : null}
      </View>
      {!largeTextLayout && (value || meta?.status) ? (
        <View className="max-w-[40%] shrink-0 items-end pl-2">
          {value ? (
            <Text
              allowFontScaling={false}
              className={cn(
                "text-right text-xs font-bold",
                isCount ? "text-muted-foreground" : "text-foreground"
              )}
              numberOfLines={1}
              style={scaledTextStyle(accessibilityScale, 12, 18, {
                color: isCount ? colors.mutedForeground : colors.foreground,
                fontWeight: "700",
              })}
            >
              {isCount && meta?.status ? `${value} ${meta.status}` : value}
            </Text>
          ) : null}
          {!isCount && meta?.status ? (
            <Text
              allowFontScaling={false}
              className={cn(
                "text-right text-[11px] font-semibold",
                meta.tone === "warning"
                  ? "text-warn"
                  : meta.tone === "success"
                    ? "text-success"
                    : "text-muted-foreground"
              )}
              style={scaledTextStyle(accessibilityScale, 11, 16, {
                color:
                  meta.tone === "warning"
                    ? colors.warn
                    : meta.tone === "success"
                      ? colors.success
                      : colors.mutedForeground,
                fontWeight: "600",
              })}
            >
              {meta.status}
            </Text>
          ) : null}
        </View>
      ) : null}
      <Icon
        name="ChevronRight"
        className={cn(
          "size-sm text-muted-foreground",
          largeTextLayout && "mt-1"
        )}
      />
    </Pressable>
  )
}

function AppRow({
  accessibilityScale,
  detail,
  icon,
  label,
  largeTextLayout,
  onPress,
}: {
  accessibilityScale: number
  detail?: string
  icon: string
  label: string
  largeTextLayout: boolean
  onPress: () => void
}) {
  const colors = useColors()

  return (
    <Pressable
      accessibilityLabel={`Open ${label.toLowerCase()}`}
      accessibilityRole="button"
      className={cn(
        "min-h-14 flex-row gap-3 border-b border-border active:bg-accent/30",
        largeTextLayout ? "items-start py-4" : "items-center py-2"
      )}
      haptic
      onPress={onPress}
    >
      <View className="size-9 items-center justify-center rounded-xl bg-accent">
        <Icon name={icon} className="size-sm text-accent-foreground" />
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text
          allowFontScaling={false}
          className="text-sm font-bold text-foreground"
          style={scaledTextStyle(accessibilityScale, 14, 20, {
            color: colors.foreground,
            fontWeight: "700",
          })}
        >
          {label}
        </Text>
        {detail ? (
          <Text
            allowFontScaling={false}
            className="text-xs text-muted-foreground"
            style={scaledTextStyle(accessibilityScale, 12, 18, {
              color: colors.mutedForeground,
            })}
          >
            {detail}
          </Text>
        ) : null}
      </View>
      <Icon
        name="ChevronRight"
        className={cn(
          "size-sm text-muted-foreground",
          largeTextLayout && "mt-1"
        )}
      />
    </Pressable>
  )
}

export function MemberMoreDirectory({
  currencyCode,
  error,
  hub,
  isLoading,
  onOpenDeviceAccess,
  onOpenAppLock,
  onOpenNotifications,
  onOpenSection,
  onOpenUpdates,
  workspace,
}: {
  currencyCode: string
  error: string | null
  hub: MobileMemberMore | null
  isLoading: boolean
  onOpenDeviceAccess: () => void
  onOpenAppLock: () => void
  onOpenNotifications: () => void
  onOpenSection: (key: MemberMoreSectionKey) => void
  onOpenUpdates: () => void
  workspace?: ReactNode
}) {
  const colors = useColors()
  const largeTextLayout = useLargeTextLayout()
  const { fontScale } = useWindowDimensions()
  const accessibilityScale = Number.isFinite(fontScale)
    ? Math.max(fontScale, 1)
    : 1
  const moneySections =
    hub?.sections.filter((section) => moneySectionKeys.has(section.key)) ?? []
  const serviceSections =
    hub?.sections.filter((section) => serviceSectionKeys.has(section.key)) ?? []

  return (
    <View className="gap-5">
      {hub?.cache?.status === "stale" ? (
        <CachedReadBanner
          action="starting a new request"
          cache={hub.cache}
          label="member data"
        />
      ) : null}
      {isLoading ? (
        <View className="min-h-28 items-center justify-center">
          <LoadingSpinner />
        </View>
      ) : hub ? (
        <>
          <MemberIdentity
            accessibilityScale={accessibilityScale}
            hub={hub}
            largeTextLayout={largeTextLayout}
          />
          <DirectorySection
            accessibilityScale={accessibilityScale}
            largeTextLayout={largeTextLayout}
            title="Money"
          >
            {moneySections.map((section) => (
              <DirectoryRow
                accessibilityScale={accessibilityScale}
                currencyCode={currencyCode}
                key={section.key}
                largeTextLayout={largeTextLayout}
                onPress={() =>
                  onOpenSection(section.key as MemberMoreSectionKey)
                }
                section={section}
              />
            ))}
          </DirectorySection>
          <DirectorySection
            accessibilityScale={accessibilityScale}
            largeTextLayout={largeTextLayout}
            title="Services"
          >
            {serviceSections.map((section) => (
              <DirectoryRow
                accessibilityScale={accessibilityScale}
                currencyCode={currencyCode}
                key={section.key}
                largeTextLayout={largeTextLayout}
                onPress={() =>
                  onOpenSection(section.key as MemberMoreSectionKey)
                }
                section={section}
              />
            ))}
          </DirectorySection>
        </>
      ) : null}

      {error ? (
        <View className="border-y border-destructive/30 py-4">
          <Text className="text-sm font-semibold text-destructive">
            {error}
          </Text>
          <Text className="mt-1 text-xs leading-4 text-muted-foreground">
            Your app settings remain available below.
          </Text>
        </View>
      ) : null}

      <DirectorySection
        accessibilityScale={accessibilityScale}
        largeTextLayout={largeTextLayout}
        title="App"
      >
        <AppRow
          accessibilityScale={accessibilityScale}
          icon="LockKeyhole"
          label="App lock"
          largeTextLayout={largeTextLayout}
          onPress={onOpenAppLock}
        />
        <AppRow
          accessibilityScale={accessibilityScale}
          icon="ShieldCheck"
          label="Device access"
          largeTextLayout={largeTextLayout}
          onPress={onOpenDeviceAccess}
        />
        <AppRow
          accessibilityScale={accessibilityScale}
          icon="Bell"
          label="Notifications"
          largeTextLayout={largeTextLayout}
          onPress={onOpenNotifications}
        />
        <AppRow
          accessibilityScale={accessibilityScale}
          icon="RefreshCw"
          label="App updates"
          largeTextLayout={largeTextLayout}
          onPress={onOpenUpdates}
        />
      </DirectorySection>

      {workspace}

      <View className="gap-2">
        <Text
          allowFontScaling={false}
          className={cn(
            "text-sm font-extrabold text-foreground",
            !largeTextLayout && "tracking-tight"
          )}
          style={scaledTextStyle(
            resolveDisplayTextScale(accessibilityScale),
            14,
            19,
            {
              color: colors.foreground,
              fontWeight: "800",
              letterSpacing: largeTextLayout ? 0 : -0.2,
            }
          )}
        >
          Appearance
        </Text>
        <ThemeSelector />
      </View>
    </View>
  )
}
