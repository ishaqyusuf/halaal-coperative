import { EmptyState } from "@/components/app/empty-state"
import { FullScreenFormSheet } from "@/components/app/full-screen-form-sheet"
import { ScreenBackButton } from "@/components/app/screen-back-button"
import { ScreenHeader } from "@/components/app/screen-header"
import { SubmissionReviewSheet } from "@/components/app/submission-review-sheet"
import { SubmissionSuccessSheet } from "@/components/app/submission-success-sheet"
import { VirtualizedCardList } from "@/components/app/virtualized-card-list"
import { WorkflowDetailSheet } from "@/components/app/workflow-detail-sheet"
import { LoadingSpinner } from "@/components/loading-spinner"
import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import {
  CooperativeServiceFreshness,
  CooperativeServiceStateNotice,
} from "@/features/member-cooperative-services/public/cooperative-service-state-notice"
import type { MobileMemberCooperativeServiceQaState } from "@/features/member-cooperative-services/public/member-cooperative-service-qa-state"
import { NotificationDestinationNotice } from "@/features/notifications/public/notification-destination-notice"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { formatCount } from "@/lib/format-count"
import { cn } from "@/lib/utils"
import { useRouter } from "expo-router"
import { Keyboard, ScrollView, View } from "react-native"
import {
  MemberFoodPurchaseApplicationForm,
  MemberFoodPurchaseQuickFill,
} from "../components/member-food-purchase-application-form"
import { MemberFoodPurchaseApplicationRow } from "../components/member-food-purchase-application-row"
import { MemberFoodPurchaseOverview } from "../components/member-food-purchase-overview"
import { useMemberFoodPurchaseController } from "../hooks/use-member-food-purchase-controller"
import {
  formatFoodPurchaseCurrency,
  formatFoodPurchaseDate,
  formatFoodPurchaseMonth,
  formatFoodPurchaseStatus,
} from "../model/member-food-purchase-presentation"

export function MemberFoodPurchaseScreen({
  initialEntityId = null,
  qaState = null,
}: {
  initialEntityId?: string | null
  qaState?: MobileMemberCooperativeServiceQaState | null
}) {
  const router = useRouter()
  const largeTextLayout = useLargeTextLayout()
  const controller = useMemberFoodPurchaseController({
    initialEntityId,
    qaState,
  })
  const {
    activeObligation,
    amount,
    canStartApplication,
    canSubmit,
    canUseServerFoodPurchase,
    currencyCode,
    cycleId,
    dismissDestinationUnavailable,
    error,
    foodPurchase,
    handleReviewDismissed,
    hasDraft,
    hasStaleFoodPurchase,
    isDestinationUnavailable,
    isFormVisible,
    isLoading,
    isLoadingMore,
    isReviewingSubmit,
    isSubmitting,
    itemDescription,
    loadMoreApplications,
    openApplicationDetail,
    openCycles,
    paybackMonths,
    quickFill,
    refresh,
    requestNotes,
    requestedAmount,
    requestedPaybackMonths,
    reviewRows,
    selectedApplication,
    setCycleId,
    setIsFormVisible,
    setIsReviewingSubmit,
    setItemDescription,
    setRequestNotes,
    setRequestedAmount,
    setRequestedPaybackMonths,
    setSelectedApplication,
    setSuccess,
    submitApplication,
    success,
  } = controller

  return (
    <SafeArea className="bg-background">
      <ScrollView
        className="bg-background"
        contentContainerClassName={cn(
          "gap-5 px-5 pt-5",
          canStartApplication ? "pb-4" : "pb-8"
        )}
        style={{ flex: 1 }}
      >
        <ScreenHeader
          leading={<ScreenBackButton onPress={() => router.back()} />}
          title="Foodstuff Purchase"
        />

        {isDestinationUnavailable ? (
          <NotificationDestinationNotice
            onDismiss={dismissDestinationUnavailable}
          />
        ) : null}

        {!canUseServerFoodPurchase ? (
          <View className="flex-row gap-3 border-y border-border py-4">
            <View className="size-10 items-center justify-center rounded-full bg-accent">
              <Icon className="size-sm text-accent-foreground" name="Info" />
            </View>
            <Text className="min-w-0 flex-1 text-sm leading-5 text-muted-foreground">
              Sign in with a member account to view Foodstuff Purchase.
            </Text>
          </View>
        ) : null}

        {canUseServerFoodPurchase ? (
          <>
            {hasStaleFoodPurchase ? (
              <CooperativeServiceFreshness
                cache={foodPurchase?.cache}
                label="Foodstuff Purchase history"
                onRefresh={refresh}
              />
            ) : null}

            {error ? (
              <CooperativeServiceStateNotice
                actionLabel="Try again"
                description={error}
                onAction={refresh}
                title="Foodstuff Purchase couldn’t load"
                tone="danger"
              />
            ) : null}

            {isLoading && !foodPurchase ? <LoadingSpinner /> : null}

            {foodPurchase ? (
              <>
                {activeObligation ? (
                  <MemberFoodPurchaseOverview
                    application={activeObligation}
                    currencyCode={currencyCode}
                  />
                ) : (
                  <View className="gap-2 border-y border-border py-5">
                    <Text className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                      Open cycles
                    </Text>
                    <Text className="text-3xl font-extrabold tracking-tight text-foreground">
                      {foodPurchase.summary.openCycles}
                    </Text>
                    <Text className="text-sm text-muted-foreground">
                      {foodPurchase.summary.openCycles > 0
                        ? "Applications are open."
                        : "No application cycle is open."}
                    </Text>
                  </View>
                )}

                {!canStartApplication && !hasStaleFoodPurchase ? (
                  <CooperativeServiceStateNotice
                    reasons={
                      foodPurchase.restrictionReasons.length
                        ? foodPurchase.restrictionReasons
                        : ["New applications are unavailable."]
                    }
                    title="New application unavailable"
                  />
                ) : null}

                <View className="gap-2">
                  <View
                    className={cn(
                      "gap-1",
                      !largeTextLayout &&
                        "flex-row items-end justify-between gap-4"
                    )}
                  >
                    <Text
                      accessibilityRole="header"
                      className="text-2xl font-extrabold tracking-tight text-foreground"
                    >
                      Applications
                    </Text>
                    <Text className="text-sm font-semibold text-muted-foreground">
                      {formatCount(
                        foodPurchase.summary.totalApplications,
                        "total"
                      )}
                    </Text>
                  </View>

                  <VirtualizedCardList
                    data={foodPurchase.applications}
                    empty={
                      <EmptyState
                        description="Your applications will appear here."
                        icon="ShoppingBasket"
                        title="No applications"
                      />
                    }
                    estimatedItemSize={largeTextLayout ? 320 : 112}
                    keyExtractor={(application) => application.id}
                    renderItem={({ index, item: application }) => (
                      <MemberFoodPurchaseApplicationRow
                        application={application}
                        currencyCode={currencyCode}
                        isFirst={index === 0}
                        onPress={() => void openApplicationDetail(application)}
                      />
                    )}
                  />

                  {foodPurchase.applicationNextCursor ? (
                    <Button
                      className="mt-2 h-11"
                      disabled={isLoadingMore}
                      onPress={() => void loadMoreApplications()}
                      variant="outline"
                    >
                      <Icon className="size-base text-foreground" name="Plus" />
                      <Text>{isLoadingMore ? "Loading" : "Load more"}</Text>
                    </Button>
                  ) : null}
                </View>

                <View className="gap-2 border-y border-border py-5">
                  <Text
                    accessibilityRole="header"
                    className="text-2xl font-extrabold tracking-tight text-foreground"
                  >
                    Current cycle
                  </Text>
                  <View
                    className={cn(
                      "gap-2",
                      !largeTextLayout &&
                        "flex-row items-start justify-between gap-4"
                    )}
                  >
                    <View
                      className={cn(
                        "min-w-0 gap-1",
                        largeTextLayout ? "w-full" : "flex-1"
                      )}
                    >
                      <Text className="text-sm font-bold text-foreground">
                        {openCycles[0]?.releaseNotes ||
                          (openCycles[0]
                            ? `${formatFoodPurchaseMonth(openCycles[0].periodMonth)} cycle`
                            : "No open cycle")}
                      </Text>
                      <Text className="text-xs leading-4 text-muted-foreground">
                        Up to{" "}
                        {formatCount(
                          foodPurchase.policy.maximumPaybackMonths,
                          "month"
                        )}
                        {" · "}
                        {formatCount(
                          foodPurchase.policy.maximumActiveObligationsPerMember,
                          "obligation"
                        )}
                        {" allowed"}
                      </Text>
                    </View>
                    <View
                      className={cn(
                        "flex-row gap-2",
                        largeTextLayout
                          ? "min-h-12 items-start"
                          : "items-center"
                      )}
                    >
                      <View
                        className={cn(
                          "size-2 rounded-full",
                          largeTextLayout && "mt-2.5",
                          openCycles.length
                            ? "bg-success"
                            : "bg-muted-foreground"
                        )}
                      />
                      <Text
                        className={cn(
                          "font-bold",
                          largeTextLayout ? "text-sm leading-8" : "text-xs",
                          openCycles.length
                            ? "text-success"
                            : "text-muted-foreground"
                        )}
                      >
                        {openCycles.length ? "Open" : "Closed"}
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      {canStartApplication ? (
        <View className="border-t border-border bg-background px-5 pt-3 pb-2">
          <Button
            accessibilityHint="Opens a keyboard-safe application form"
            className={cn("min-h-12 py-3", largeTextLayout ? "h-auto" : "h-12")}
            onPress={() => setIsFormVisible(true)}
          >
            <Icon
              className="size-base text-primary-foreground"
              name="ShoppingBasket"
            />
            <Text className="shrink text-center">
              {hasDraft ? "Continue application" : "New application"}
            </Text>
          </Button>
        </View>
      ) : null}

      <FullScreenFormSheet
        dirty={hasDraft}
        footer={
          <Button
            className={cn("min-h-12 py-3", largeTextLayout ? "h-auto" : "h-12")}
            disabled={!canSubmit || isSubmitting}
            onPress={() => {
              Keyboard.dismiss()
              setIsReviewingSubmit(true)
            }}
          >
            <Icon className="size-base text-primary-foreground" name="Send" />
            <Text className="shrink text-center">
              {isSubmitting ? "Submitting" : "Review application"}
            </Text>
          </Button>
        }
        isSubmitting={isSubmitting}
        onClose={() => setIsFormVisible(false)}
        overlay={
          <>
            <MemberFoodPurchaseQuickFill onPress={quickFill} visible />
            <SubmissionReviewSheet
              isSubmitting={isSubmitting}
              onClose={() => setIsReviewingSubmit(false)}
              onConfirm={submitApplication}
              onDismissed={handleReviewDismissed}
              rows={reviewRows}
              title="Review application"
              visible={isReviewingSubmit}
            />
          </>
        }
        overlayActive={isReviewingSubmit}
        title="New Foodstuff Purchase"
        visible={isFormVisible}
      >
        <MemberFoodPurchaseApplicationForm
          amount={amount}
          chargeOptions={foodPurchase?.chargeOptions ?? []}
          currencyCode={currencyCode}
          cycleId={cycleId}
          error={error}
          isLoading={isLoading}
          isStale={hasStaleFoodPurchase}
          isSubmitting={isSubmitting}
          itemDescription={itemDescription}
          maximumPaybackMonths={foodPurchase?.policy.maximumPaybackMonths ?? 0}
          openCycles={openCycles}
          paybackMonths={paybackMonths}
          requestNotes={requestNotes}
          requestedAmount={requestedAmount}
          requestedPaybackMonths={requestedPaybackMonths}
          setCycleId={setCycleId}
          setItemDescription={setItemDescription}
          setRequestNotes={setRequestNotes}
          setRequestedAmount={setRequestedAmount}
          setRequestedPaybackMonths={setRequestedPaybackMonths}
        />
      </FullScreenFormSheet>

      <SubmissionSuccessSheet
        description={
          success ?? "Your Foodstuff Purchase application has been sent."
        }
        onClose={() => setSuccess(null)}
        title="Application sent"
        visible={Boolean(success)}
      />

      <WorkflowDetailSheet
        onClose={() => setSelectedApplication(null)}
        onOpenNotifications={() => {
          setSelectedApplication(null)
          router.push("/notifications")
        }}
        onOpenReceipts={() => {
          setSelectedApplication(null)
          router.push("/(member)/receipts")
        }}
        rows={
          selectedApplication
            ? [
                {
                  detail: `Requested ${formatFoodPurchaseDate(
                    selectedApplication.requestedAt
                  )}`,
                  icon: "ShoppingBasket",
                  label: "Status",
                  value: formatFoodPurchaseStatus(selectedApplication.status),
                },
                {
                  detail: `${formatCount(
                    selectedApplication.requestedPaybackMonths,
                    "month"
                  )} payback request`,
                  icon: "CircleDollarSign",
                  label: "Requested amount",
                  value: formatFoodPurchaseCurrency(
                    selectedApplication.requestedAmount,
                    currencyCode
                  ),
                },
                {
                  detail: `${formatFoodPurchaseMonth(
                    selectedApplication.cycle.periodMonth
                  )} cycle · ${formatFoodPurchaseStatus(
                    selectedApplication.cycle.status
                  )}`,
                  icon: "CalendarClock",
                  label: "Cycle",
                  value: formatFoodPurchaseCurrency(
                    selectedApplication.cycle.releasedAmount,
                    currencyCode
                  ),
                },
                ...(selectedApplication.approvedAmount
                  ? [
                      {
                        detail: formatCount(
                          selectedApplication.approvedPaybackMonths ?? 0,
                          "approved month"
                        ),
                        icon: "BadgeCheck",
                        label: "Approved amount",
                        value: formatFoodPurchaseCurrency(
                          selectedApplication.approvedAmount,
                          currencyCode
                        ),
                      },
                    ]
                  : []),
                ...(selectedApplication.itemDescription ||
                selectedApplication.requestNotes
                  ? [
                      {
                        detail: selectedApplication.requestNotes ?? undefined,
                        icon: "ClipboardList",
                        label: "Items requested",
                        value:
                          selectedApplication.itemDescription ?? "Not listed",
                      },
                    ]
                  : []),
                ...(selectedApplication.reviewNotes
                  ? [
                      {
                        detail: selectedApplication.reviewNotes,
                        icon: "MessageSquareText",
                        label: "Review note",
                      },
                    ]
                  : []),
              ]
            : []
        }
        title="Application details"
        visible={Boolean(selectedApplication)}
      />
    </SafeArea>
  )
}
