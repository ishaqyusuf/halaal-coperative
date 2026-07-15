import { CachedReadBanner } from "@/components/app/cached-read-banner"
import { EmptyState } from "@/components/app/empty-state"
import { FormStateBanner } from "@/components/app/form-state-banner"
import { SectionCard } from "@/components/app/section-card"
import { StatCard } from "@/components/app/stat-card"
import { getStatusBadgeTone, StatusBadge } from "@/components/app/status-badge"
import { VirtualizedCardList } from "@/components/app/virtualized-card-list"
import { LoadingSpinner } from "@/components/loading-spinner"
import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import { adminExceptions, adminStats } from "@/data/mobile-template"
import { useAuthContext } from "@/hooks/use-auth"
import { useColors } from "@/hooks/use-color"
import { useMobileFormDraft } from "@/hooks/use-mobile-form-draft"
import {
  getMobileAdminFinance,
  recordMobileAdminCollectionFollowUp,
  reviewMobileAdminFinancingRequest,
  reviewMobileAdminFoodPurchaseApplication,
  reviewMobileAdminProcurementRequest,
  reviewMobileAdminProjectFinancingRequest,
  reviewMobileAdminReceipt,
  reviewMobileAdminShareApplication,
  type MobileAdminCollectionFollowUp,
  type MobileAdminCollectionFollowUpInput,
  type MobileAdminFinance,
  type MobileAdminFinanceRecentItem,
  type MobileAdminReviewStatus,
  type MobileProjectFinancingStructure,
} from "@/lib/mobile-home-api"
import { formatMobileMetricValue } from "@/lib/mobile-metrics"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { isMockSessionToken } from "@/lib/session-store"
import { useEffect, useMemo, useState } from "react"
import { ScrollView, View } from "react-native"

type ReceiptReviewDecision =
  | "under_review"
  | "correction_requested"
  | "approved"
  | "rejected"
type ShareReviewDecision = "approved" | "rejected"
type CollectionFollowUpStatus = MobileAdminCollectionFollowUpInput["status"]
type CollectionFollowUpPriority = NonNullable<
  MobileAdminCollectionFollowUpInput["priority"]
>

const collectionFollowUpStatuses: {
  label: string
  value: CollectionFollowUpStatus
}[] = [
  { label: "Reminded", value: "reminded" },
  { label: "Promise", value: "promise_to_pay" },
  { label: "Settled", value: "settled" },
  { label: "Unreachable", value: "unreachable" },
]

const collectionFollowUpPriorities: {
  label: string
  value: CollectionFollowUpPriority
}[] = [
  { label: "Normal", value: "normal" },
  { label: "High", value: "high" },
  { label: "Urgent", value: "urgent" },
  { label: "Low", value: "low" },
]

const projectFinancingStructures: {
  label: string
  value: MobileProjectFinancingStructure
}[] = [
  { label: "Undecided", value: "undecided" },
  { label: "Repayable", value: "repayable_facility" },
  { label: "Investment", value: "investment_partnership" },
  { label: "Profit share", value: "profit_sharing" },
]

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
  onOpenFoodPurchaseReview,
  onOpenFinancingReview,
  onOpenProjectFinancingReview,
  onOpenProcurementReview,
  onOpenReceiptReview,
  onOpenShareReview,
  onReviewFoodPurchase,
  onReviewFinancing,
  onReviewProjectFinancing,
  onReviewProcurement,
  onReviewReceipt,
  onReviewShare,
  foodPurchaseReviewItemId,
  foodPurchaseReviewNotes,
  financingReviewItemId,
  financingReviewNotes,
  projectFinancingApprovedAmount,
  projectFinancingApprovedPaybackMonths,
  projectFinancingApprovedStructure,
  projectFinancingReviewItemId,
  projectFinancingReviewNotes,
  procurementApprovedCost,
  procurementApprovedRepaymentMonths,
  procurementReviewItemId,
  procurementReviewNotes,
  receiptReviewItemId,
  receiptReviewNotes,
  shareReviewItemId,
  shareReviewNotes,
  setFoodPurchaseReviewNotes,
  setFinancingReviewNotes,
  setProjectFinancingApprovedAmount,
  setProjectFinancingApprovedPaybackMonths,
  setProjectFinancingApprovedStructure,
  setProjectFinancingReviewNotes,
  setProcurementApprovedCost,
  setProcurementApprovedRepaymentMonths,
  setProcurementReviewNotes,
  setReceiptReviewNotes,
  setShareReviewNotes,
}: {
  actionState: "idle" | "pending"
  currencyCode: string
  financingReviewItemId: string | null
  financingReviewNotes: string
  isFirst: boolean
  item: MobileAdminFinanceRecentItem
  onMarkReviewing: (item: MobileAdminFinanceRecentItem) => void
  onOpenFoodPurchaseReview: (item: MobileAdminFinanceRecentItem | null) => void
  onOpenFinancingReview: (item: MobileAdminFinanceRecentItem | null) => void
  onOpenProjectFinancingReview: (
    item: MobileAdminFinanceRecentItem | null
  ) => void
  onOpenProcurementReview: (item: MobileAdminFinanceRecentItem | null) => void
  onOpenReceiptReview: (item: MobileAdminFinanceRecentItem | null) => void
  onOpenShareReview: (item: MobileAdminFinanceRecentItem | null) => void
  onReviewFoodPurchase: (
    item: MobileAdminFinanceRecentItem,
    status: MobileAdminReviewStatus
  ) => void
  onReviewFinancing: (
    item: MobileAdminFinanceRecentItem,
    status: MobileAdminReviewStatus
  ) => void
  onReviewProjectFinancing: (
    item: MobileAdminFinanceRecentItem,
    status: MobileAdminReviewStatus
  ) => void
  onReviewProcurement: (
    item: MobileAdminFinanceRecentItem,
    status: MobileAdminReviewStatus
  ) => void
  onReviewReceipt: (
    item: MobileAdminFinanceRecentItem,
    decision: ReceiptReviewDecision
  ) => void
  onReviewShare: (
    item: MobileAdminFinanceRecentItem,
    decision: ShareReviewDecision
  ) => void
  foodPurchaseReviewItemId: string | null
  foodPurchaseReviewNotes: string
  projectFinancingApprovedAmount: string
  projectFinancingApprovedPaybackMonths: string
  projectFinancingApprovedStructure: MobileProjectFinancingStructure
  projectFinancingReviewItemId: string | null
  projectFinancingReviewNotes: string
  procurementApprovedCost: string
  procurementApprovedRepaymentMonths: string
  procurementReviewItemId: string | null
  procurementReviewNotes: string
  receiptReviewItemId: string | null
  receiptReviewNotes: string
  shareReviewItemId: string | null
  shareReviewNotes: string
  setFoodPurchaseReviewNotes: (value: string) => void
  setFinancingReviewNotes: (value: string) => void
  setProjectFinancingApprovedAmount: (value: string) => void
  setProjectFinancingApprovedPaybackMonths: (value: string) => void
  setProjectFinancingApprovedStructure: (
    value: MobileProjectFinancingStructure
  ) => void
  setProjectFinancingReviewNotes: (value: string) => void
  setProcurementApprovedCost: (value: string) => void
  setProcurementApprovedRepaymentMonths: (value: string) => void
  setProcurementReviewNotes: (value: string) => void
  setReceiptReviewNotes: (value: string) => void
  setShareReviewNotes: (value: string) => void
}) {
  const canMarkReviewing =
    item.status !== "under_review" &&
    item.queueKey !== "foodPurchase" &&
    item.queueKey !== "financing" &&
    item.queueKey !== "projectFinancing" &&
    item.queueKey !== "procurement" &&
    item.queueKey !== "shares"
  const isFoodPurchaseReviewing =
    item.queueKey === "foodPurchase" && foodPurchaseReviewItemId === item.id
  const isFinancingReviewing =
    item.queueKey === "financing" && financingReviewItemId === item.id
  const isProcurementReviewing =
    item.queueKey === "procurement" && procurementReviewItemId === item.id
  const isProjectFinancingReviewing =
    item.queueKey === "projectFinancing" &&
    projectFinancingReviewItemId === item.id
  const isReceiptReviewing =
    item.queueKey === "receipts" && receiptReviewItemId === item.id
  const isShareReviewing =
    item.queueKey === "shares" && shareReviewItemId === item.id
  const projectFinancingApprovedAmountValue = Number(
    projectFinancingApprovedAmount
  )
  const projectFinancingApprovedPaybackMonthsValue = Number(
    projectFinancingApprovedPaybackMonths
  )
  const procurementCostValue = Number(procurementApprovedCost)
  const procurementRepaymentMonthsValue = Number(
    procurementApprovedRepaymentMonths
  )
  const procurementNotesRequired = procurementReviewNotes.trim().length < 2
  const foodPurchaseNotesRequired = foodPurchaseReviewNotes.trim().length < 2
  const projectFinancingNotesRequired =
    projectFinancingReviewNotes.trim().length < 2
  const projectFinancingApprovalValuesMissing =
    !Number.isFinite(projectFinancingApprovedAmountValue) ||
    projectFinancingApprovedAmountValue <= 0 ||
    projectFinancingApprovedStructure === "undecided" ||
    (projectFinancingApprovedStructure === "repayable_facility" &&
      (!Number.isInteger(projectFinancingApprovedPaybackMonthsValue) ||
        projectFinancingApprovedPaybackMonthsValue <= 0))
  const procurementApprovalValuesMissing =
    !Number.isFinite(procurementCostValue) ||
    procurementCostValue <= 0 ||
    !Number.isInteger(procurementRepaymentMonthsValue) ||
    procurementRepaymentMonthsValue <= 0
  const receiptNotesRequired = receiptReviewNotes.trim().length < 2
  const shareNotesRequired = shareReviewNotes.trim().length < 2

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
          <View className="flex-row flex-wrap items-center gap-2">
            <StatusBadge
              label={formatStatus(item.status)}
              tone={getStatusBadgeTone(item.status)}
            />
            <Text className="text-xs font-medium text-muted-foreground">
              Requested {formatDate(item.requestedAt)}
            </Text>
          </View>
          {isFoodPurchaseReviewing ? (
            <View className="gap-2 pt-2">
              <Textarea
                editable={actionState !== "pending"}
                onChangeText={setFoodPurchaseReviewNotes}
                placeholder="Decision notes"
                value={foodPurchaseReviewNotes}
              />
              <View className="flex-row flex-wrap gap-2">
                <Button
                  className="h-9"
                  disabled={
                    actionState === "pending" || foodPurchaseNotesRequired
                  }
                  onPress={() => onReviewFoodPurchase(item, "under_review")}
                  variant="outline"
                >
                  <Text>Under review</Text>
                </Button>
                <Button
                  className="h-9"
                  disabled={
                    actionState === "pending" || foodPurchaseNotesRequired
                  }
                  onPress={() => onReviewFoodPurchase(item, "approved")}
                  variant="outline"
                >
                  <Text>Approve</Text>
                </Button>
                <Button
                  className="h-9"
                  disabled={
                    actionState === "pending" || foodPurchaseNotesRequired
                  }
                  onPress={() => onReviewFoodPurchase(item, "rejected")}
                  variant="outline"
                >
                  <Text>Reject</Text>
                </Button>
                <Button
                  className="h-9"
                  disabled={actionState === "pending"}
                  onPress={() => onOpenFoodPurchaseReview(null)}
                  variant="ghost"
                >
                  <Text>Cancel</Text>
                </Button>
              </View>
            </View>
          ) : isFinancingReviewing ? (
            <View className="gap-2 pt-2">
              <Textarea
                editable={actionState !== "pending"}
                onChangeText={setFinancingReviewNotes}
                placeholder="Decision notes"
                value={financingReviewNotes}
              />
              <View className="flex-row flex-wrap gap-2">
                <Button
                  className="h-9"
                  disabled={actionState === "pending"}
                  onPress={() => onReviewFinancing(item, "under_review")}
                  variant="outline"
                >
                  <Text>Under review</Text>
                </Button>
                <Button
                  className="h-9"
                  disabled={actionState === "pending"}
                  onPress={() => onReviewFinancing(item, "approved")}
                  variant="outline"
                >
                  <Text>Approve</Text>
                </Button>
                <Button
                  className="h-9"
                  disabled={actionState === "pending"}
                  onPress={() => onReviewFinancing(item, "rejected")}
                  variant="outline"
                >
                  <Text>Reject</Text>
                </Button>
                <Button
                  className="h-9"
                  disabled={actionState === "pending"}
                  onPress={() => onOpenFinancingReview(null)}
                  variant="ghost"
                >
                  <Text>Cancel</Text>
                </Button>
              </View>
            </View>
          ) : isProcurementReviewing ? (
            <View className="gap-2 pt-2">
              <View className="flex-row gap-2">
                <Input
                  className="flex-1"
                  editable={actionState !== "pending"}
                  keyboardType="numeric"
                  onChangeText={setProcurementApprovedCost}
                  placeholder="Approved cost"
                  value={procurementApprovedCost}
                />
                <Input
                  className="w-28"
                  editable={actionState !== "pending"}
                  keyboardType="numeric"
                  onChangeText={setProcurementApprovedRepaymentMonths}
                  placeholder="Months"
                  value={procurementApprovedRepaymentMonths}
                />
              </View>
              <Textarea
                editable={actionState !== "pending"}
                onChangeText={setProcurementReviewNotes}
                placeholder="Review notes"
                value={procurementReviewNotes}
              />
              <View className="flex-row flex-wrap gap-2">
                <Button
                  className="h-9"
                  disabled={
                    actionState === "pending" || procurementNotesRequired
                  }
                  onPress={() => onReviewProcurement(item, "under_review")}
                  variant="outline"
                >
                  <Text>Under review</Text>
                </Button>
                <Button
                  className="h-9"
                  disabled={
                    actionState === "pending" ||
                    procurementNotesRequired ||
                    procurementApprovalValuesMissing
                  }
                  onPress={() => onReviewProcurement(item, "approved")}
                  variant="outline"
                >
                  <Text>Approve</Text>
                </Button>
                <Button
                  className="h-9"
                  disabled={
                    actionState === "pending" || procurementNotesRequired
                  }
                  onPress={() => onReviewProcurement(item, "rejected")}
                  variant="outline"
                >
                  <Text>Reject</Text>
                </Button>
                <Button
                  className="h-9"
                  disabled={actionState === "pending"}
                  onPress={() => onOpenProcurementReview(null)}
                  variant="ghost"
                >
                  <Text>Cancel</Text>
                </Button>
              </View>
            </View>
          ) : isProjectFinancingReviewing ? (
            <View className="gap-2 pt-2">
              <View className="flex-row gap-2">
                <Input
                  className="flex-1"
                  editable={actionState !== "pending"}
                  keyboardType="numeric"
                  onChangeText={setProjectFinancingApprovedAmount}
                  placeholder="Approved amount"
                  value={projectFinancingApprovedAmount}
                />
                <Input
                  className="w-28"
                  editable={actionState !== "pending"}
                  keyboardType="numeric"
                  onChangeText={setProjectFinancingApprovedPaybackMonths}
                  placeholder="Months"
                  value={projectFinancingApprovedPaybackMonths}
                />
              </View>
              <View className="flex-row flex-wrap gap-2">
                {projectFinancingStructures.map((structure) => (
                  <Button
                    className="h-9"
                    disabled={actionState === "pending"}
                    key={structure.value}
                    onPress={() =>
                      setProjectFinancingApprovedStructure(structure.value)
                    }
                    variant={
                      projectFinancingApprovedStructure === structure.value
                        ? "secondary"
                        : "outline"
                    }
                  >
                    <Text>{structure.label}</Text>
                  </Button>
                ))}
              </View>
              <Textarea
                editable={actionState !== "pending"}
                onChangeText={setProjectFinancingReviewNotes}
                placeholder="Review notes"
                value={projectFinancingReviewNotes}
              />
              <View className="flex-row flex-wrap gap-2">
                <Button
                  className="h-9"
                  disabled={
                    actionState === "pending" || projectFinancingNotesRequired
                  }
                  onPress={() => onReviewProjectFinancing(item, "under_review")}
                  variant="outline"
                >
                  <Text>Under review</Text>
                </Button>
                <Button
                  className="h-9"
                  disabled={
                    actionState === "pending" ||
                    projectFinancingNotesRequired ||
                    projectFinancingApprovalValuesMissing
                  }
                  onPress={() => onReviewProjectFinancing(item, "approved")}
                  variant="outline"
                >
                  <Text>Approve</Text>
                </Button>
                <Button
                  className="h-9"
                  disabled={
                    actionState === "pending" || projectFinancingNotesRequired
                  }
                  onPress={() => onReviewProjectFinancing(item, "rejected")}
                  variant="outline"
                >
                  <Text>Reject</Text>
                </Button>
                <Button
                  className="h-9"
                  disabled={actionState === "pending"}
                  onPress={() => onOpenProjectFinancingReview(null)}
                  variant="ghost"
                >
                  <Text>Cancel</Text>
                </Button>
              </View>
            </View>
          ) : isReceiptReviewing ? (
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
          ) : isShareReviewing ? (
            <View className="gap-2 pt-2">
              <Textarea
                editable={actionState !== "pending"}
                onChangeText={setShareReviewNotes}
                placeholder="Review notes"
                value={shareReviewNotes}
              />
              <View className="flex-row flex-wrap gap-2">
                <Button
                  className="h-9"
                  disabled={actionState === "pending" || shareNotesRequired}
                  onPress={() => onReviewShare(item, "approved")}
                  variant="outline"
                >
                  <Text>Approve</Text>
                </Button>
                <Button
                  className="h-9"
                  disabled={actionState === "pending" || shareNotesRequired}
                  onPress={() => onReviewShare(item, "rejected")}
                  variant="outline"
                >
                  <Text>Reject</Text>
                </Button>
                <Button
                  className="h-9"
                  disabled={actionState === "pending"}
                  onPress={() => onOpenShareReview(null)}
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
          ) : item.queueKey === "financing" ? (
            <Button
              className="mt-2 self-start"
              disabled={actionState === "pending"}
              onPress={() => onOpenFinancingReview(item)}
              size="sm"
              variant="outline"
            >
              <Icon name="HandCoins" className="size-sm" />
              <Text>Review financing</Text>
            </Button>
          ) : item.queueKey === "procurement" ? (
            <Button
              className="mt-2 self-start"
              disabled={actionState === "pending"}
              onPress={() => onOpenProcurementReview(item)}
              size="sm"
              variant="outline"
            >
              <Icon name="PackageSearch" className="size-sm" />
              <Text>Review procurement</Text>
            </Button>
          ) : item.queueKey === "foodPurchase" ? (
            <Button
              className="mt-2 self-start"
              disabled={actionState === "pending"}
              onPress={() => onOpenFoodPurchaseReview(item)}
              size="sm"
              variant="outline"
            >
              <Icon name="ShoppingBasket" className="size-sm" />
              <Text>Review food purchase</Text>
            </Button>
          ) : item.queueKey === "projectFinancing" ? (
            <Button
              className="mt-2 self-start"
              disabled={actionState === "pending"}
              onPress={() => onOpenProjectFinancingReview(item)}
              size="sm"
              variant="outline"
            >
              <Icon name="BriefcaseBusiness" className="size-sm" />
              <Text>Review project</Text>
            </Button>
          ) : item.queueKey === "shares" ? (
            <Button
              className="mt-2 self-start"
              disabled={actionState === "pending"}
              onPress={() => onOpenShareReview(item)}
              size="sm"
              variant="outline"
            >
              <Icon name="PieChart" className="size-sm" />
              <Text>Review shares</Text>
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
  collectionFollowUpItemId,
  collectionFollowUpNextActionAt,
  collectionFollowUpNote,
  collectionFollowUpPriority,
  collectionFollowUpStatus,
  followUp,
  isFirst,
  onOpenCollectionFollowUp,
  onRecordFollowUp,
  setCollectionFollowUpNextActionAt,
  setCollectionFollowUpNote,
  setCollectionFollowUpPriority,
  setCollectionFollowUpStatus,
}: {
  actionState: "idle" | "pending"
  collectionFollowUpItemId: string | null
  collectionFollowUpNextActionAt: string
  collectionFollowUpNote: string
  collectionFollowUpPriority: CollectionFollowUpPriority
  collectionFollowUpStatus: CollectionFollowUpStatus
  followUp: MobileAdminCollectionFollowUp
  isFirst: boolean
  onOpenCollectionFollowUp: (
    followUp: MobileAdminCollectionFollowUp | null
  ) => void
  onRecordFollowUp: (followUp: MobileAdminCollectionFollowUp) => void
  setCollectionFollowUpNextActionAt: (value: string) => void
  setCollectionFollowUpNote: (value: string) => void
  setCollectionFollowUpPriority: (value: CollectionFollowUpPriority) => void
  setCollectionFollowUpStatus: (value: CollectionFollowUpStatus) => void
}) {
  const isRecording = collectionFollowUpItemId === followUp.id
  const hasValidDate =
    collectionFollowUpNextActionAt.trim().length === 0 ||
    /^\d{4}-\d{2}-\d{2}$/.test(collectionFollowUpNextActionAt.trim())
  const canSubmit =
    collectionFollowUpNote.trim().length >= 2 &&
    hasValidDate &&
    actionState !== "pending"

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
          <View className="flex-row flex-wrap items-center gap-2">
            <StatusBadge
              label={formatStatus(followUp.status)}
              tone={getStatusBadgeTone(followUp.status)}
            />
            <StatusBadge
              label={formatStatus(followUp.priority)}
              tone={
                followUp.priority === "urgent"
                  ? "destructive"
                  : followUp.priority === "high"
                    ? "warning"
                    : "muted"
              }
            />
            {followUp.nextActionAt ? (
              <Text className="text-xs font-medium text-muted-foreground">
                Next {formatDate(followUp.nextActionAt)}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
      {isRecording ? (
        <View className="gap-3">
          <Textarea
            editable={actionState !== "pending"}
            onChangeText={setCollectionFollowUpNote}
            placeholder="Field follow-up note"
            value={collectionFollowUpNote}
          />
          <View className="gap-2">
            <Text className="text-xs font-medium text-muted-foreground">
              Status
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {collectionFollowUpStatuses.map((item) => (
                <Button
                  className="h-9"
                  disabled={actionState === "pending"}
                  key={item.value}
                  onPress={() => setCollectionFollowUpStatus(item.value)}
                  variant={
                    collectionFollowUpStatus === item.value
                      ? "secondary"
                      : "outline"
                  }
                >
                  <Text>{item.label}</Text>
                </Button>
              ))}
            </View>
          </View>
          <View className="gap-2">
            <Text className="text-xs font-medium text-muted-foreground">
              Priority
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {collectionFollowUpPriorities.map((item) => (
                <Button
                  className="h-9"
                  disabled={actionState === "pending"}
                  key={item.value}
                  onPress={() => setCollectionFollowUpPriority(item.value)}
                  variant={
                    collectionFollowUpPriority === item.value
                      ? "secondary"
                      : "outline"
                  }
                >
                  <Text>{item.label}</Text>
                </Button>
              ))}
            </View>
          </View>
          <Input
            editable={actionState !== "pending"}
            onChangeText={setCollectionFollowUpNextActionAt}
            placeholder="Next action date YYYY-MM-DD"
            value={collectionFollowUpNextActionAt}
          />
          {!hasValidDate ? (
            <Text className="text-xs font-medium text-destructive">
              Use YYYY-MM-DD for next action date.
            </Text>
          ) : null}
          <View className="flex-row flex-wrap gap-2">
            <Button
              className="h-10"
              disabled={!canSubmit}
              onPress={() => onRecordFollowUp(followUp)}
            >
              <Icon name="Send" className="size-base text-primary-foreground" />
              <Text>{actionState === "pending" ? "Saving" : "Save note"}</Text>
            </Button>
            <Button
              className="h-10"
              disabled={actionState === "pending"}
              onPress={() => onOpenCollectionFollowUp(null)}
              variant="outline"
            >
              <Text>Cancel</Text>
            </Button>
          </View>
        </View>
      ) : (
        <Button
          className="self-start"
          disabled={actionState === "pending"}
          onPress={() => onOpenCollectionFollowUp(followUp)}
          size="sm"
          variant="outline"
        >
          <Icon name="MessageSquarePlus" className="size-sm" />
          <Text>Record follow-up</Text>
        </Button>
      )}
    </View>
  )
}

export function AdminFinanceScreen() {
  const { profile } = useAuthContext()
  const colors = useColors()
  const [finance, setFinance] = useState<MobileAdminFinance | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [actionKey, setActionKey] = useState<string | null>(null)
  const [foodPurchaseReviewItemId, setFoodPurchaseReviewItemId] = useState<
    string | null
  >(null)
  const [foodPurchaseReviewNotes, setFoodPurchaseReviewNotes] = useState("")
  const [financingReviewItemId, setFinancingReviewItemId] = useState<
    string | null
  >(null)
  const [financingReviewNotes, setFinancingReviewNotes] = useState("")
  const [procurementReviewItemId, setProcurementReviewItemId] = useState<
    string | null
  >(null)
  const [procurementReviewNotes, setProcurementReviewNotes] = useState("")
  const [procurementApprovedCost, setProcurementApprovedCost] = useState("")
  const [
    procurementApprovedRepaymentMonths,
    setProcurementApprovedRepaymentMonths,
  ] = useState("")
  const [projectFinancingReviewItemId, setProjectFinancingReviewItemId] =
    useState<string | null>(null)
  const [projectFinancingReviewNotes, setProjectFinancingReviewNotes] =
    useState("")
  const [projectFinancingApprovedAmount, setProjectFinancingApprovedAmount] =
    useState("")
  const [
    projectFinancingApprovedPaybackMonths,
    setProjectFinancingApprovedPaybackMonths,
  ] = useState("")
  const [
    projectFinancingApprovedStructure,
    setProjectFinancingApprovedStructure,
  ] = useState<MobileProjectFinancingStructure>("undecided")
  const [receiptReviewItemId, setReceiptReviewItemId] = useState<string | null>(
    null
  )
  const [receiptReviewNotes, setReceiptReviewNotes] = useState("")
  const [shareReviewItemId, setShareReviewItemId] = useState<string | null>(
    null
  )
  const [shareReviewNotes, setShareReviewNotes] = useState("")
  const [collectionFollowUpItemId, setCollectionFollowUpItemId] = useState<
    string | null
  >(null)
  const [collectionFollowUpNote, setCollectionFollowUpNote] = useState("")
  const [collectionFollowUpStatus, setCollectionFollowUpStatus] =
    useState<CollectionFollowUpStatus>("reminded")
  const [collectionFollowUpPriority, setCollectionFollowUpPriority] =
    useState<CollectionFollowUpPriority>("normal")
  const [collectionFollowUpNextActionAt, setCollectionFollowUpNextActionAt] =
    useState("")
  const [error, setError] = useState<string | null>(null)
  const canUseServerFinance = Boolean(
    profile?.role === "admin" &&
    profile?.token &&
    !isMockSessionToken(profile.token)
  )
  const currencyCode = profile?.tenant.currencyCode ?? "NGN"
  const hasStaleFinance = isMobileReadCacheStale(finance?.cache)
  const hasAdminFinanceDraft = Boolean(
    financingReviewNotes.trim() ||
    foodPurchaseReviewNotes.trim() ||
    procurementReviewNotes.trim() ||
    procurementApprovedCost.trim() ||
    procurementApprovedRepaymentMonths.trim() ||
    projectFinancingReviewNotes.trim() ||
    projectFinancingApprovedAmount.trim() ||
    projectFinancingApprovedPaybackMonths.trim() ||
    receiptReviewNotes.trim() ||
    shareReviewNotes.trim() ||
    collectionFollowUpNote.trim() ||
    collectionFollowUpNextActionAt.trim()
  )
  const adminFinanceDraft = useMemo(
    () => ({
      collectionFollowUpItemId,
      collectionFollowUpNextActionAt,
      collectionFollowUpNote,
      collectionFollowUpPriority,
      collectionFollowUpStatus,
      financingReviewItemId,
      financingReviewNotes,
      foodPurchaseReviewItemId,
      foodPurchaseReviewNotes,
      procurementApprovedCost,
      procurementApprovedRepaymentMonths,
      procurementReviewItemId,
      procurementReviewNotes,
      projectFinancingApprovedAmount,
      projectFinancingApprovedPaybackMonths,
      projectFinancingApprovedStructure,
      projectFinancingReviewItemId,
      projectFinancingReviewNotes,
      receiptReviewItemId,
      receiptReviewNotes,
      shareReviewItemId,
      shareReviewNotes,
    }),
    [
      collectionFollowUpItemId,
      collectionFollowUpNextActionAt,
      collectionFollowUpNote,
      collectionFollowUpPriority,
      collectionFollowUpStatus,
      financingReviewItemId,
      financingReviewNotes,
      foodPurchaseReviewItemId,
      foodPurchaseReviewNotes,
      procurementApprovedCost,
      procurementApprovedRepaymentMonths,
      procurementReviewItemId,
      procurementReviewNotes,
      projectFinancingApprovedAmount,
      projectFinancingApprovedPaybackMonths,
      projectFinancingApprovedStructure,
      projectFinancingReviewItemId,
      projectFinancingReviewNotes,
      receiptReviewItemId,
      receiptReviewNotes,
      shareReviewItemId,
      shareReviewNotes,
    ]
  )
  const clearAdminFinanceDraft = useMobileFormDraft({
    enabled: canUseServerFinance,
    key: "admin.finance.review",
    onHydrate: (draft) => {
      setFoodPurchaseReviewItemId(draft.foodPurchaseReviewItemId)
      setFoodPurchaseReviewNotes(draft.foodPurchaseReviewNotes)
      setFinancingReviewItemId(draft.financingReviewItemId)
      setFinancingReviewNotes(draft.financingReviewNotes)
      setProcurementReviewItemId(draft.procurementReviewItemId)
      setProcurementReviewNotes(draft.procurementReviewNotes)
      setProcurementApprovedCost(draft.procurementApprovedCost)
      setProcurementApprovedRepaymentMonths(
        draft.procurementApprovedRepaymentMonths
      )
      setProjectFinancingReviewItemId(draft.projectFinancingReviewItemId)
      setProjectFinancingReviewNotes(draft.projectFinancingReviewNotes)
      setProjectFinancingApprovedAmount(draft.projectFinancingApprovedAmount)
      setProjectFinancingApprovedPaybackMonths(
        draft.projectFinancingApprovedPaybackMonths
      )
      setProjectFinancingApprovedStructure(
        draft.projectFinancingApprovedStructure
      )
      setReceiptReviewItemId(draft.receiptReviewItemId)
      setReceiptReviewNotes(draft.receiptReviewNotes)
      setShareReviewItemId(draft.shareReviewItemId)
      setShareReviewNotes(draft.shareReviewNotes)
      setCollectionFollowUpItemId(draft.collectionFollowUpItemId)
      setCollectionFollowUpNote(draft.collectionFollowUpNote)
      setCollectionFollowUpStatus(draft.collectionFollowUpStatus)
      setCollectionFollowUpPriority(draft.collectionFollowUpPriority)
      setCollectionFollowUpNextActionAt(draft.collectionFollowUpNextActionAt)
    },
    value: adminFinanceDraft,
  })
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
    if (hasStaleFinance) {
      setError("Refresh finance data before updating a review queue.")
      return
    }

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
    if (hasStaleFinance) {
      setError("Refresh finance data before reviewing a receipt.")
      return
    }

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
      await clearAdminFinanceDraft()
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

  async function reviewFinancingDecision(
    item: MobileAdminFinanceRecentItem,
    status: MobileAdminReviewStatus
  ) {
    if (hasStaleFinance) {
      setError("Refresh finance data before reviewing a financing request.")
      return
    }

    const notes = financingReviewNotes.trim()
    const nextActionKey = `${item.queueKey}-${item.id}`

    setActionKey(nextActionKey)
    setError(null)

    try {
      await reviewMobileAdminFinancingRequest({
        loanRequestId: item.id,
        notes: notes || undefined,
        status,
      })
      await clearAdminFinanceDraft()
      setFinancingReviewItemId(null)
      setFinancingReviewNotes("")
      await refreshFinance()
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "The financing review action could not be completed."
      )
    } finally {
      setActionKey(null)
    }
  }

  async function reviewProcurementDecision(
    item: MobileAdminFinanceRecentItem,
    status: MobileAdminReviewStatus
  ) {
    if (hasStaleFinance) {
      setError("Refresh finance data before reviewing a procurement request.")
      return
    }

    const notes = procurementReviewNotes.trim()
    const approvedCost = Number(procurementApprovedCost)
    const approvedRepaymentMonths = Number(procurementApprovedRepaymentMonths)

    if (notes.length < 2) {
      setError("Procurement review notes are required.")
      return
    }

    if (
      status === "approved" &&
      (!Number.isFinite(approvedCost) ||
        approvedCost <= 0 ||
        !Number.isInteger(approvedRepaymentMonths) ||
        approvedRepaymentMonths <= 0)
    ) {
      setError("Approved cost and repayment months are required.")
      return
    }

    const nextActionKey = `${item.queueKey}-${item.id}`

    setActionKey(nextActionKey)
    setError(null)

    try {
      await reviewMobileAdminProcurementRequest({
        approvedCost: status === "approved" ? approvedCost : undefined,
        approvedRepaymentMonths:
          status === "approved" ? approvedRepaymentMonths : undefined,
        notes,
        procurementRequestId: item.id,
        status,
      })
      await clearAdminFinanceDraft()
      setProcurementReviewItemId(null)
      setProcurementReviewNotes("")
      setProcurementApprovedCost("")
      setProcurementApprovedRepaymentMonths("")
      await refreshFinance()
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "The procurement review action could not be completed."
      )
    } finally {
      setActionKey(null)
    }
  }

  async function reviewFoodPurchaseDecision(
    item: MobileAdminFinanceRecentItem,
    status: MobileAdminReviewStatus
  ) {
    if (hasStaleFinance) {
      setError("Refresh finance data before reviewing Foodstuff Purchase.")
      return
    }

    const notes = foodPurchaseReviewNotes.trim()

    if (notes.length < 2) {
      setError("Food purchase review notes are required.")
      return
    }

    const nextActionKey = `${item.queueKey}-${item.id}`

    setActionKey(nextActionKey)
    setError(null)

    try {
      await reviewMobileAdminFoodPurchaseApplication({
        applicationId: item.id,
        notes,
        status,
      })
      await clearAdminFinanceDraft()
      setFoodPurchaseReviewItemId(null)
      setFoodPurchaseReviewNotes("")
      await refreshFinance()
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "The food purchase review action could not be completed."
      )
    } finally {
      setActionKey(null)
    }
  }

  async function reviewProjectFinancingDecision(
    item: MobileAdminFinanceRecentItem,
    status: MobileAdminReviewStatus
  ) {
    if (hasStaleFinance) {
      setError(
        "Refresh finance data before reviewing a project financing request."
      )
      return
    }

    const notes = projectFinancingReviewNotes.trim()
    const approvedAmount = Number(projectFinancingApprovedAmount)
    const approvedPaybackMonths = Number(projectFinancingApprovedPaybackMonths)

    if (notes.length < 2) {
      setError("Project financing review notes are required.")
      return
    }

    if (
      status === "approved" &&
      (!Number.isFinite(approvedAmount) ||
        approvedAmount <= 0 ||
        projectFinancingApprovedStructure === "undecided" ||
        (projectFinancingApprovedStructure === "repayable_facility" &&
          (!Number.isInteger(approvedPaybackMonths) ||
            approvedPaybackMonths <= 0)))
    ) {
      setError(
        "Approved amount, structure, and applicable payback are required."
      )
      return
    }

    const nextActionKey = `${item.queueKey}-${item.id}`

    setActionKey(nextActionKey)
    setError(null)

    try {
      await reviewMobileAdminProjectFinancingRequest({
        approvedAmount: status === "approved" ? approvedAmount : undefined,
        approvedPaybackMonths:
          status === "approved" &&
          projectFinancingApprovedStructure === "repayable_facility"
            ? approvedPaybackMonths
            : undefined,
        approvedStructure:
          status === "approved" ? projectFinancingApprovedStructure : undefined,
        notes,
        projectFinancingRequestId: item.id,
        status,
      })
      await clearAdminFinanceDraft()
      setProjectFinancingReviewItemId(null)
      setProjectFinancingReviewNotes("")
      setProjectFinancingApprovedAmount("")
      setProjectFinancingApprovedPaybackMonths("")
      setProjectFinancingApprovedStructure("undecided")
      await refreshFinance()
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "The project financing review action could not be completed."
      )
    } finally {
      setActionKey(null)
    }
  }

  async function reviewShareDecision(
    item: MobileAdminFinanceRecentItem,
    decision: ShareReviewDecision
  ) {
    if (hasStaleFinance) {
      setError("Refresh finance data before reviewing a share request.")
      return
    }

    const reviewNotes = shareReviewNotes.trim()

    if (reviewNotes.length < 2) {
      setError("Share review notes are required.")
      return
    }

    const nextActionKey = `${item.queueKey}-${item.id}`

    setActionKey(nextActionKey)
    setError(null)

    try {
      await reviewMobileAdminShareApplication({
        applicationId: item.id,
        decision,
        reviewNotes,
      })
      await clearAdminFinanceDraft()
      setShareReviewItemId(null)
      setShareReviewNotes("")
      await refreshFinance()
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "The share review action could not be completed."
      )
    } finally {
      setActionKey(null)
    }
  }

  async function recordFollowUp(followUp: MobileAdminCollectionFollowUp) {
    if (hasStaleFinance) {
      setError("Refresh finance data before recording a follow-up.")
      return
    }

    const note = collectionFollowUpNote.trim()
    const nextActionAt = collectionFollowUpNextActionAt.trim()

    if (note.length < 2) {
      setError("A follow-up note is required.")
      return
    }

    if (nextActionAt.length > 0 && !/^\d{4}-\d{2}-\d{2}$/.test(nextActionAt)) {
      setError("Use YYYY-MM-DD for next action date.")
      return
    }

    const nextActionKey = `follow-up-${followUp.id}`

    setActionKey(nextActionKey)
    setError(null)

    try {
      await recordMobileAdminCollectionFollowUp({
        caseStage: followUp.caseStage,
        nextActionAt: nextActionAt || undefined,
        note,
        priority: collectionFollowUpPriority,
        promiseToPayAt:
          collectionFollowUpStatus === "promise_to_pay" && nextActionAt
            ? nextActionAt
            : undefined,
        repaymentScheduleItemId: followUp.repaymentScheduleItemId,
        resolutionStatus: followUp.resolutionStatus,
        status: collectionFollowUpStatus,
      })
      await clearAdminFinanceDraft()
      setCollectionFollowUpItemId(null)
      setCollectionFollowUpNote("")
      setCollectionFollowUpStatus("reminded")
      setCollectionFollowUpPriority("normal")
      setCollectionFollowUpNextActionAt("")
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
            <CachedReadBanner cache={finance?.cache} label="finance data" />

            <FormStateBanner
              hasDraft={hasAdminFinanceDraft}
              isStale={hasStaleFinance}
            />

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
                    <EmptyState
                      description="Receipt, financing, procurement, Foodstuff Purchase, Project Financing, share, and collection queues will appear here."
                      icon="ShieldCheck"
                      title="No finance queues"
                    />
                  )}
                </View>
              )}
            </SectionCard>

            <SectionCard icon="ClipboardList" title="Recent requests">
              {isLoading ? (
                <LoadingSpinner />
              ) : (
                <VirtualizedCardList
                  data={finance?.recentItems ?? []}
                  empty={
                    <EmptyState
                      description="Pending finance review records will appear here with member, status, age, and amount context."
                      icon="ClipboardList"
                      title="No pending finance requests"
                    />
                  }
                  estimatedItemSize={320}
                  keyExtractor={(item) => `${item.queueKey}-${item.id}`}
                  maxHeight={680}
                  renderItem={({ index, item }) => (
                    <FinanceRecentItemCard
                      actionState={
                        hasStaleFinance ||
                        actionKey === `${item.queueKey}-${item.id}`
                          ? "pending"
                          : "idle"
                      }
                      currencyCode={currencyCode}
                      financingReviewItemId={financingReviewItemId}
                      financingReviewNotes={financingReviewNotes}
                      isFirst={index === 0}
                      item={item}
                      onMarkReviewing={markReviewing}
                      onOpenFoodPurchaseReview={(selectedItem) => {
                        setFoodPurchaseReviewItemId(selectedItem?.id ?? null)
                        setFoodPurchaseReviewNotes("")
                        setFinancingReviewItemId(null)
                        setFinancingReviewNotes("")
                        setProcurementReviewItemId(null)
                        setProcurementReviewNotes("")
                        setProcurementApprovedCost("")
                        setProcurementApprovedRepaymentMonths("")
                        setProjectFinancingReviewItemId(null)
                        setProjectFinancingReviewNotes("")
                        setProjectFinancingApprovedAmount("")
                        setProjectFinancingApprovedPaybackMonths("")
                        setProjectFinancingApprovedStructure("undecided")
                        setReceiptReviewItemId(null)
                        setReceiptReviewNotes("")
                        setShareReviewItemId(null)
                        setShareReviewNotes("")
                        setError(null)
                      }}
                      onOpenFinancingReview={(selectedItem) => {
                        setFoodPurchaseReviewItemId(null)
                        setFoodPurchaseReviewNotes("")
                        setFinancingReviewItemId(selectedItem?.id ?? null)
                        setFinancingReviewNotes("")
                        setProcurementReviewItemId(null)
                        setProcurementReviewNotes("")
                        setProcurementApprovedCost("")
                        setProcurementApprovedRepaymentMonths("")
                        setProjectFinancingReviewItemId(null)
                        setProjectFinancingReviewNotes("")
                        setProjectFinancingApprovedAmount("")
                        setProjectFinancingApprovedPaybackMonths("")
                        setProjectFinancingApprovedStructure("undecided")
                        setReceiptReviewItemId(null)
                        setReceiptReviewNotes("")
                        setShareReviewItemId(null)
                        setShareReviewNotes("")
                        setError(null)
                      }}
                      onOpenProcurementReview={(selectedItem) => {
                        setFoodPurchaseReviewItemId(null)
                        setFoodPurchaseReviewNotes("")
                        setFinancingReviewItemId(null)
                        setFinancingReviewNotes("")
                        setProcurementReviewItemId(selectedItem?.id ?? null)
                        setProcurementReviewNotes("")
                        setProcurementApprovedCost("")
                        setProcurementApprovedRepaymentMonths("")
                        setProjectFinancingReviewItemId(null)
                        setProjectFinancingReviewNotes("")
                        setProjectFinancingApprovedAmount("")
                        setProjectFinancingApprovedPaybackMonths("")
                        setProjectFinancingApprovedStructure("undecided")
                        setReceiptReviewItemId(null)
                        setReceiptReviewNotes("")
                        setShareReviewItemId(null)
                        setShareReviewNotes("")
                        setError(null)
                      }}
                      onOpenProjectFinancingReview={(selectedItem) => {
                        setFoodPurchaseReviewItemId(null)
                        setFoodPurchaseReviewNotes("")
                        setFinancingReviewItemId(null)
                        setFinancingReviewNotes("")
                        setProcurementReviewItemId(null)
                        setProcurementReviewNotes("")
                        setProcurementApprovedCost("")
                        setProcurementApprovedRepaymentMonths("")
                        setProjectFinancingReviewItemId(
                          selectedItem?.id ?? null
                        )
                        setProjectFinancingReviewNotes("")
                        setProjectFinancingApprovedAmount("")
                        setProjectFinancingApprovedPaybackMonths("")
                        setProjectFinancingApprovedStructure("undecided")
                        setReceiptReviewItemId(null)
                        setReceiptReviewNotes("")
                        setShareReviewItemId(null)
                        setShareReviewNotes("")
                        setError(null)
                      }}
                      onOpenReceiptReview={(selectedItem) => {
                        setFoodPurchaseReviewItemId(null)
                        setFoodPurchaseReviewNotes("")
                        setFinancingReviewItemId(null)
                        setFinancingReviewNotes("")
                        setProcurementReviewItemId(null)
                        setProcurementReviewNotes("")
                        setProcurementApprovedCost("")
                        setProcurementApprovedRepaymentMonths("")
                        setProjectFinancingReviewItemId(null)
                        setProjectFinancingReviewNotes("")
                        setProjectFinancingApprovedAmount("")
                        setProjectFinancingApprovedPaybackMonths("")
                        setProjectFinancingApprovedStructure("undecided")
                        setReceiptReviewItemId(selectedItem?.id ?? null)
                        setReceiptReviewNotes("")
                        setShareReviewItemId(null)
                        setShareReviewNotes("")
                        setError(null)
                      }}
                      onOpenShareReview={(selectedItem) => {
                        setFoodPurchaseReviewItemId(null)
                        setFoodPurchaseReviewNotes("")
                        setFinancingReviewItemId(null)
                        setFinancingReviewNotes("")
                        setProcurementReviewItemId(null)
                        setProcurementReviewNotes("")
                        setProcurementApprovedCost("")
                        setProcurementApprovedRepaymentMonths("")
                        setProjectFinancingReviewItemId(null)
                        setProjectFinancingReviewNotes("")
                        setProjectFinancingApprovedAmount("")
                        setProjectFinancingApprovedPaybackMonths("")
                        setProjectFinancingApprovedStructure("undecided")
                        setReceiptReviewItemId(null)
                        setReceiptReviewNotes("")
                        setShareReviewItemId(selectedItem?.id ?? null)
                        setShareReviewNotes("")
                        setError(null)
                      }}
                      onReviewFoodPurchase={reviewFoodPurchaseDecision}
                      onReviewFinancing={reviewFinancingDecision}
                      onReviewProjectFinancing={reviewProjectFinancingDecision}
                      onReviewProcurement={reviewProcurementDecision}
                      onReviewReceipt={reviewReceiptDecision}
                      onReviewShare={reviewShareDecision}
                      foodPurchaseReviewItemId={foodPurchaseReviewItemId}
                      foodPurchaseReviewNotes={foodPurchaseReviewNotes}
                      projectFinancingApprovedAmount={
                        projectFinancingApprovedAmount
                      }
                      projectFinancingApprovedPaybackMonths={
                        projectFinancingApprovedPaybackMonths
                      }
                      projectFinancingApprovedStructure={
                        projectFinancingApprovedStructure
                      }
                      projectFinancingReviewItemId={
                        projectFinancingReviewItemId
                      }
                      projectFinancingReviewNotes={projectFinancingReviewNotes}
                      procurementApprovedCost={procurementApprovedCost}
                      procurementApprovedRepaymentMonths={
                        procurementApprovedRepaymentMonths
                      }
                      procurementReviewItemId={procurementReviewItemId}
                      procurementReviewNotes={procurementReviewNotes}
                      receiptReviewItemId={receiptReviewItemId}
                      receiptReviewNotes={receiptReviewNotes}
                      shareReviewItemId={shareReviewItemId}
                      shareReviewNotes={shareReviewNotes}
                      setFoodPurchaseReviewNotes={setFoodPurchaseReviewNotes}
                      setFinancingReviewNotes={setFinancingReviewNotes}
                      setProjectFinancingApprovedAmount={
                        setProjectFinancingApprovedAmount
                      }
                      setProjectFinancingApprovedPaybackMonths={
                        setProjectFinancingApprovedPaybackMonths
                      }
                      setProjectFinancingApprovedStructure={
                        setProjectFinancingApprovedStructure
                      }
                      setProjectFinancingReviewNotes={
                        setProjectFinancingReviewNotes
                      }
                      setProcurementApprovedCost={setProcurementApprovedCost}
                      setProcurementApprovedRepaymentMonths={
                        setProcurementApprovedRepaymentMonths
                      }
                      setProcurementReviewNotes={setProcurementReviewNotes}
                      setReceiptReviewNotes={setReceiptReviewNotes}
                      setShareReviewNotes={setShareReviewNotes}
                    />
                  )}
                />
              )}
            </SectionCard>

            <SectionCard icon="MessageSquareText" title="Collection follow-ups">
              {isLoading ? (
                <LoadingSpinner />
              ) : (
                <VirtualizedCardList
                  data={finance?.collectionFollowUps ?? []}
                  empty={
                    <EmptyState
                      description="Open collection follow-ups will appear here for field-ready reminders, promises, and next actions."
                      icon="MessageSquareText"
                      title="No collection follow-ups"
                    />
                  }
                  estimatedItemSize={260}
                  keyExtractor={(followUp) => followUp.id}
                  maxHeight={640}
                  renderItem={({ index, item: followUp }) => (
                    <CollectionFollowUpCard
                      actionState={
                        hasStaleFinance ||
                        actionKey === `follow-up-${followUp.id}`
                          ? "pending"
                          : "idle"
                      }
                      collectionFollowUpItemId={collectionFollowUpItemId}
                      collectionFollowUpNextActionAt={
                        collectionFollowUpNextActionAt
                      }
                      collectionFollowUpNote={collectionFollowUpNote}
                      collectionFollowUpPriority={collectionFollowUpPriority}
                      collectionFollowUpStatus={collectionFollowUpStatus}
                      followUp={followUp}
                      isFirst={index === 0}
                      onOpenCollectionFollowUp={(selectedFollowUp) => {
                        setCollectionFollowUpItemId(
                          selectedFollowUp?.id ?? null
                        )
                        setCollectionFollowUpNote("")
                        setCollectionFollowUpStatus("reminded")
                        setCollectionFollowUpPriority(
                          (selectedFollowUp?.priority as
                            | CollectionFollowUpPriority
                            | undefined) ?? "normal"
                        )
                        setCollectionFollowUpNextActionAt(
                          selectedFollowUp?.nextActionAt?.slice(0, 10) ?? ""
                        )
                        setError(null)
                      }}
                      onRecordFollowUp={recordFollowUp}
                      setCollectionFollowUpNextActionAt={
                        setCollectionFollowUpNextActionAt
                      }
                      setCollectionFollowUpNote={setCollectionFollowUpNote}
                      setCollectionFollowUpPriority={
                        setCollectionFollowUpPriority
                      }
                      setCollectionFollowUpStatus={setCollectionFollowUpStatus}
                    />
                  )}
                />
              )}
            </SectionCard>
          </>
        ) : null}
      </ScrollView>
    </SafeArea>
  )
}
