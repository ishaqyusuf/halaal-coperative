import { ScreenBackButton } from "@/components/app/screen-back-button"
import { ScreenHeader } from "@/components/app/screen-header"
import { StatusBadge } from "@/components/app/status-badge"
import { SubmissionReviewSheet } from "@/components/app/submission-review-sheet"
import { FloatingBottomSheet } from "@/components/floating-bottom-sheet"
import { LoadingSpinner } from "@/components/loading-spinner"
import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import {
  formatCompactSubscriptionSetupFee as formatCompactSetupFeeValue,
  formatSubscriptionDate as formatDate,
  formatSubscriptionMoney as formatMoney,
  formatSubscriptionPlanCapacity as formatPlanCapacity,
  formatSubscriptionPlanPrice as formatPrice,
  formatSubscriptionSetupFee as formatSetupFeeValue,
  getSubscriptionBrowsePresentation,
  getSubscriptionPlanHighlights,
  getSubscriptionRecordedMessage,
  presentSubscriptionPlanRow,
} from "@/features/subscription/presentation/subscription-presentation"
import { useColors } from "@/hooks/use-color"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import {
  type MobilePlanChangeIntent,
  type MobileSubscriptionPlan,
  type MobileSubscriptionSnapshot,
} from "@/lib/mobile-subscription-api"
import {
  getPlanActionLabel,
  getSubscriptionExceptionPresentation,
  getSubscriptionStatusPresentation,
  getSubscriptionWarning,
  isSubscriptionReadOnly,
  type MobileSubscriptionExceptionPresentation,
} from "@/lib/mobile-subscription-policy"
import type { MobileReadCacheState } from "@/lib/read-cache"
import { cn } from "@/lib/utils"
import { ScreenStatusBar } from "@/components/app/screen-status-bar"
import { useEffect, useRef, useState } from "react"
import {
  RefreshControl,
  ScrollView,
  Text as NativeText,
  View,
  useWindowDimensions,
} from "react-native"

const subscriptionCacheDateFormatter = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  month: "short",
  year: "numeric",
})

function PlanDetailRow({ label, value }: { label: string; value: string }) {
  const useStackedLayout = useLargeTextLayout()

  return (
    <View
      className={cn(
        "min-h-12 border-b border-border py-3 last:border-b-0",
        useStackedLayout
          ? "gap-1"
          : "flex-row items-start justify-between gap-4"
      )}
    >
      <Text
        className={cn(
          "text-sm text-muted-foreground",
          !useStackedLayout && "min-w-0 flex-1"
        )}
      >
        {label}
      </Text>
      <Text
        className={cn(
          "text-sm font-extrabold text-foreground",
          !useStackedLayout && "max-w-[58%] text-right"
        )}
      >
        {value}
      </Text>
    </View>
  )
}

function SubscriptionHeader({ onBack }: { onBack: () => void }) {
  return (
    <ScreenHeader
      className="bg-brand-surface px-5 pt-4 pb-3"
      leading={<ScreenBackButton onPress={onBack} tone="inverse" />}
      tone="inverse"
      title="Plan & billing"
    />
  )
}

function VerifiedReadState({
  cache,
  readOnly,
}: {
  cache: MobileReadCacheState | null | undefined
  readOnly: boolean
}) {
  if (!cache || (!readOnly && cache.status !== "stale")) return null
  return (
    <View className="flex-row items-center gap-2">
      <View className="bg-success size-2 rounded-full" />
      <Text className="text-success text-xs font-bold">
        Last verified{" "}
        {subscriptionCacheDateFormatter.format(new Date(cache.cachedAt))}
      </Text>
    </View>
  )
}

function SubscriptionExceptionPanel({
  onAction,
  presentation,
}: {
  onAction: () => void
  presentation: MobileSubscriptionExceptionPresentation
}) {
  const { fontScale } = useWindowDimensions()
  const colors = useColors()
  const accessibilityScale = Math.min(Math.max(fontScale, 1), 1.5)
  return (
    <View
      accessible
      accessibilityLabel={`${presentation.title}. ${presentation.description}`}
      className={cn(
        "gap-3 border-l-2 py-1 pl-4",
        presentation.tone === "warning" && "border-warn",
        presentation.tone === "destructive" && "border-destructive",
        presentation.tone === "neutral" && "border-foreground"
      )}
    >
      <View className="gap-1">
        <NativeText
          allowFontScaling={false}
          style={{
            color: colors.mutedForeground,
            fontSize: 10 * accessibilityScale,
            fontWeight: "900",
            letterSpacing: 1.4 * accessibilityScale,
            lineHeight: 14 * accessibilityScale,
            textTransform: "uppercase",
          }}
        >
          {presentation.eyebrow}
        </NativeText>
        <NativeText
          allowFontScaling={false}
          style={{
            color: colors.foreground,
            fontSize: 20 * accessibilityScale,
            fontWeight: "900",
            letterSpacing: -0.3 * accessibilityScale,
            lineHeight: 26 * accessibilityScale,
          }}
        >
          {presentation.title}
        </NativeText>
        <NativeText
          allowFontScaling={false}
          style={{
            color: colors.mutedForeground,
            fontSize: 14 * accessibilityScale,
            lineHeight: 20 * accessibilityScale,
          }}
        >
          {presentation.description}
        </NativeText>
      </View>
      <View className="self-start">
        <View style={{ width: 180 * accessibilityScale }}>
          <Button
            className="h-auto min-h-11 w-full px-5 py-3"
            onPress={onAction}
          >
            <NativeText
              allowFontScaling={false}
              style={{
                color: colors.primaryForeground,
                fontSize: 14 * accessibilityScale,
                fontWeight: "600",
                lineHeight: 20 * accessibilityScale,
              }}
            >
              {presentation.actionLabel}
            </NativeText>
          </Button>
        </View>
      </View>
    </View>
  )
}

function ProtectedCommercialContext({ denied }: { denied: boolean }) {
  const { fontScale } = useWindowDimensions()
  const colors = useColors()
  const accessibilityScale = Math.min(Math.max(fontScale, 1), 1.5)
  return (
    <View className="gap-3 pt-10">
      <View className="size-16 items-center justify-center rounded-full bg-muted">
        <Icon
          className="size-xl text-primary"
          name={denied ? "ShieldAlert" : "RefreshCw"}
        />
      </View>
      <NativeText
        allowFontScaling={false}
        style={{
          color: colors.foreground,
          fontSize: 20 * accessibilityScale,
          fontWeight: "900",
          letterSpacing: -0.3 * accessibilityScale,
          lineHeight: 26 * accessibilityScale,
        }}
      >
        {denied
          ? "Commercial details are protected"
          : "Current plan unavailable"}
      </NativeText>
      <NativeText
        allowFontScaling={false}
        style={{
          color: colors.mutedForeground,
          fontSize: 14 * accessibilityScale,
          lineHeight: 20 * accessibilityScale,
        }}
      >
        {denied
          ? "Your other cooperative tools are not affected by this permission boundary."
          : "This page stays unchanged until current tenant subscription data is available."}
      </NativeText>
    </View>
  )
}

function ReadOnlyPlanNotice() {
  return (
    <View className="flex-row items-center justify-between gap-3 border-b border-border pb-4">
      <View className="min-w-0 flex-1 gap-1">
        <Text className="text-sm font-extrabold text-foreground">
          Plan changes paused
        </Text>
        <Text className="text-xs leading-5 text-muted-foreground">
          Reconnect and refresh current details before requesting another plan.
        </Text>
      </View>
      <Icon className="size-base text-muted-foreground" name="LockKeyhole" />
    </View>
  )
}

function FlatNotice({
  description,
  title,
  tone,
}: {
  description: string
  title: string
  tone: "destructive" | "success" | "warning"
}) {
  const icon =
    tone === "success"
      ? "BadgeCheck"
      : tone === "warning"
        ? "TriangleAlert"
        : "CircleAlert"
  return (
    <View
      className={cn(
        "flex-row items-start gap-3 border-y px-1 py-4",
        tone === "success" && "border-success/30",
        tone === "warning" && "border-warn/30",
        tone === "destructive" && "border-destructive/30"
      )}
    >
      <Icon
        className={cn(
          "size-base mt-0.5",
          tone === "success" && "text-success",
          tone === "warning" && "text-warn",
          tone === "destructive" && "text-destructive"
        )}
        name={icon}
      />
      <View className="min-w-0 flex-1 gap-1">
        <Text className="text-sm font-extrabold text-foreground">{title}</Text>
        <Text
          className={cn(
            "text-sm leading-5",
            tone === "success" && "text-success",
            tone === "warning" && "text-warn",
            tone === "destructive" && "text-destructive"
          )}
        >
          {description}
        </Text>
      </View>
    </View>
  )
}

function CurrentPlanSection({
  snapshot,
}: {
  snapshot: MobileSubscriptionSnapshot
}) {
  const useStackedLayout = useLargeTextLayout()
  const statusPresentation = getSubscriptionStatusPresentation(snapshot.status)
  const warning = getSubscriptionWarning(snapshot)
  const presentation = getSubscriptionBrowsePresentation(snapshot)

  return (
    <View>
      <View className="bg-brand-surface gap-5 px-5 pt-2 pb-5">
        <View
          className={cn(
            "items-start gap-3",
            !useStackedLayout && "flex-row justify-between"
          )}
        >
          <View className="min-w-0 flex-1 gap-1">
            <Text className="text-brand-surface-foreground/75 text-[10px] font-black tracking-[1.4px] uppercase">
              Current plan
            </Text>
            <Text className="text-brand-surface-foreground text-[30px] leading-[34px] font-black tracking-tight">
              {presentation.currentPlan}
            </Text>
            <Text className="text-brand-surface-foreground text-sm font-extrabold">
              {presentation.currentPrice}
            </Text>
          </View>
          <View
            accessible
            accessibilityLabel={`Subscription status: ${statusPresentation.label}`}
            className="border-brand-surface-foreground/45 min-h-8 justify-center rounded-full border px-3 py-1.5"
          >
            <Text className="text-brand-surface-foreground text-xs font-extrabold">
              {statusPresentation.label}
            </Text>
          </View>
        </View>
        <View className="gap-2">
          <View
            className={cn(
              "gap-1",
              !useStackedLayout && "flex-row items-center justify-between gap-3"
            )}
          >
            <Text className="text-brand-surface-foreground text-sm font-extrabold">
              {presentation.activeMembers}
            </Text>
            <Text className="text-brand-surface-foreground/80 text-sm font-bold">
              {presentation.remainingMembers}
            </Text>
          </View>
          <View
            accessible
            accessibilityLabel={`${presentation.activeMembers}. ${presentation.remainingMembers}.`}
            accessibilityRole="progressbar"
            accessibilityValue={{
              max: 100,
              min: 0,
              now: Math.round(presentation.usagePercent),
            }}
            className="bg-brand-surface-foreground/20 h-1.5 overflow-hidden rounded-full"
          >
            <View
              className={cn(
                "h-full rounded-full",
                presentation.isAtCapacity ? "bg-destructive" : "bg-brand-warm"
              )}
              style={{ width: `${presentation.usagePercent}%` }}
            />
          </View>
        </View>
      </View>
      <View
        className={cn(
          "border-b border-border bg-background px-5",
          !useStackedLayout && "flex-row"
        )}
      >
        {presentation.metrics.map((metric, index) => (
          <View
            className={cn(
              "gap-1 py-3",
              useStackedLayout
                ? index < presentation.metrics.length - 1 &&
                    "border-b border-border"
                : "flex-1",
              !useStackedLayout && index > 0 && "border-l border-border pl-3",
              !useStackedLayout &&
                index < presentation.metrics.length - 1 &&
                "pr-3"
            )}
            key={metric.label}
          >
            <Text className="text-[10px] font-black tracking-[1.2px] text-muted-foreground uppercase">
              {metric.label}
            </Text>
            <Text className="text-sm font-black text-foreground">
              {metric.value}
            </Text>
          </View>
        ))}
      </View>
      {warning ? (
        <View className="px-5 pt-4">
          <FlatNotice
            description={
              snapshot.billingPeriod.graceEndsAt
                ? `${warning} Grace ends ${formatDate(snapshot.billingPeriod.graceEndsAt)}.`
                : warning
            }
            title="Plan attention"
            tone="warning"
          />
        </View>
      ) : null}
      {snapshot.sourceState.fallbackApplied ? (
        <View className="px-5 pt-4">
          <FlatNotice
            description="Plan changes are paused until billing reconnects."
            title="Billing unavailable"
            tone="warning"
          />
        </View>
      ) : null}
    </View>
  )
}

function PlanRow({
  current,
  onPress,
  plan,
}: {
  current: boolean
  onPress: () => void
  plan: MobileSubscriptionPlan
}) {
  const useStackedLayout = useLargeTextLayout()
  const presentation = presentSubscriptionPlanRow(plan)

  if (useStackedLayout) {
    return (
      <Pressable
        accessibilityLabel={`${plan.displayName} plan, ${formatPrice(plan)}, ${formatPlanCapacity(plan)}`}
        accessibilityRole="button"
        accessibilityState={{ selected: current }}
        className="min-h-16 gap-1 border-b border-border py-4 last:border-b-0"
        haptic
        onPress={onPress}
        transition
      >
        <View className="flex-row items-start justify-between gap-3">
          <Text className="min-w-0 flex-1 text-base font-extrabold text-foreground">
            {plan.displayName}
          </Text>
          <Icon
            className="size-sm shrink-0 text-muted-foreground"
            name="ChevronRight"
          />
        </View>
        <Text className="text-xs text-muted-foreground">
          {presentation.capacity}
        </Text>
        {current ? (
          <View className="self-start pt-1">
            <StatusBadge label="Current" tone="success" />
          </View>
        ) : (
          <Text className="pt-1 text-sm font-extrabold text-foreground">
            {presentation.price}
          </Text>
        )}
      </Pressable>
    )
  }

  return (
    <Pressable
      accessibilityLabel={`${plan.displayName} plan, ${formatPrice(plan)}, ${formatPlanCapacity(plan)}`}
      accessibilityRole="button"
      accessibilityState={{ selected: current }}
      className="min-h-16 flex-row items-center gap-3 border-b border-border py-3 last:border-b-0"
      haptic
      onPress={onPress}
      transition
    >
      <View className="min-w-0 flex-1 gap-1">
        <Text className="text-base font-extrabold text-foreground">
          {plan.displayName}
        </Text>
        <Text className="text-xs text-muted-foreground">
          {presentation.capacity}
        </Text>
      </View>
      <View className="max-w-[36%] items-end">
        {current ? (
          <StatusBadge label="Current" tone="success" />
        ) : (
          <Text
            adjustsFontSizeToFit
            className="text-right text-xs font-extrabold text-foreground"
            minimumFontScale={0.75}
            numberOfLines={2}
          >
            {presentation.price}
          </Text>
        )}
      </View>
      <Icon className="size-sm text-muted-foreground" name="ChevronRight" />
    </Pressable>
  )
}

function PlansSection({
  onSelectPlan,
  snapshot,
}: {
  onSelectPlan: (plan: MobileSubscriptionPlan) => void
  snapshot: MobileSubscriptionSnapshot
}) {
  return (
    <View className="gap-2 border-b border-border pb-6">
      <Text className="text-xl font-black tracking-tight text-foreground">
        Choose a plan
      </Text>
      <View>
        {snapshot.availablePlans.map((plan) => (
          <PlanRow
            current={plan.code === snapshot.plan.code}
            key={plan.code}
            onPress={() => onSelectPlan(plan)}
            plan={plan}
          />
        ))}
      </View>
    </View>
  )
}

function InvoiceRow({
  invoice,
  onPress,
}: {
  invoice: MobileSubscriptionSnapshot["invoices"][number]
  onPress: () => void
}) {
  const presentation = getSubscriptionStatusPresentation(invoice.status)
  const useStackedLayout = useLargeTextLayout()

  if (useStackedLayout) {
    return (
      <Pressable
        accessibilityLabel={`Open ${invoice.invoiceNumber ?? "subscription invoice"} details`}
        accessibilityRole="button"
        className="min-h-16 gap-1 border-b border-border py-4 last:border-b-0"
        haptic
        onPress={onPress}
        transition
      >
        <View className="flex-row items-start justify-between gap-3">
          <Text className="min-w-0 flex-1 text-sm font-extrabold text-foreground">
            {invoice.invoiceNumber ?? "Subscription invoice"}
          </Text>
          <Icon
            className="size-sm shrink-0 text-muted-foreground"
            name="ChevronRight"
          />
        </View>
        <Text className="text-xs text-muted-foreground">
          Due {formatDate(invoice.dueAt)}
        </Text>
        <Text className="pt-1 text-sm font-bold text-foreground">
          {formatMoney(invoice.totalAmount, invoice.currencyCode)}
        </Text>
        <View className="self-start pt-1">
          <StatusBadge label={presentation.label} tone={presentation.tone} />
        </View>
      </Pressable>
    )
  }

  return (
    <Pressable
      accessibilityLabel={`Open ${invoice.invoiceNumber ?? "subscription invoice"} details`}
      accessibilityRole="button"
      className="min-h-16 flex-row items-center gap-3 border-b border-border py-3 last:border-b-0"
      haptic
      onPress={onPress}
      transition
    >
      <View className="min-w-0 flex-1 gap-1">
        <Text className="text-sm font-extrabold text-foreground">
          {invoice.invoiceNumber ?? "Subscription invoice"}
        </Text>
        <Text className="text-xs text-muted-foreground">
          Due {formatDate(invoice.dueAt)}
        </Text>
      </View>
      <View className="items-end gap-1">
        <Text className="text-sm font-bold text-foreground">
          {formatMoney(invoice.totalAmount, invoice.currencyCode)}
        </Text>
        <StatusBadge label={presentation.label} tone={presentation.tone} />
      </View>
      <Icon className="size-sm text-muted-foreground" name="ChevronRight" />
    </Pressable>
  )
}

function InvoicesSection({
  invoices,
  onSelectInvoice,
}: {
  invoices: MobileSubscriptionSnapshot["invoices"]
  onSelectInvoice: (
    invoice: MobileSubscriptionSnapshot["invoices"][number]
  ) => void
}) {
  return (
    <View className="gap-2 pb-4">
      <Text className="text-xl font-black tracking-tight text-foreground">
        Invoices
      </Text>
      {invoices.length > 0 ? (
        <View>
          {invoices.map((invoice) => (
            <InvoiceRow
              invoice={invoice}
              key={invoice.id}
              onPress={() => onSelectInvoice(invoice)}
            />
          ))}
        </View>
      ) : (
        <Text className="text-sm text-muted-foreground">No invoices.</Text>
      )}
    </View>
  )
}

function InvoiceDetailSheet({
  invoice,
  onClose,
  onOpenInvoice,
}: {
  invoice: MobileSubscriptionSnapshot["invoices"][number] | null
  onClose: () => void
  onOpenInvoice: () => void
}) {
  const useStackedLayout = useLargeTextLayout()
  if (!invoice) return null
  const presentation = getSubscriptionStatusPresentation(invoice.status)
  const balanceDue = Math.max(invoice.totalAmount - invoice.amountPaid, 0)
  const canOpenHostedInvoice = Boolean(invoice.hostedInvoiceUrl)

  return (
    <FloatingBottomSheet
      accessibilityLabel={`${invoice.invoiceNumber ?? "Subscription invoice"} details`}
      footer={
        <View className="px-5 pt-3 pb-5">
          <Button
            onPress={canOpenHostedInvoice ? onOpenInvoice : onClose}
            size="lg"
            variant={canOpenHostedInvoice ? "default" : "outline"}
          >
            {canOpenHostedInvoice ? (
              <Icon
                className="size-base text-primary-foreground"
                name="ExternalLink"
              />
            ) : null}
            <Text>{canOpenHostedInvoice ? "Open invoice" : "Done"}</Text>
          </Button>
        </View>
      }
      onClose={onClose}
      presentation="compact"
      scrollable="auto"
      title={invoice.invoiceNumber ?? "Subscription invoice"}
      visible
    >
      <View className="px-5 pb-4">
        <View
          className={cn(
            "items-start gap-3 border-b border-border pb-4",
            !useStackedLayout && "flex-row justify-between"
          )}
        >
          <View className="min-w-0 flex-1 gap-1">
            <Text className="text-sm text-muted-foreground">
              Subscription billing
            </Text>
          </View>
          <StatusBadge label={presentation.label} tone={presentation.tone} />
        </View>
        <View className="py-2">
          <PlanDetailRow
            label="Invoice total"
            value={formatMoney(invoice.totalAmount, invoice.currencyCode)}
          />
          <PlanDetailRow
            label="Amount paid"
            value={formatMoney(invoice.amountPaid, invoice.currencyCode)}
          />
          <PlanDetailRow
            label="Balance due"
            value={formatMoney(balanceDue, invoice.currencyCode)}
          />
          <PlanDetailRow label="Due date" value={formatDate(invoice.dueAt)} />
          <PlanDetailRow label="Paid date" value={formatDate(invoice.paidAt)} />
        </View>
        {!canOpenHostedInvoice ? (
          <View className="border-y border-border py-3">
            <Text className="text-xs leading-5 text-muted-foreground">
              Invoice document unavailable. Contact billing support if needed.
            </Text>
          </View>
        ) : null}
      </View>
    </FloatingBottomSheet>
  )
}

function PlanDetailSheet({
  currentPlanCode,
  isOnline,
  isReadOnly,
  onClose,
  onDismissed,
  onRequestReview,
  plan,
  visible,
}: {
  currentPlanCode: MobileSubscriptionPlan["code"]
  isOnline: boolean
  isReadOnly: boolean
  onClose: () => void
  onDismissed: () => void
  onRequestReview: () => void
  plan: MobileSubscriptionPlan | null
  visible: boolean
}) {
  const { height } = useWindowDimensions()
  const useStackedLayout = useLargeTextLayout()
  if (!plan) return null
  const current = plan.code === currentPlanCode
  const actionLabel = getPlanActionLabel({
    currentPlanCode,
    isOnline,
    planCode: plan.code,
  })
  const canRequest = !current && !isReadOnly

  return (
    <FloatingBottomSheet
      accessibilityLabel={`${plan.displayName} plan details`}
      onClose={onClose}
      onDismissed={onDismissed}
      maxDynamicContentSize={Math.min(560, height * 0.64)}
      presentation="large"
      scrollable="auto"
      title={`${plan.displayName} plan`}
      visible={visible}
    >
      <View className="px-5 pb-4">
        {current ? (
          <View className="items-start border-b border-border pb-3">
            <StatusBadge label="Current" tone="success" />
          </View>
        ) : null}
        <View className="py-2">
          <PlanDetailRow label="Subscription" value={formatPrice(plan)} />
          <PlanDetailRow label="Setup" value={formatSetupFeeValue(plan)} />
          <PlanDetailRow label="Capacity" value={formatPlanCapacity(plan)} />
          {getSubscriptionPlanHighlights(plan).map((highlight) => (
            <PlanDetailRow
              key={highlight.label}
              label={highlight.label}
              value={highlight.value}
            />
          ))}
          {plan.addonDefinitions.length > 0 ? (
            <PlanDetailRow label="Add-ons" value="Quoted separately" />
          ) : null}
          {plan.passThroughCostDefinitions.length > 0 ? (
            <PlanDetailRow label="Provider charges" value="Usage based" />
          ) : null}
        </View>
        {!canRequest && !current ? (
          <Text className="text-warn pb-2 text-sm font-semibold">
            {actionLabel}. Refresh and reconnect to continue.
          </Text>
        ) : null}
        <View
          className={cn(
            "gap-2 border-t border-border pt-3",
            !useStackedLayout && canRequest && "flex-row"
          )}
        >
          {canRequest ? (
            <>
              <Button
                className={cn(!useStackedLayout && "flex-1")}
                onPress={onClose}
                size="lg"
                variant="outline"
              >
                <Text>Close</Text>
              </Button>
              <Button
                className={cn(!useStackedLayout && "flex-1")}
                onPress={onRequestReview}
                size="lg"
              >
                <Icon
                  className="size-base text-primary-foreground"
                  name="Send"
                />
                <Text>Review request</Text>
              </Button>
            </>
          ) : (
            <Button onPress={onClose} size="lg" variant="outline">
              <Text>Done</Text>
            </Button>
          )}
        </View>
      </View>
    </FloatingBottomSheet>
  )
}

function SubscriptionContent({
  exception,
  intent,
  isReadOnly,
  isRefreshing,
  onExceptionAction,
  onRefresh,
  onSelectInvoice,
  onSelectPlan,
  primaryColor,
  snapshot,
}: {
  exception: MobileSubscriptionExceptionPresentation | null
  intent: MobilePlanChangeIntent | null
  isReadOnly: boolean
  isRefreshing: boolean
  onExceptionAction: () => void
  onRefresh: () => void
  onSelectInvoice: (
    invoice: MobileSubscriptionSnapshot["invoices"][number]
  ) => void
  onSelectPlan: (plan: MobileSubscriptionPlan) => void
  primaryColor: string
  snapshot: MobileSubscriptionSnapshot | null
}) {
  const showVerifiedReadState = Boolean(
    snapshot?.cache && (isReadOnly || snapshot.cache.status === "stale")
  )
  return (
    <ScrollView
      contentContainerClassName="pb-10"
      refreshControl={
        <RefreshControl
          onRefresh={onRefresh}
          refreshing={isRefreshing}
          tintColor={primaryColor}
        />
      }
      removeClippedSubviews
      showsVerticalScrollIndicator={false}
      testID="subscription-scroll"
    >
      {snapshot ? (
        <>
          <CurrentPlanSection snapshot={snapshot} />
          {exception || intent || isReadOnly || showVerifiedReadState ? (
            <View className="gap-4 px-5 pt-4">
              {exception ? (
                <SubscriptionExceptionPanel
                  onAction={onExceptionAction}
                  presentation={exception}
                />
              ) : null}
              {showVerifiedReadState ? (
                <VerifiedReadState
                  cache={snapshot.cache}
                  readOnly={isReadOnly}
                />
              ) : null}
              {intent ? (
                <FlatNotice
                  description={getSubscriptionRecordedMessage(snapshot, intent)}
                  title="Plan request recorded"
                  tone="success"
                />
              ) : null}
              {isReadOnly ? <ReadOnlyPlanNotice /> : null}
            </View>
          ) : null}
          <View className="px-5 pt-6">
            <PlansSection onSelectPlan={onSelectPlan} snapshot={snapshot} />
          </View>
          <View className="px-5 pt-6">
            <InvoicesSection
              invoices={snapshot.invoices}
              onSelectInvoice={onSelectInvoice}
            />
          </View>
        </>
      ) : exception ? (
        <View className="gap-5 px-5 pt-4">
          <SubscriptionExceptionPanel
            onAction={onExceptionAction}
            presentation={exception}
          />
          <ProtectedCommercialContext denied={exception.kind === "denied"} />
        </View>
      ) : null}
    </ScrollView>
  )
}

export function SubscriptionScreen({
  canManage,
  error,
  intent,
  isLoading,
  isOnline,
  isRefreshing,
  isSubmitting,
  onBack,
  onOpenHostedInvoice,
  onRefresh,
  onRequestPlanChange,
  onRetry,
  snapshot,
}: {
  canManage: boolean
  error: string | null
  intent: MobilePlanChangeIntent | null
  isLoading: boolean
  isOnline: boolean
  isRefreshing: boolean
  isSubmitting: boolean
  onBack: () => void
  onOpenHostedInvoice: (url: string) => Promise<void>
  onRefresh: () => void
  onRequestPlanChange: (plan: MobileSubscriptionPlan) => Promise<boolean>
  onRetry: () => void
  snapshot: MobileSubscriptionSnapshot | null
}) {
  const colors = useColors()
  const showReviewAfterDetailRef = useRef(false)
  const [detailPlan, setDetailPlan] = useState<MobileSubscriptionPlan | null>(
    null
  )
  const [detailPlanVisible, setDetailPlanVisible] = useState(false)
  const [detailInvoice, setDetailInvoice] = useState<
    MobileSubscriptionSnapshot["invoices"][number] | null
  >(null)
  const [reviewPlan, setReviewPlan] = useState<MobileSubscriptionPlan | null>(
    null
  )
  const [reviewVisible, setReviewVisible] = useState(false)
  const visibleSnapshot = canManage ? snapshot : null
  const isReadOnly = isSubscriptionReadOnly({
    cacheStatus: visibleSnapshot?.cache?.status,
    isOnline,
  })
  const exception = getSubscriptionExceptionPresentation({
    canManage,
    error,
    hasSnapshot: visibleSnapshot !== null,
    isOnline,
    isStale: visibleSnapshot?.cache?.status === "stale",
  })

  useEffect(() => {
    if (canManage) return
    showReviewAfterDetailRef.current = false
    setDetailPlanVisible(false)
    setDetailPlan(null)
    setDetailInvoice(null)
    setReviewPlan(null)
    setReviewVisible(false)
  }, [canManage])

  function requestPlanReview() {
    if (!detailPlan || isReadOnly) return
    setReviewPlan(detailPlan)
    showReviewAfterDetailRef.current = true
    setDetailPlanVisible(false)
  }

  function detailDismissed() {
    setDetailPlan(null)
    if (showReviewAfterDetailRef.current) {
      showReviewAfterDetailRef.current = false
      setReviewVisible(true)
    }
  }

  function closePlanDetail() {
    showReviewAfterDetailRef.current = false
    setDetailPlanVisible(false)
  }

  function selectPlan(plan: MobileSubscriptionPlan) {
    setDetailPlan(plan)
    setDetailPlanVisible(true)
  }

  async function confirmPlanChange() {
    if (!reviewPlan || isSubmitting) return
    if (await onRequestPlanChange(reviewPlan)) {
      setReviewVisible(false)
      setReviewPlan(null)
    }
  }

  async function openHostedInvoice() {
    if (!detailInvoice?.hostedInvoiceUrl) return
    await onOpenHostedInvoice(detailInvoice.hostedInvoiceUrl)
  }

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <ScreenStatusBar tone="brand" />
      <SubscriptionHeader onBack={onBack} />
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <SubscriptionContent
          exception={exception}
          intent={intent}
          isReadOnly={isReadOnly}
          isRefreshing={isRefreshing}
          onExceptionAction={exception?.kind === "denied" ? onBack : onRetry}
          onRefresh={onRefresh}
          onSelectInvoice={setDetailInvoice}
          onSelectPlan={selectPlan}
          primaryColor={colors.primary}
          snapshot={visibleSnapshot}
        />
      )}
      <PlanDetailSheet
        currentPlanCode={visibleSnapshot?.plan.code ?? "free_beta"}
        isOnline={isOnline}
        isReadOnly={isReadOnly}
        onClose={closePlanDetail}
        onDismissed={detailDismissed}
        onRequestReview={requestPlanReview}
        plan={detailPlan}
        visible={detailPlanVisible}
      />
      <InvoiceDetailSheet
        invoice={detailInvoice}
        onClose={() => setDetailInvoice(null)}
        onOpenInvoice={() => void openHostedInvoice()}
      />
      {reviewPlan ? (
        <SubmissionReviewSheet
          cancelLabel="Back"
          confirmLabel="Record request"
          isSubmitting={isSubmitting}
          onClose={() => {
            setReviewVisible(false)
            setReviewPlan(null)
          }}
          onConfirm={() => void confirmPlanChange()}
          rows={[
            {
              className: "min-h-12 py-2.5",
              label: "Current plan",
              showIcon: false,
              value: visibleSnapshot?.plan.displayName,
            },
            {
              className: "min-h-12 py-2.5",
              label: "Requested plan",
              showIcon: false,
              value: reviewPlan.displayName,
            },
            {
              className: "min-h-12 py-2.5",
              label: "Monthly",
              showIcon: false,
              value: formatPrice(reviewPlan),
            },
            {
              className: "min-h-12 py-2.5",
              label: "Setup",
              showIcon: false,
              value: formatCompactSetupFeeValue(reviewPlan),
            },
            {
              className: "min-h-12 py-2.5",
              label: "Capacity",
              showIcon: false,
              value: formatPlanCapacity(reviewPlan),
            },
          ]}
          title="Confirm plan request"
          visible={reviewVisible}
        />
      ) : null}
    </SafeArea>
  )
}
