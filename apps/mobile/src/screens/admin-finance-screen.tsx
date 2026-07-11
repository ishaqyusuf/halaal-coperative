import { SectionCard } from "@/components/app/section-card"
import { StatCard } from "@/components/app/stat-card"
import { LoadingSpinner } from "@/components/loading-spinner"
import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import { adminExceptions, adminStats } from "@/data/mobile-template"
import { useAuthContext } from "@/hooks/use-auth"
import { useColors } from "@/hooks/use-color"
import {
  getMobileAdminFinance,
  recordMobileAdminCollectionFollowUp,
  reviewMobileAdminFinancingRequest,
  reviewMobileAdminFoodPurchaseApplication,
  reviewMobileAdminProcurementRequest,
  reviewMobileAdminProjectFinancingRequest,
  reviewMobileAdminReceipt,
  type MobileAdminCollectionFollowUp,
  type MobileAdminFinance,
  type MobileAdminFinanceRecentItem,
} from "@/lib/mobile-home-api"
import { formatMobileMetricValue } from "@/lib/mobile-metrics"
import { isMockSessionToken } from "@/lib/session-store"
import { useEffect, useMemo, useState } from "react"
import { ScrollView, View } from "react-native"

type ReceiptReviewDecision =
  | "under_review"
  | "correction_requested"
  | "approved"
  | "rejected"

function formatCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en", {
    currency: currencyCode,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value))
}

function formatStatus(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function queueIcon(queueKey: MobileAdminFinanceRecentItem["queueKey"]) {
  if (queueKey === "financing") return "HandCoins"
  if (queueKey === "procurement") return "PackageSearch"
  if (queueKey === "projectFinancing") return "BriefcaseBusiness"
  if (queueKey === "receipts") return "ReceiptText"
  if (queueKey === "shares") return "PieChart"
  return "ShoppingBasket"
}

function FinanceRecentItemCard({
  actionState,
  currencyCode,
  isFirst,
  item,
  onMarkReviewing,
  onOpenReceiptReview,
  onReviewReceipt,
  receiptReviewItemId,
  receiptReviewNotes,
  setReceiptReviewNotes,
}: {
  actionState: "idle" | "pending"
  currencyCode: string
  isFirst: boolean
  item: MobileAdminFinanceRecentItem
  onMarkReviewing: (item: MobileAdminFinanceRecentItem) => void
  onOpenReceiptReview: (item: MobileAdminFinanceRecentItem | null) => void
  onReviewReceipt: (
    item: MobileAdminFinanceRecentItem,
    decision: ReceiptReviewDecision
  ) => void
  receiptReviewItemId: string | null
  receiptReviewNotes: string
  setReceiptReviewNotes: (value: string) => void
}) {
  const canMarkReviewing =
    item.status !== "under_review" && item.queueKey !== "shares"
  const isReceiptReviewing =
    item.queueKey === "receipts" && receiptReviewItemId === item.id
  const receiptNotesRequired = receiptReviewNotes.trim().length < 2

  return (
    <View className={isFirst ? "gap-3" : "gap-3 border-t border-border pt-3"}>
      <View className="flex-row items-start gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-md bg-secondary">
          <Icon
            name={queueIcon(item.queueKey)}
            className="size-sm text-accent"
          />
        </View>
        <View className="flex-1 gap-1">
          <View className="flex-row items-start justify-between gap-3">
            <Text className="flex-1 text-sm font-semibold text-foreground">
              {item.title}
            </Text>
            <Text className="text-sm font-semibold text-foreground">
              {formatCurrency(item.amount, currencyCode)}
            </Text>
          </View>
          <Text className="text-sm leading-5 text-muted-foreground">
            {item.subtitle}
          </Text>
          <Text className="text-xs font-medium text-muted-foreground">
            {formatStatus(item.status)} - {formatDate(item.requestedAt)}
          </Text>
          {isReceiptReviewing ? (
            <View className="gap-2 pt-2">
              <Textarea
                editable={actionState !== "pending"}
                onChangeText={setReceiptReviewNotes}
                placeholder="Review notes"
                value={receiptReviewNotes}
              />
              <View className="flex-row flex-wrap gap-2">
                <Button
                  className="h-9"
                  disabled={actionState === "pending"}
                  onPress={() => onReviewReceipt(item, "under_review")}
                  variant="outline"
                >
                  <Text>Under review</Text>
                </Button>
                <Button
                  className="h-9"
                  disabled={actionState === "pending" || receiptNotesRequired}
                  onPress={() => onReviewReceipt(item, "correction_requested")}
                  variant="outline"
                >
                  <Text>Correction</Text>
                </Button>
                <Button
                  className="h-9"
                  disabled={actionState === "pending"}
                  onPress={() => onReviewReceipt(item, "approved")}
                  variant="outline"
                >
                  <Text>Approve</Text>
                </Button>
                <Button
                  className="h-9"
                  disabled={actionState === "pending" || receiptNotesRequired}
                  onPress={() => onReviewReceipt(item, "rejected")}
                  variant="outline"
                >
                  <Text>Reject</Text>
                </Button>
                <Button
                  className="h-9"
                  disabled={actionState === "pending"}
                  onPress={() => onOpenReceiptReview(null)}
                  variant="ghost"
                >
                  <Text>Cancel</Text>
                </Button>
              </View>
            </View>
          ) : item.queueKey === "receipts" ? (
            <Button
              className="mt-2 self-start"
              disabled={actionState === "pending"}
              onPress={() => onOpenReceiptReview(item)}
              size="sm"
              variant="outline"
            >
              <Icon name="ClipboardCheck" className="size-sm" />
              <Text>Review receipt</Text>
            </Button>
          ) : canMarkReviewing ? (
            <Button
              className="mt-2 self-start"
              disabled={actionState === "pending"}
              onPress={() => onMarkReviewing(item)}
              size="sm"
              variant="outline"
            >
              <Text>
                {actionState === "pending" ? "Updating..." : "Mark reviewing"}
              </Text>
            </Button>
          ) : null}
        </View>
      </View>
    </View>
  )
}

function CollectionFollowUpCard({
  actionState,
  followUp,
  isFirst,
  onRecordReminder,
}: {
  actionState: "idle" | "pending"
  followUp: MobileAdminCollectionFollowUp
  isFirst: boolean
  onRecordReminder: (followUp: MobileAdminCollectionFollowUp) => void
}) {
  return (
    <View className={isFirst ? "gap-3" : "gap-3 border-t border-border pt-3"}>
      <View className="flex-row items-start gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-md bg-secondary">
          <Icon name="MessageSquareText" className="size-sm text-accent" />
        </View>
        <View className="flex-1 gap-1">
          <View className="flex-row items-start justify-between gap-3">
            <Text className="flex-1 text-sm font-semibold text-foreground">
              {followUp.memberName}
            </Text>
            <Text className="text-xs font-medium text-muted-foreground">
              {followUp.memberNumber}
            </Text>
          </View>
          <Text className="text-sm leading-5 text-muted-foreground">
            {followUp.loanProductName} - {followUp.note}
          </Text>
          <Text className="text-xs font-medium text-muted-foreground">
            {formatStatus(followUp.status)} - {formatStatus(followUp.priority)}
            {followUp.nextActionAt
              ? ` - Next ${formatDate(followUp.nextActionAt)}`
              : ""}
          </Text>
        </View>
      </View>
      <Button
        className="self-start"
        disabled={actionState === "pending"}
        onPress={() => onRecordReminder(followUp)}
        size="sm"
        variant="outline"
      >
        <Text>
          {actionState === "pending" ? "Saving..." : "Record reminder"}
        </Text>
      </Button>
    </View>
  )
}

export function AdminFinanceScreen() {
  const { profile } = useAuthContext()
  const colors = useColors()
  const [finance, setFinance] = useState<MobileAdminFinance | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [actionKey, setActionKey] = useState<string | null>(null)
  const [receiptReviewItemId, setReceiptReviewItemId] = useState<string | null>(
    null
  )
  const [receiptReviewNotes, setReceiptReviewNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const canUseServerFinance = Boolean(
    profile?.role === "admin" &&
    profile?.token &&
    !isMockSessionToken(profile.token)
  )
  const currencyCode = profile?.tenant.currencyCode ?? "NGN"
  const stats = useMemo(
    () =>
      finance?.stats.map((metric) => ({
        detail: metric.detail,
        label: metric.label,
        value: formatMobileMetricValue(metric, currencyCode),
      })) ?? adminStats,
    [currencyCode, finance?.stats]
  )
  const queues = useMemo(
    () =>
      finance?.queues.map((queue) => ({
        detail: queue.detail,
        label: queue.label,
        value: `${queue.count} waiting`,
      })) ?? adminExceptions,
    [finance?.queues]
  )

  useEffect(() => {
    let mounted = true

    if (!canUseServerFinance) {
      setFinance(null)
      setError(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    void getMobileAdminFinance()
      .then((response) => {
        if (mounted) {
          setFinance(response)
        }
      })
      .catch(() => {
        if (mounted) {
          setError("Finance queues are unavailable.")
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [canUseServerFinance, profile?.token])

  async function refreshFinance() {
    const response = await getMobileAdminFinance()
    setFinance(response)
  }

  async function markReviewing(item: MobileAdminFinanceRecentItem) {
    const nextActionKey = `${item.queueKey}-${item.id}`

    setActionKey(nextActionKey)
    setError(null)

    try {
      if (item.queueKey === "receipts") {
        await reviewMobileAdminReceipt({
          decision: "under_review",
          receiptId: item.id,
        })
      } else if (item.queueKey === "financing") {
        await reviewMobileAdminFinancingRequest({
          loanRequestId: item.id,
          status: "under_review",
        })
      } else if (item.queueKey === "procurement") {
        await reviewMobileAdminProcurementRequest({
          procurementRequestId: item.id,
          status: "under_review",
        })
      } else if (item.queueKey === "foodPurchase") {
        await reviewMobileAdminFoodPurchaseApplication({
          applicationId: item.id,
          status: "under_review",
        })
      } else if (item.queueKey === "projectFinancing") {
        await reviewMobileAdminProjectFinancingRequest({
          projectFinancingRequestId: item.id,
          status: "under_review",
        })
      }

      await refreshFinance()
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "The review action could not be completed."
      )
    } finally {
      setActionKey(null)
    }
  }

  async function reviewReceiptDecision(
    item: MobileAdminFinanceRecentItem,
    decision: ReceiptReviewDecision
  ) {
    const notes = receiptReviewNotes.trim()

    if (
      (decision === "correction_requested" || decision === "rejected") &&
      notes.length < 2
    ) {
      setError("Review notes are required for correction or rejection.")
      return
    }

    const nextActionKey = `${item.queueKey}-${item.id}`

    setActionKey(nextActionKey)
    setError(null)

    try {
      await reviewMobileAdminReceipt({
        decision,
        receiptId: item.id,
        reviewNotes: notes || undefined,
      })
      setReceiptReviewItemId(null)
      setReceiptReviewNotes("")
      await refreshFinance()
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "The receipt review action could not be completed."
      )
    } finally {
      setActionKey(null)
    }
  }

  async function recordReminder(followUp: MobileAdminCollectionFollowUp) {
    const nextActionKey = `follow-up-${followUp.id}`

    setActionKey(nextActionKey)
    setError(null)

    try {
      await recordMobileAdminCollectionFollowUp({
        caseStage: followUp.caseStage,
        note: `Mobile follow-up reminder recorded for ${followUp.memberName}.`,
        priority: "normal",
        repaymentScheduleItemId: followUp.repaymentScheduleItemId,
        resolutionStatus: followUp.resolutionStatus,
        status: "reminded",
      })
      await refreshFinance()
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "The follow-up note could not be recorded."
      )
    } finally {
      setActionKey(null)
    }
  }

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-5">
        <View className="gap-2">
          <Text className="text-3xl font-black text-foreground">Finance</Text>
          <Text className="text-base leading-6 text-muted-foreground">
            Review cooperative finance queues without weakening server-side
            approvals or posting rules.
          </Text>
        </View>

        {!canUseServerFinance ? (
          <SectionCard icon="Wallet" title="Finance queues">
            <Text className="text-sm leading-5 text-muted-foreground">
              Sign in with a production admin account to review finance queue
              summaries.
            </Text>
          </SectionCard>
        ) : null}

        {canUseServerFinance ? (
          <>
            <View className="flex-row flex-wrap gap-3">
              {stats.map((item) => (
                <StatCard key={item.label} {...item} />
              ))}
            </View>

            {error ? (
              <Text className="text-sm font-medium text-destructive">
                {error}
              </Text>
            ) : null}

            <SectionCard icon="CircleAlert" title="Review queues">
              {isLoading ? (
                <LoadingSpinner />
              ) : (
                <View className="gap-3">
                  {queues.length ? (
                    queues.map((queue) => (
                      <View
                        className="flex-row gap-3 rounded-md bg-secondary p-3"
                        key={queue.label}
                      >
                        <Icon
                          name="ArrowUpRight"
                          className="size-base text-accent"
                        />
                        <View className="flex-1 gap-1">
                          <Text className="font-semibold text-foreground">
                            {queue.label}
                          </Text>
                          <Text className="text-sm font-medium text-foreground">
                            {queue.value}
                          </Text>
                          <Text className="text-xs leading-5 text-muted-foreground">
                            {queue.detail}
                          </Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text className="text-sm leading-5 text-muted-foreground">
                      No finance queues need review right now.
                    </Text>
                  )}
                </View>
              )}
            </SectionCard>

            <SectionCard icon="ClipboardList" title="Recent requests">
              {isLoading ? (
                <LoadingSpinner />
              ) : finance?.recentItems.length ? (
                <View className="gap-3">
                  {finance.recentItems.map((item, index) => (
                    <FinanceRecentItemCard
                      actionState={
                        actionKey === `${item.queueKey}-${item.id}`
                          ? "pending"
                          : "idle"
                      }
                      currencyCode={currencyCode}
                      isFirst={index === 0}
                      item={item}
                      key={`${item.queueKey}-${item.id}`}
                      onMarkReviewing={markReviewing}
                      onOpenReceiptReview={(selectedItem) => {
                        setReceiptReviewItemId(selectedItem?.id ?? null)
                        setReceiptReviewNotes("")
                        setError(null)
                      }}
                      onReviewReceipt={reviewReceiptDecision}
                      receiptReviewItemId={receiptReviewItemId}
                      receiptReviewNotes={receiptReviewNotes}
                      setReceiptReviewNotes={setReceiptReviewNotes}
                    />
                  ))}
                </View>
              ) : (
                <Text className="text-sm leading-5 text-muted-foreground">
                  No pending finance requests are visible in the mobile queue.
                </Text>
              )}
            </SectionCard>

            <SectionCard icon="MessageSquareText" title="Collection follow-ups">
              {isLoading ? (
                <LoadingSpinner />
              ) : finance?.collectionFollowUps.length ? (
                <View className="gap-3">
                  {finance.collectionFollowUps.map((followUp, index) => (
                    <CollectionFollowUpCard
                      actionState={
                        actionKey === `follow-up-${followUp.id}`
                          ? "pending"
                          : "idle"
                      }
                      followUp={followUp}
                      isFirst={index === 0}
                      key={followUp.id}
                      onRecordReminder={recordReminder}
                    />
                  ))}
                </View>
              ) : (
                <Text className="text-sm leading-5 text-muted-foreground">
                  No open collection follow-ups are visible in the mobile queue.
                </Text>
              )}
            </SectionCard>
          </>
        ) : null}
      </ScrollView>
    </SafeArea>
  )
}
