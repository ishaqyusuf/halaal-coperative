import { EmptyState } from "@/components/app/empty-state"
import { ScreenHero } from "@/components/app/screen-shell"
import { Icon } from "@/components/ui/icon"
import { initialsFor, ListCard, TintedAvatar } from "@/components/ui/list-card"
import { Pressable } from "@/components/ui/pressable"
import { SectionHeader } from "@/components/ui/section-header"
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton"
import { StatusPill } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { useColors } from "@/hooks/use-color"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { cn } from "@/lib/utils"
import { type Href, useRouter } from "expo-router"
import { View } from "react-native"
import type {
  AdminActivityRow,
  AdminComplianceRow,
  AdminOverviewFigure,
  AdminOverviewPresentation,
  AdminOverviewTint,
  AdminQueueRow,
} from "../model/admin-overview-presentation"

const ACCOUNT_HREF: Href = "/(admin)/(tabs)/more"

/** 02 Brand native tint pairs (literal classes so NativeWind sees them). */
const tintClasses: Record<AdminOverviewTint, { icon: string; surface: string }> = {
  danger: { icon: "text-tint-danger-foreground", surface: "bg-tint-danger" },
  lilac: { icon: "text-tint-lilac-foreground", surface: "bg-tint-lilac" },
  neutral: { icon: "text-foreground-soft", surface: "bg-surface-raised" },
  sky: { icon: "text-tint-sky-foreground", surface: "bg-tint-sky" },
  success: { icon: "text-tint-success-foreground", surface: "bg-tint-success" },
  vivid: { icon: "text-tint-vivid-foreground", surface: "bg-tint-vivid" },
  warm: { icon: "text-tint-warm-foreground", surface: "bg-tint-warm" },
}

/** Figure colours on the hero (light ink on the gradient in both themes). */
const heroToneClasses: Record<AdminOverviewFigure["tone"], string> = {
  danger: "text-brand-vivid",
  default: "text-hero-foreground",
  ok: "text-hero-accent",
  warm: "text-brand-warm",
}

function TintTile({ icon, tint }: { icon: string; tint: AdminOverviewTint }) {
  const classes = tintClasses[tint]
  return (
    <View
      accessible={false}
      className={cn("size-[40px] items-center justify-center rounded-[14px]", classes.surface)}
    >
      <Icon className={cn("size-base", classes.icon)} name={icon} />
    </View>
  )
}

function HeroBone({ className }: { className: string }) {
  return (
    <View accessible={false} className={cn("rounded-[10px] bg-hero-foreground/15", className)} />
  )
}

/** The collections meter: a light track with a runtime-width fill. */
function HeroMeter({ ratio }: { ratio: number }) {
  const colors = useColors()
  const percent = Math.round(ratio * 100)
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ max: 100, min: 0, now: percent }}
      className="my-[4px] h-[4px] w-full overflow-hidden rounded-full bg-hero-foreground/20"
    >
      {/* Runtime width: a style-only element (ADR style composition). */}
      <View
        style={{
          backgroundColor: colors.heroAccent,
          borderRadius: 999,
          height: 4,
          width: `${percent}%`,
        }}
      />
    </View>
  )
}

function DecisionChip({ total, urgent }: { total: number; urgent: number }) {
  if (urgent > 0) {
    return (
      <View className="rounded-full bg-tint-danger px-[10px] py-[3px]">
        <Text className="text-tint-danger-foreground" numberOfLines={1} variant="caption">
          {urgent} urgent
        </Text>
      </View>
    )
  }
  if (total > 0) {
    return (
      <View className="rounded-full bg-hero-foreground/15 px-[10px] py-[3px]">
        <Text className="text-hero-foreground" numberOfLines={1} variant="caption">
          None urgent
        </Text>
      </View>
    )
  }
  return (
    <View className="flex-row items-center gap-[4px] rounded-full bg-hero-foreground/15 px-[10px] py-[3px]">
      <Icon className="size-[12px] text-hero-accent" name="Check" />
      <Text className="text-hero-accent" numberOfLines={1} variant="caption">
        Queue clear
      </Text>
    </View>
  )
}

function FigureCell({ figure }: { figure: AdminOverviewFigure }) {
  return (
    <View
      accessibilityLabel={`${figure.label}, ${figure.value}. ${figure.detail}`}
      accessible
      className="min-w-0 flex-1 gap-[2px] px-[14px] py-[12px]"
    >
      <Text className="text-hero-foreground/75" numberOfLines={1} variant="caption">
        {figure.label}
      </Text>
      <Text
        className={cn("text-[19px] font-extrabold leading-[24px]", heroToneClasses[figure.tone])}
        numberOfLines={1}
        tabular
      >
        {figure.value}
      </Text>
      {figure.ratio !== null ? <HeroMeter ratio={figure.ratio} /> : null}
      <Text className="text-hero-foreground/75" numberOfLines={2} variant="caption">
        {figure.detail}
      </Text>
    </View>
  )
}

/**
 * The brand hero (workshop 05, 02 Queue first): account, title and the
 * "Updated" chip; the open decisions as the 36/42 hero number with the
 * urgent chip; then one card with deployable funds over collections and
 * portfolio risk. `overlap` leaves room for the ask bar on its bottom edge.
 */
export function AdminOverviewHero({
  loading,
  overlap,
  presentation,
  tenantName,
  updatedLabel,
  userName,
}: {
  loading: boolean
  overlap: boolean
  presentation: AdminOverviewPresentation | null
  tenantName: string
  updatedLabel: string | null
  userName: string
}) {
  const largeText = useLargeTextLayout()
  const { collections, decisions, deployable, risk } = presentation ?? {}

  return (
    <ScreenHero className={cn("gap-[22px]", overlap && "pb-[30px]")}>
      <View className="flex-row items-center gap-[12px]">
        <Pressable
          accessibilityLabel={`${userName}, account`}
          accessibilityRole="button"
          className="size-[44px] items-center justify-center rounded-full bg-brand-warm"
          haptic
          href={ACCOUNT_HREF}
          testID="admin-overview-account"
        >
          <Text className="text-hero-mark-foreground" variant="label">
            {initialsFor(userName) || "AD"}
          </Text>
        </Pressable>
        <View className="min-w-0 flex-1">
          <Text accessibilityRole="header" className="text-hero-foreground" variant="title">
            Overview
          </Text>
          <Text
            className="text-hero-foreground/75"
            numberOfLines={largeText ? 2 : 1}
            variant="small"
          >
            {tenantName}
          </Text>
        </View>
        {updatedLabel ? (
          <View
            accessibilityLabel={`Updated ${updatedLabel}`}
            className="flex-row items-center gap-[6px] rounded-full bg-hero-foreground/15 px-[10px] py-[4px]"
          >
            <View className="size-[6px] rounded-full bg-hero-accent" />
            <Text className="text-hero-foreground" numberOfLines={1} variant="caption">
              Updated {updatedLabel}
            </Text>
          </View>
        ) : null}
      </View>

      {loading ? (
        <View accessibilityLabel="Loading the overview" className="gap-[10px]">
          <HeroBone className="h-[14px] w-[120px]" />
          <HeroBone className="h-[40px] w-[220px]" />
          <HeroBone className="mt-[8px] h-[136px] w-full rounded-[20px]" />
        </View>
      ) : decisions ? (
        <View className="gap-[18px]">
          <View className="gap-[2px]" testID="admin-overview-decisions">
            <Text className="text-hero-foreground/75" variant="label">
              Needs your decision
            </Text>
            <View
              accessibilityLabel={`${decisions.total} open decisions, ${decisions.urgent} urgent`}
              accessible
              className="flex-row flex-wrap items-center gap-x-[10px]"
            >
              <Text
                className={decisions.total ? "text-hero-foreground" : "text-hero-foreground/75"}
                variant="hero"
              >
                {String(decisions.total)}
              </Text>
              <Text className="mt-[6px] text-hero-foreground" variant="section">
                {decisions.total === 1 ? "open decision" : "open decisions"}
              </Text>
              <View className="mt-[6px] flex-1 items-end">
                <DecisionChip total={decisions.total} urgent={decisions.urgent} />
              </View>
            </View>
          </View>

          {deployable || collections || risk ? (
            <View className="overflow-hidden rounded-[20px] bg-hero-end/50">
              {deployable ? (
                <View
                  accessibilityLabel={`${deployable.label}, ${deployable.value}. ${deployable.detail}`}
                  accessible
                  className="flex-row items-center gap-[12px] px-[14px] py-[12px]"
                >
                  <View className="size-[36px] items-center justify-center rounded-[12px] bg-hero-foreground/15">
                    <Icon className="size-[18px] text-hero-foreground" name="Wallet" />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-hero-foreground" numberOfLines={1} variant="label">
                      {deployable.label}
                    </Text>
                    <Text className="text-hero-foreground/75" numberOfLines={1} variant="caption">
                      {deployable.detail}
                    </Text>
                  </View>
                  <Text
                    adjustsFontSizeToFit={!largeText}
                    className={cn(
                      "shrink-0 text-[19px] font-extrabold leading-[24px]",
                      deployable.zero ? "text-hero-foreground/75" : "text-hero-foreground"
                    )}
                    minimumFontScale={0.75}
                    numberOfLines={1}
                    tabular
                  >
                    {deployable.value}
                  </Text>
                </View>
              ) : null}
              {collections || risk ? (
                <View
                  className={cn(
                    "border-t border-hero-foreground/15",
                    largeText ? "" : "flex-row"
                  )}
                >
                  {collections ? <FigureCell figure={collections} /> : null}
                  {collections && risk ? (
                    <View
                      className={largeText ? "h-px bg-hero-foreground/15" : "w-px bg-hero-foreground/15"}
                    />
                  ) : null}
                  {risk ? <FigureCell figure={risk} /> : null}
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}
    </ScreenHero>
  )
}

function useOpen() {
  const router = useRouter()
  return (href: Href | null) => (href ? () => router.push(href) : undefined)
}

function QueueRowView({ row }: { row: AdminQueueRow }) {
  const open = useOpen()
  const largeText = useLargeTextLayout()
  return (
    <Pressable
      accessibilityLabel={`${row.label}, ${row.count}. ${row.severityLabel}${row.destination ? `. Opens ${row.destination}` : ""}`}
      accessibilityRole={row.href ? "button" : undefined}
      className="min-h-[64px] flex-row items-center gap-[12px] px-[14px] py-[12px] active:bg-accent/60"
      haptic={Boolean(row.href)}
      onPress={open(row.href)}
      testID={`admin-overview-queue-${row.key}`}
    >
      <TintTile icon={row.icon} tint={row.tint} />
      <View className="min-w-0 flex-1 gap-[4px]">
        <Text className="font-bold" numberOfLines={largeText ? undefined : 1} variant="body">
          {row.label}
        </Text>
        <View className="flex-row flex-wrap items-center gap-[6px]">
          <StatusPill label={row.severityLabel} tone={row.severityTone} />
          {row.destination ? (
            <Text
              className="min-w-0 shrink text-muted-foreground"
              numberOfLines={1}
              variant="small"
            >
              {row.destination}
            </Text>
          ) : null}
        </View>
      </View>
      <Text className="shrink-0" variant="money">
        {String(row.count)}
      </Text>
      {row.href ? (
        <Icon className="size-sm text-muted-foreground" name="ChevronRight" />
      ) : (
        <View className="w-[16px]" />
      )}
    </Pressable>
  )
}

function QueueLabel({ count, label, urgent }: { count: number; label: string; urgent: boolean }) {
  return (
    <View className="flex-row items-center gap-[6px] px-[4px] pb-[6px]">
      {urgent ? <View className="size-[6px] rounded-full bg-destructive" /> : null}
      <Text
        className={urgent ? "text-destructive" : "text-muted-foreground"}
        variant="caption"
      >
        {label} · {count}
      </Text>
    </View>
  )
}

function SetupWarning({ label }: { label: string }) {
  return (
    <View
      accessibilityRole="summary"
      className="flex-row items-start gap-[10px] rounded-[18px] bg-tint-warm px-[14px] py-[12px]"
    >
      <Icon className="mt-[2px] size-base text-tint-warm-foreground" name="TriangleAlert" />
      <View className="min-w-0 flex-1">
        <Text className="text-tint-warm-foreground" variant="label">
          Setup warning
        </Text>
        <Text className="text-tint-warm-foreground" variant="small">
          {label}
        </Text>
      </View>
    </View>
  )
}

/**
 * "Needs attention": setup warnings, then the urgent rows, then the rest,
 * each a ListCard; rows open their mobile screen.
 */
export function AdminAttentionSection({
  presentation,
}: {
  presentation: AdminOverviewPresentation
}) {
  const { decisions, open, urgent, warnings } = presentation
  return (
    <View className="gap-[8px]" testID="admin-overview-attention">
      <SectionHeader
        title="Needs attention"
        value={decisions.total ? String(decisions.total) : undefined}
      />
      {warnings.map((warning) => (
        <SetupWarning key={warning.key} label={warning.label} />
      ))}
      {urgent.length || open.length ? (
        <View className="gap-[12px]">
          {urgent.length ? (
            <View>
              <QueueLabel count={presentation.urgentTotal} label="Urgent" urgent />
              <ListCard>
                {urgent.map((row) => (
                  <QueueRowView key={row.key} row={row} />
                ))}
              </ListCard>
            </View>
          ) : null}
          {open.length ? (
            <View>
              {urgent.length ? (
                <QueueLabel count={presentation.openTotal} label="Open" urgent={false} />
              ) : null}
              <ListCard>
                {open.map((row) => (
                  <QueueRowView key={row.key} row={row} />
                ))}
              </ListCard>
            </View>
          ) : null}
        </View>
      ) : (
        <ListCard>
          <EmptyState description="No open decisions." icon="ShieldCheck" title="Queue clear" />
        </ListCard>
      )}
    </View>
  )
}

function ComplianceRowView({ row }: { row: AdminComplianceRow }) {
  const open = useOpen()
  const clear = row.count <= 0
  return (
    <Pressable
      accessibilityLabel={clear ? `${row.label}, clear` : `${row.label}, ${row.count}`}
      accessibilityRole={row.href ? "button" : undefined}
      className="min-h-[64px] flex-row items-center gap-[12px] px-[14px] py-[12px] active:bg-accent/60"
      haptic={Boolean(row.href)}
      onPress={open(row.href)}
      testID={`admin-overview-compliance-${row.key}`}
    >
      <TintTile icon={row.icon} tint={clear ? "neutral" : "warm"} />
      <Text className="min-w-0 flex-1 font-bold" variant="body">
        {row.label}
      </Text>
      <StatusPill label={clear ? "Clear" : String(row.count)} tone={clear ? "neutral" : "warning"} />
      {row.href ? (
        <Icon className="size-sm text-muted-foreground" name="ChevronRight" />
      ) : (
        <View className="w-[16px]" />
      )}
    </Pressable>
  )
}

/** Compliance: one ListCard of counters; zero reads "Clear" (no chevron). */
export function AdminComplianceSection({ rows }: { rows: AdminComplianceRow[] }) {
  if (!rows.length) return null
  return (
    <View testID="admin-overview-compliance">
      <SectionHeader title="Compliance" />
      <ListCard>
        {rows.map((row) => (
          <ComplianceRowView key={row.key} row={row} />
        ))}
      </ListCard>
    </View>
  )
}

function ActivityRowView({ row }: { row: AdminActivityRow }) {
  const largeText = useLargeTextLayout()
  const end = row.amount ? (
    <Text
      className={cn(
        "shrink-0",
        row.amountTone === "repayment" ? "text-tint-sky-foreground" : "text-tint-success-foreground"
      )}
      numberOfLines={1}
      variant="money"
    >
      {row.amount}
    </Text>
  ) : row.status ? (
    <StatusPill label={row.status} tone="info" />
  ) : null
  return (
    <View
      accessibilityLabel={[row.label, row.meta, row.amount ?? row.status].filter(Boolean).join(". ")}
      accessible
      className="min-h-[64px] flex-row items-center gap-[12px] px-[14px] py-[12px]"
    >
      <TintedAvatar name={row.memberName ?? row.label} />
      <View className="min-w-0 flex-1 gap-[2px]">
        <Text className="font-bold" variant="body">
          {row.label}
        </Text>
        <Text className="text-muted-foreground" numberOfLines={largeText ? undefined : 1} variant="small">
          {row.meta}
        </Text>
        {largeText ? end : null}
      </View>
      {largeText ? null : end}
    </View>
  )
}

/** Recent activity: member avatar, what happened, when, and the amount. */
export function AdminActivitySection({ rows }: { rows: AdminActivityRow[] }) {
  return (
    <View testID="admin-overview-activity">
      <SectionHeader title="Recent activity" />
      <ListCard inset={false}>
        {rows.length ? (
          rows.map((row) => <ActivityRowView key={row.id} row={row} />)
        ) : (
          <EmptyState icon="Inbox" title="No recent activity." />
        )}
      </ListCard>
    </View>
  )
}

/** First-load body: the same silhouette as the content, no spinner. */
export function AdminOverviewBodySkeleton() {
  return (
    <SkeletonGroup>
      <View
        accessibilityLabel="Loading the overview"
        accessibilityRole="progressbar"
        className="gap-[16px]"
        testID="admin-overview-skeleton"
      >
        <Skeleton className="h-[22px] w-[150px] rounded-md" />
        <Skeleton className="h-[136px] w-full rounded-[20px]" />
        <Skeleton className="h-[200px] w-full rounded-[20px]" />
        <Skeleton className="h-[22px] w-[110px] rounded-md" />
        <Skeleton className="h-[200px] w-full rounded-[20px]" />
      </View>
    </SkeletonGroup>
  )
}
