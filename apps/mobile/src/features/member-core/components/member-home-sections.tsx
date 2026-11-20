import { ScreenHero } from "@/components/app/screen-shell"
import { Icon } from "@/components/ui/icon"
import { initialsFor, ListCard } from "@/components/ui/list-card"
import { Pressable } from "@/components/ui/pressable"
import { SectionHeader } from "@/components/ui/section-header"
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"
import { useColors } from "@/hooks/use-color"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import type { MobileProfile } from "@/lib/session-store"
import { cn } from "@/lib/utils"
import { type Href, useRouter } from "expo-router"
import { View } from "react-native"
import type {
  MemberHomeAttentionRow,
  MemberHomeReadiness,
  MemberHomeServiceTile,
  MemberHomeStat,
} from "../model/member-home-presentation"
import {
  attentionTintFor,
  type HomeTint,
  homeTintClasses,
  serviceTintFor,
  statTintFor,
} from "./member-home-tints"

/** KYC and membership status live on the member's More hub. */
const READINESS_HREF: Href = "/(member)/(tabs)/more"

function chunk<T>(items: T[], size: number) {
  const rows: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size))
  }
  return rows
}

function countLabel(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`
}

/** 44pt round bell on the hero, with the unread badge ("9+" cap). */
function HeroBellButton({ badge }: { badge: string | null }) {
  return (
    // The badge is a sibling overlay: the pressable clips its children.
    <View className="size-[44px]">
      <Pressable
        accessibilityLabel={
          badge ? `Notifications, ${badge} unread` : "Notifications"
        }
        accessibilityRole="button"
        className="size-[44px] items-center justify-center rounded-full bg-hero-foreground/15"
        haptic
        hitSlop={4}
        href="/notifications"
        testID="member-home-notifications"
        transition
      >
        <Icon className="size-md text-hero-foreground" name="Bell" />
      </Pressable>
      {badge ? (
        <View
          accessible={false}
          className="absolute -right-[4px] -top-[4px] h-[20px] min-w-[20px] items-center justify-center rounded-full bg-brand-vivid px-[5px]"
          pointerEvents="none"
          testID="member-home-notifications-badge"
        >
          <Text className="text-hero-foreground" numberOfLines={1} variant="caption">
            {badge}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

/** The readiness meter: a light track with a fill sized at runtime. */
function ReadinessMeter({
  percentage,
  ready,
}: {
  percentage: number
  ready: boolean
}) {
  const colors = useColors()
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ max: 100, min: 0, now: percentage }}
      className="h-[4px] w-full overflow-hidden rounded-full bg-hero-foreground/20"
    >
      {/* Runtime width: a style-only element (ADR style composition). */}
      <View
        style={{
          backgroundColor: ready ? colors.heroAccent : colors.brandWarm,
          borderRadius: 999,
          height: 4,
          width: `${percentage}%`,
        }}
      />
    </View>
  )
}

/**
 * Readiness as a compact pressable strip (workshop 02): percentage, a hero
 * pill, the meter and one caption line. It opens the More hub (KYC).
 */
function ReadinessStrip({
  memberNumber,
  readiness,
}: {
  memberNumber: string | null
  readiness: MemberHomeReadiness
}) {
  const largeText = useLargeTextLayout()
  const ready = readiness.status === "ready"
  const caption = ready
    ? [memberNumber, "KYC verified"].filter(Boolean).join(" · ")
    : readiness.detail
  return (
    <Pressable
      accessibilityLabel={`Member readiness ${readiness.percentage}%, ${readiness.label}. ${caption}`}
      accessibilityRole="button"
      className="gap-[10px] rounded-[18px] bg-hero-foreground/10 px-[14px] py-[12px] active:bg-hero-foreground/15"
      haptic
      href={READINESS_HREF}
      testID="member-home-readiness"
    >
      <View className="flex-row items-center gap-[8px]">
        <Text className="min-w-0 flex-1 text-hero-foreground" variant="label">
          Readiness {readiness.percentage}%
        </Text>
        <View
          className={cn(
            "flex-row items-center gap-[4px] rounded-full px-[10px] py-[3px]",
            ready ? "bg-hero-foreground/15" : "bg-brand-warm/25"
          )}
        >
          {ready ? (
            <Icon className="size-[12px] text-hero-accent" name="Check" />
          ) : null}
          <Text
            className={ready ? "text-hero-accent" : "text-brand-warm"}
            variant="caption"
          >
            {readiness.label}
          </Text>
        </View>
        <Icon className="size-sm text-hero-foreground/75" name="ChevronRight" />
      </View>
      <ReadinessMeter percentage={readiness.percentage} ready={ready} />
      <Text
        className="text-hero-foreground/75"
        numberOfLines={largeText ? undefined : ready ? 1 : 2}
        variant="caption"
      >
        {caption}
      </Text>
    </Pressable>
  )
}

function HeroBone({ className }: { className: string }) {
  return (
    <View
      accessible={false}
      className={cn("rounded-[10px] bg-hero-foreground/15", className)}
    />
  )
}

/**
 * The brand hero (workshop 02 Balance first): greeting and bell, the savings
 * total as the 36/42 hero number with its detail chip, then the readiness
 * strip. It runs under the status bar; ScreenShell fades the strip in once
 * it scrolls past.
 */
export function MemberHomeHero({
  loading,
  memberNumber,
  profile,
  readiness,
  savings,
  unreadBadge,
}: {
  loading: boolean
  memberNumber: string | null
  profile: MobileProfile
  readiness: MemberHomeReadiness | null
  savings: MemberHomeStat | null
  unreadBadge: string | null
}) {
  const largeText = useLargeTextLayout()
  const firstName = profile.user.name.trim().split(/\s+/)[0] || "Member"
  const router = useRouter()

  return (
    <ScreenHero className="gap-[20px]">
      <View className="flex-row items-center gap-[12px]">
        {/* The avatar opens More, where the member's profile and settings live. */}
        <Pressable
          accessibilityHint="Opens More"
          accessibilityLabel={`${profile.user.name} profile`}
          accessibilityRole="button"
          className="size-[44px] items-center justify-center rounded-full bg-hero-foreground/15"
          hitSlop={4}
          onPress={() => router.navigate("/(member)/(tabs)/more")}
          testID="member-home-avatar"
        >
          <Text className="text-hero-foreground" variant="label">
            {initialsFor(profile.user.name) || "HV"}
          </Text>
        </Pressable>
        <View className="min-w-0 flex-1">
          <Text
            accessibilityRole="header"
            className="text-hero-foreground"
            numberOfLines={largeText ? 2 : 1}
            variant="title"
          >
            Hi, {firstName}
          </Text>
          <Text
            className="text-hero-foreground/75"
            numberOfLines={largeText ? 2 : 1}
            variant="small"
          >
            {profile.tenant.name}
          </Text>
        </View>
        <HeroBellButton badge={unreadBadge} />
      </View>

      {loading ? (
        <View accessibilityLabel="Loading your savings" className="gap-[10px]">
          <HeroBone className="h-[14px] w-[96px]" />
          <HeroBone className="h-[40px] w-[200px]" />
          <HeroBone className="h-[26px] w-[190px] rounded-full" />
          <HeroBone className="mt-[8px] h-[78px] w-full rounded-[18px]" />
        </View>
      ) : savings || readiness ? (
        <View className="gap-[18px]">
          {savings ? (
            <View className="items-start gap-[4px]" testID="member-home-savings">
              <Text className="text-hero-foreground/75" variant="label">
                {savings.label}
              </Text>
              <Text
                adjustsFontSizeToFit={!largeText}
                className="text-hero-foreground"
                minimumFontScale={0.7}
                numberOfLines={largeText ? undefined : 1}
                variant="hero"
              >
                {savings.value}
              </Text>
              <View className="flex-row items-center gap-[6px] rounded-full bg-hero-foreground/15 px-[10px] py-[4px]">
                <Icon className="size-[12px] text-hero-foreground" name="Check" />
                <Text className="text-hero-foreground" variant="caption">
                  {savings.detail}
                </Text>
              </View>
            </View>
          ) : null}
          {readiness ? (
            <ReadinessStrip memberNumber={memberNumber} readiness={readiness} />
          ) : null}
        </View>
      ) : null}
    </ScreenHero>
  )
}

function TintTile({
  icon,
  size,
  tint,
}: {
  icon: string
  size: 40 | 56
  tint: HomeTint
}) {
  const classes = homeTintClasses[tint]
  return (
    <View
      accessible={false}
      className={cn(
        "items-center justify-center",
        size === 40 ? "size-[40px] rounded-[14px]" : "size-[56px] rounded-[18px]",
        classes.surface
      )}
    >
      <Icon className={cn(size === 40 ? "size-base" : "size-md", classes.icon)} name={icon} />
    </View>
  )
}

/** "Needs attention": one ListCard of tappable rows, first on the page. */
export function AttentionList({ rows }: { rows: MemberHomeAttentionRow[] }) {
  const router = useRouter()
  const largeText = useLargeTextLayout()
  if (!rows.length) return null
  return (
    <View testID="member-home-attention">
      <SectionHeader title="Needs attention" value={countLabel(rows.length, "item")} />
      <ListCard>
        {rows.map((row) => {
          const href = row.href
          return (
            <Pressable
              accessibilityLabel={`${row.label}. ${row.detail}`}
              accessibilityRole={href ? "button" : undefined}
              className="min-h-[64px] flex-row items-center gap-[12px] px-[14px] py-[12px] active:bg-accent/60"
              haptic={Boolean(href)}
              key={row.key}
              onPress={href ? () => router.push(href) : undefined}
            >
              <TintTile icon={row.icon} size={40} tint={attentionTintFor(row.severity)} />
              <View className="min-w-0 flex-1 gap-[2px]">
                <Text className="font-bold" numberOfLines={largeText ? undefined : 1} variant="body">
                  {row.label}
                </Text>
                <Text
                  className="text-muted-foreground"
                  numberOfLines={largeText ? undefined : 2}
                  variant="small"
                >
                  {row.detail}
                </Text>
              </View>
              {href ? (
                <Icon className="size-sm text-muted-foreground" name="ChevronRight" />
              ) : null}
            </Pressable>
          )
        })}
      </ListCard>
    </View>
  )
}

/**
 * "Your position": one ListCard of record rows (tinted icon, label, a
 * two-line detail and the amount). Holds long naira amounts and large text
 * better than tiles; at large sizes the amount moves under the label.
 */
export function PositionList({
  onOpenStatement,
  stats,
}: {
  onOpenStatement: () => void
  stats: MemberHomeStat[]
}) {
  const largeText = useLargeTextLayout()
  if (!stats.length) return null
  return (
    <View testID="member-home-position">
      <SectionHeader
        action={{
          accessibilityLabel: "Open statement",
          label: "Statement",
          onPress: onOpenStatement,
        }}
        title="Your position"
      />
      <ListCard>
        {stats.map((stat) => {
          const look = statTintFor(stat.key)
          return (
            <View
              accessibilityLabel={`${stat.label}, ${stat.value}. ${stat.detail}`}
              accessible
              className="min-h-[64px] flex-row items-center gap-[12px] px-[14px] py-[12px]"
              key={stat.key}
            >
              <TintTile icon={look.icon} size={40} tint={look.tint} />
              <View className="min-w-0 flex-1 gap-[2px]">
                <Text className="font-bold" numberOfLines={largeText ? undefined : 1} variant="body">
                  {stat.label}
                </Text>
                {largeText ? (
                  <Text variant="money">{stat.value}</Text>
                ) : null}
                <Text
                  className="text-muted-foreground"
                  numberOfLines={largeText ? undefined : 2}
                  variant="small"
                >
                  {stat.detail}
                </Text>
              </View>
              {largeText ? null : (
                <Text className="shrink-0" numberOfLines={1} variant="money">
                  {stat.value}
                </Text>
              )}
            </View>
          )
        })}
      </ListCard>
    </View>
  )
}

function ServiceTileButton({ tile }: { tile: MemberHomeServiceTile }) {
  return (
    <Pressable
      accessibilityLabel={`Open ${tile.label}`}
      accessibilityRole="button"
      className="min-h-[88px] flex-1 items-center gap-[8px] rounded-[18px] py-[4px] active:bg-accent/60"
      haptic
      href={tile.href as Href}
      testID={`member-home-service-${tile.key}`}
      transition
    >
      <TintTile icon={tile.icon} size={56} tint={serviceTintFor(tile.key)} />
      <Text className="text-center" numberOfLines={1} variant="caption">
        {tile.label}
      </Text>
    </Pressable>
  )
}

function ServiceRowButton({ tile }: { tile: MemberHomeServiceTile }) {
  return (
    <Pressable
      accessibilityLabel={`Open ${tile.label}`}
      accessibilityRole="button"
      className="min-h-[56px] flex-row items-center gap-[12px] px-[14px] py-[8px] active:bg-accent/60"
      haptic
      href={tile.href as Href}
      testID={`member-home-service-${tile.key}`}
    >
      <TintTile icon={tile.icon} size={40} tint={serviceTintFor(tile.key)} />
      <Text className="min-w-0 flex-1 font-bold" variant="body">
        {tile.label}
      </Text>
      <Icon className="size-sm text-muted-foreground" name="ChevronRight" />
    </Pressable>
  )
}

/**
 * Services: a 4-up grid of tinted tiles on the canvas; at large text sizes
 * a list of rows, so labels never truncate.
 */
export function ServicesGrid({ services }: { services: MemberHomeServiceTile[] }) {
  const largeText = useLargeTextLayout()
  const linked = services.filter((tile) => tile.href)
  if (!linked.length) return null
  return (
    <View testID="member-home-services">
      <SectionHeader title="Services" />
      {largeText ? (
        <ListCard>
          {linked.map((tile) => (
            <ServiceRowButton key={tile.key} tile={tile} />
          ))}
        </ListCard>
      ) : (
        <View className="gap-[8px]">
          {chunk(linked, 4).map((row) => (
            <View className="flex-row gap-[4px]" key={row.map((tile) => tile.key).join(":")}>
              {row.map((tile) => (
                <ServiceTileButton key={tile.key} tile={tile} />
              ))}
              {Array.from({ length: 4 - row.length }, (_, index) => (
                <View className="flex-1" key={`pad-${index}`} />
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

/** First-load body: the same silhouette as the content, no spinner. */
export function MemberHomeBodySkeleton() {
  return (
    <SkeletonGroup>
      <View
        accessibilityLabel="Loading member home"
        accessibilityRole="progressbar"
        className="gap-[16px]"
        testID="member-home-skeleton"
      >
        <Skeleton className="h-[22px] w-[140px] rounded-md" />
        <Skeleton className="h-[256px] w-full rounded-[20px]" />
        <Skeleton className="h-[22px] w-[110px] rounded-md" />
        <View className="flex-row gap-[12px]">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton className="h-[56px] flex-1 rounded-[18px]" key={index} />
          ))}
        </View>
        <View className="flex-row gap-[12px]">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton className="h-[56px] flex-1 rounded-[18px]" key={index} />
          ))}
        </View>
      </View>
    </SkeletonGroup>
  )
}
