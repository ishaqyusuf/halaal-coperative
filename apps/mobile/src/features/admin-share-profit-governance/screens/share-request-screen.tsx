import { EmptyState } from "@/components/app/empty-state"
import { Button } from "@/components/ui/button"
import { TintedAvatar } from "@/components/ui/list-card"
import { SectionHeader } from "@/components/ui/section-header"
import { DetailSkeleton } from "@/components/ui/skeleton"
import { StatusBanner } from "@/components/ui/status-banner"
import { StatusPill } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import { useAppQuery } from "@/hooks/use-app-query"
import { useAuthContext } from "@/hooks/use-auth"
import { useColors } from "@/hooks/use-color"
import { formatMoney } from "@/lib/money"
import { useIsOnline } from "@/lib/online-status"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { useState } from "react"
import { View } from "react-native"
import {
  getShareApplicationDetail,
  getShareProfitSummary,
} from "../api/admin-share-profit-governance-api"
import { ShareReviewSheet } from "../components/share-profit-flows"
import { Card, KV, LedgerDetail, LifecycleStepper } from "../components/share-profit-ui"
import {
  SHARE_LIFECYCLE,
  shareProfitStatus,
  shareStage,
} from "../model/share-profit-presentation"
import {
  shareProfitKeys,
  usePullRefresh,
  useRefreshShareProfit,
} from "../model/share-profit-queries"

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", timeZone: "UTC", year: "numeric" })
}

/** T22 screen 2 (03 Lifecycle ledger): one share request, its member position and decision. */
export function ShareRequestScreen({ shareId }: { shareId: string }) {
  const { profile } = useAuthContext()
  const online = useIsOnline()
  const colors = useColors()
  const refresh = useRefreshShareProfit()
  const enabled = canUseMobileFeatureData(profile, "admin")
  const keys = shareProfitKeys()
  const [reviewing, setReviewing] = useState(false)
  const summary = useAppQuery({ enabled, networkMode: "always", queryFn: getShareProfitSummary, queryKey: keys.summary })
  const query = useAppQuery({
    enabled,
    networkMode: "always",
    queryFn: () => getShareApplicationDetail(shareId),
    queryKey: keys.share(shareId),
  })
  const pull = usePullRefresh(() => query.refetch())
  const detail = query.data
  const currencyCode = summary.data?.currencyCode ?? "NGN"
  const offline = !online
  const blocked = offline || isMobileReadCacheStale(detail?.cache)

  if (!detail) {
    return (
      <LedgerDetail onRefresh={enabled ? pull.onRefresh : undefined} refreshing={pull.refreshing} title="Share request">
        {query.isError ? (
          <EmptyState
            action={{ label: "Try again", onPress: () => void query.refetch() }}
            description="Nothing was changed. Try again when you’re online."
            icon="CircleAlert"
            title="Couldn’t load this record"
            tone="error"
          />
        ) : (
          <DetailSkeleton rows={5} />
        )}
      </LedgerDetail>
    )
  }

  const { application, policy, position, postedLedger } = detail
  const unit = application.unitAmountSnapshot || policy.unitAmount
  const status = shareProfitStatus(application.status)
  const pending = application.status === "pending"
  const canReview = application.allowedActions.includes("review")
  const compulsory = position?.compulsoryUnits ?? policy.compulsoryShareUnits
  const approved = position?.approvedOptionalUnits ?? 0
  const requested = pending ? application.requestedUnits : 0
  const free = Math.max(0, policy.maximumShareUnits - compulsory - approved - requested)
  const segments = [
    { color: colors.primary, units: compulsory },
    { color: colors.brandWarm, units: approved },
    { color: colors.tintSky, units: requested },
    { color: colors.surfaceRaised, units: free },
  ]
  const holding = compulsory + approved
  const shownUnits =
    application.status === "approved" && application.approvedUnits
      ? application.approvedUnits
      : application.requestedUnits
  const steps = SHARE_LIFECYCLE.map((label) =>
    application.status === "rejected" ? ({ Approved: "Rejected", Posted: "Closed" } as Record<string, string>)[label] ?? label : label
  )

  return (
    <>
      <LedgerDetail
        footer={
          pending && canReview ? (
            <Button disabled={blocked} onPress={() => setReviewing(true)} testID="share-request-review">
              <Text>Review request</Text>
            </Button>
          ) : undefined
        }
        onRefresh={online ? pull.onRefresh : undefined}
        refreshing={pull.refreshing}
        testID="share-request-screen"
        title="Share request"
      >
        <Card>
          <View className="flex-row items-center gap-[12px]">
            <TintedAvatar name={application.memberName} />
            <View className="min-w-0 flex-1">
              <Text className="font-bold" numberOfLines={1} variant="body">
                {application.memberName}
              </Text>
              <Text className="text-muted-foreground" variant="small">
                {application.memberNumber} · Requested {formatDay(application.createdAt)}
              </Text>
            </View>
            <StatusPill label={status.label} tone={status.tone} />
          </View>
          <View>
            <Text variant="hero">{formatMoney(shownUnits * unit, { currencyCode })}</Text>
            <Text className="text-muted-foreground" variant="small">
              {shownUnits} units × {formatMoney(unit, { currencyCode })}
              {shownUnits !== application.requestedUnits ? ` · ${application.requestedUnits} requested` : ""}
            </Text>
          </View>
          <LifecycleStepper labels={steps} stage={shareStage(application.status)} />
        </Card>
        {pending && !canReview ? (
          <StatusBanner description="Your role can view share requests but not decide them." kind="info" title="View only" />
        ) : null}
        {pending && offline ? (
          <StatusBanner description="Reconnect to review this request." kind="offline" title="Offline" />
        ) : null}
        <SectionHeader title="Member position" value={`${policy.maximumShareUnits} unit cap`} />
        <Card>
          <View
            accessibilityLabel={`Compulsory ${compulsory}, approved ${approved}${pending ? `, this request ${requested}` : ""} of ${policy.maximumShareUnits} units`}
            accessibilityRole="image"
            className="h-[10px] flex-row overflow-hidden rounded-full"
          >
            {segments.map((segment, index) =>
              segment.units > 0 ? (
                <View key={index} style={{ backgroundColor: segment.color, flex: segment.units, height: 10 }} />
              ) : null
            )}
          </View>
          <View className="flex-row flex-wrap gap-x-[14px] gap-y-[4px]">
            <Text className="text-muted-foreground" variant="caption">
              Compulsory {compulsory}
            </Text>
            <Text className="text-muted-foreground" variant="caption">
              Approved {approved}
            </Text>
            {pending ? (
              <Text className="text-muted-foreground" variant="caption">
                This request {requested}
              </Text>
            ) : null}
          </View>
          {pending ? (
            <>
              <KV label="After approval" value={`${holding + requested} of ${policy.maximumShareUnits} units`} />
              <KV label="Holding value after" value={formatMoney((holding + requested) * unit, { currencyCode })} />
            </>
          ) : (
            <>
              <KV label="Holding now" value={`${holding} of ${policy.maximumShareUnits} units`} />
              <KV label="Holding value" value={formatMoney(holding * unit, { currencyCode })} />
            </>
          )}
        </Card>
        <SectionHeader title="Member’s note" />
        <Card>
          <Text className={application.notes ? "italic" : "text-muted-foreground"} variant="body">
            {application.notes ? `“${application.notes}”` : "No note added."}
          </Text>
        </Card>
        {!pending ? (
          <>
            <SectionHeader title="Decision" />
            <Card>
              {application.status === "approved" ? (
                <KV label="Approved units" value={`${application.approvedUnits ?? 0} of ${application.requestedUnits}`} />
              ) : null}
              {application.status === "approved" && application.paidAmount != null ? (
                <>
                  <KV label="Paid" value={formatMoney(application.paidAmount, { currencyCode })} />
                  <KV
                    label="Balance to pay"
                    value={formatMoney(
                      Math.max(0, (application.approvedUnits ?? 0) * application.unitAmountSnapshot - application.paidAmount),
                      { currencyCode }
                    )}
                  />
                </>
              ) : postedLedger ? (
                <KV
                  label="Posted to share capital"
                  value={`${formatMoney(postedLedger.amount, { currencyCode })} · ${formatDay(postedLedger.effectiveDate)}`}
                />
              ) : null}
              {application.reviewedAt ? <KV label="Reviewed" value={formatDay(application.reviewedAt)} /> : null}
              {application.reviewNotes ? (
                <View className="gap-[4px] border-t border-border pt-[10px]">
                  <Text className="text-muted-foreground" variant="label">
                    Evidence
                  </Text>
                  <Text variant="body">{application.reviewNotes}</Text>
                </View>
              ) : null}
            </Card>
          </>
        ) : null}
      </LedgerDetail>
      {reviewing ? (
        <ShareReviewSheet
          blocked={blocked}
          currencyCode={currencyCode}
          detail={detail}
          onClose={() => setReviewing(false)}
          onDone={() => void refresh({ book: "shares", shareId })}
        />
      ) : null}
    </>
  )
}
