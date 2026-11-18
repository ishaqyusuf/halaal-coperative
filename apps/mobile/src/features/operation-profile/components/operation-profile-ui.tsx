import { ScreenHeaderButton, ScreenHero } from "@/components/app/screen-shell"
import { Icon } from "@/components/ui/icon"
import { StatusPill, type StatusTone } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { THEME } from "@/lib/theme"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"
import { View } from "react-native"
import {
  getOperationProfileCounts,
  getOperationProfileMode,
  getOperationProfileService,
} from "../model/operation-profile-policy"
import type {
  MobileOperationProfileSnapshot,
  OperationProfileAccessMode,
  OperationProfileServiceKey,
} from "../model/operation-profile-types"

const reviewedDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

const serviceTints = {
  payment_receipts: ["bg-accent", "text-accent-foreground"],
  procurement: ["bg-tint-sky", "text-tint-sky-foreground"],
  food_purchase: ["bg-tint-warm", "text-tint-warm-foreground"],
  support_cases: ["bg-tint-lilac", "text-tint-lilac-foreground"],
  collection_sources: ["bg-accent", "text-accent-foreground"],
  collection_source_batch_posting: [
    "bg-surface-raised",
    "text-foreground-soft",
  ],
} satisfies Record<OperationProfileServiceKey, [string, string]>

const modeTones: Record<OperationProfileAccessMode, StatusTone> = {
  member_self_service: "success",
  office_only: "info",
  read_only: "warning",
  disabled: "neutral",
}

export function ServiceTile({
  serviceKey,
}: {
  serviceKey: OperationProfileServiceKey
}) {
  const [surface, ink] = serviceTints[serviceKey]
  return (
    <View
      className={cn(
        "size-[38px] shrink-0 items-center justify-center rounded-[12px]",
        surface
      )}
    >
      <Icon
        className={cn("size-md", ink)}
        name={getOperationProfileService(serviceKey).icon}
      />
    </View>
  )
}

export function ModePill({
  compact,
  mode,
}: {
  compact?: boolean
  mode: OperationProfileAccessMode
}) {
  return (
    <StatusPill
      label={
        compact && mode === "member_self_service"
          ? "Self-service"
          : getOperationProfileMode(mode).label
      }
      tone={modeTones[mode]}
    />
  )
}

// Both hero gradients use the high-contrast tinted ink from the dark palette.
const heroIndicators = THEME.dark

export function OperationProfileHero({
  onBack,
  snapshot,
  tenantName,
}: {
  onBack: () => void
  snapshot?: MobileOperationProfileSnapshot
  tenantName?: string
}) {
  const counts = snapshot ? getOperationProfileCounts(snapshot) : null
  const metrics = counts
    ? [
        {
          label: "Self-service",
          value: counts.memberSelfService,
          color: heroIndicators.tintSuccessForeground,
        },
        {
          label: "Office only",
          value: counts.officeOnly,
          color: heroIndicators.tintSkyForeground,
        },
        {
          label: "Restricted",
          value: counts.restricted,
          color: heroIndicators.tintWarmForeground,
        },
      ]
    : []
  return (
    <View className="overflow-hidden rounded-b-[28px]">
      <ScreenHero className="gap-[14px]">
        <View
          pointerEvents="none"
          style={{
            backgroundColor: THEME.light.card,
            borderRadius: 110,
            height: 220,
            opacity: 0.07,
            position: "absolute",
            right: -108,
            top: -130,
            width: 220,
          }}
        />
        <View
          pointerEvents="none"
          style={{
            backgroundColor: THEME.light.brand,
            borderRadius: 60,
            height: 120,
            opacity: 0.35,
            position: "absolute",
            right: -48,
            top: -18,
            width: 120,
          }}
        />
        <View className="ml-[-8px] self-start">
          <ScreenHeaderButton
            accessibilityLabel="Go back"
            icon="ChevronLeft"
            onPress={onBack}
            tone="inverse"
          />
        </View>
        <View className="gap-[6px]">
          {tenantName ? (
            <Text className="text-hero-foreground/80" variant="label">
              {tenantName}
            </Text>
          ) : null}
          <Text
            accessibilityRole="header"
            className="text-hero-foreground"
            variant="screenTitle"
          >
            Operation profile
          </Text>
          {snapshot ? (
            <View className="bg-hero-foreground/15 min-h-[28px] flex-row items-center gap-[7px] self-start rounded-full py-[4px] pr-[11px] pl-[9px]">
              <Icon
                color={
                  snapshot.reviewedAt
                    ? heroIndicators.tintSuccessForeground
                    : heroIndicators.tintWarmForeground
                }
                name={snapshot.reviewedAt ? "CircleCheck" : "CircleAlert"}
                className="size-[15px]"
              />
              <Text
                className="text-hero-foreground min-w-0 shrink"
                variant="caption"
              >
                {snapshot.reviewedAt
                  ? `Reviewed ${reviewedDate.format(new Date(snapshot.reviewedAt))}${snapshot.reviewedByName ? ` · ${snapshot.reviewedByName}` : ""}`
                  : "Not reviewed yet"}
              </Text>
            </View>
          ) : null}
        </View>
        {counts ? (
          <>
            <View className="flex-row gap-[8px]">
              {metrics.map((metric) => (
                <View
                  className="bg-hero-foreground/15 min-w-0 flex-1 gap-[2px] rounded-[16px] px-[11px] py-[10px]"
                  key={metric.label}
                >
                  <Text
                    className="text-hero-foreground"
                    tabular
                    variant="title"
                  >
                    {metric.value}
                  </Text>
                  <Text className="text-hero-foreground/80" variant="caption">
                    {metric.label}
                  </Text>
                </View>
              ))}
            </View>
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              className="h-[6px] flex-row gap-[3px]"
            >
              {metrics
                .filter((metric) => metric.value > 0)
                .map((metric) => (
                  <View
                    key={metric.label}
                    style={{
                      backgroundColor: metric.color,
                      borderRadius: 3,
                      flex: metric.value,
                      height: 6,
                    }}
                  />
                ))}
            </View>
          </>
        ) : null}
      </ScreenHero>
    </View>
  )
}

const bannerTones = {
  info: ["bg-accent", "text-accent-foreground"],
  warning: ["bg-tint-warm", "text-tint-warm-foreground"],
  error: ["bg-tint-danger", "text-tint-danger-foreground"],
} as const

export function ProfileBanner({
  action,
  description,
  icon,
  title,
  tone = "info",
}: {
  action?: ReactNode
  description?: string
  icon: string
  title: string
  tone?: keyof typeof bannerTones
}) {
  const [surface, ink] = bannerTones[tone]
  return (
    <View
      accessibilityLiveRegion="polite"
      className={cn(
        "flex-row items-start gap-[10px] rounded-[16px] px-[12px] py-[10px]",
        surface
      )}
    >
      <Icon className={cn("size-base mt-[2px] shrink-0", ink)} name={icon} />
      <View className="min-w-0 flex-1 gap-[2px]">
        <Text className={ink} variant="label">
          {title}
        </Text>
        {description ? (
          <Text className={ink} variant="small">
            {description}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  )
}

export function ModeTransition({
  from,
  inverse,
  to,
}: {
  from: OperationProfileAccessMode
  inverse?: boolean
  to: OperationProfileAccessMode
}) {
  return (
    <View className="min-w-0 flex-row flex-wrap items-center gap-[8px]">
      <Text
        className={cn(
          "line-through",
          inverse ? "text-hero-foreground/70" : "text-muted-foreground"
        )}
        variant="section"
      >
        {getOperationProfileMode(from).label}
      </Text>
      <Icon
        className={cn(
          "size-base",
          inverse ? "text-hero-foreground/80" : "text-muted-foreground"
        )}
        name="ArrowRight"
      />
      <Text
        className={inverse ? "text-hero-foreground" : undefined}
        variant="section"
      >
        {getOperationProfileMode(to).label}
      </Text>
    </View>
  )
}

export function AuditReason({ reason }: { reason: string }) {
  return (
    <View className="gap-[4px] px-[16px] py-[12px]">
      <Text className="text-muted-foreground" variant="small">
        Audit reason
      </Text>
      <Text className="font-semibold" variant="small">
        {reason.trim() || "Not required"}
      </Text>
    </View>
  )
}
