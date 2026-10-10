import { CompactFormSheet } from "@/components/app/compact-form-sheet"
import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { EmptyState } from "@/components/app/empty-state"
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
import { mobileDevQuickFill } from "@/dev/mobile-dev-quick-fill"
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
import { ScrollView, View } from "react-native"
import { MemberGuarantorApprovalRow } from "../components/member-guarantor-approval-row"
import { MemberGuarantorResponseForm } from "../components/member-guarantor-response-form"
import { MemberGuarantorSummary } from "../components/member-guarantor-summary"
import { useMemberGuarantorApprovalsController } from "../hooks/use-member-guarantor-approvals-controller"

export function GuarantorApprovalsScreen({
  initialEntityId = null,
  qaState = null,
}: {
  initialEntityId?: string | null
  qaState?: MobileMemberCooperativeServiceQaState | null
}) {
  const router = useRouter()
  const largeTextLayout = useLargeTextLayout()
  const controller = useMemberGuarantorApprovalsController({
    initialEntityId,
    qaState,
  })
  const {
    canUseServerApprovals,
    changeResponseNote,
    closeDetail,
    closeResponse,
    closeReview,
    currencyCode,
    detailApproval,
    detailRows,
    dismissDestinationUnavailable,
    error,
    handleResponseDismissed,
    handleReviewDismissed,
    hasDraft,
    hasStaleApprovals,
    isActionBlocked,
    isDestinationUnavailable,
    isLoading,
    isResponseVisible,
    openDetail,
    openResponse,
    pendingApprovals,
    pendingDecision,
    queueDecision,
    quickFill,
    refresh,
    resolvedApprovals,
    responseError,
    responseNote,
    responseRestriction,
    reviewRows,
    selectedApproval,
    setSuccess,
    snapshot,
    submitDecision,
    submittingApprovalId,
    success,
  } = controller

  return (
    <SafeArea className="bg-background">
      <ScrollView
        className="bg-background"
        contentContainerClassName="gap-5 px-5 pt-5 pb-8"
        style={{ flex: 1 }}
      >
        <ScreenHeader
          leading={<ScreenBackButton onPress={() => router.back()} />}
          title="Guarantor approvals"
        />

        {isDestinationUnavailable ? (
          <NotificationDestinationNotice
            onDismiss={dismissDestinationUnavailable}
          />
        ) : null}

        {!canUseServerApprovals ? (
          <View className="flex-row gap-3 border-y border-border py-4">
            <View className="size-10 items-center justify-center rounded-full bg-accent">
              <Icon className="size-sm text-accent-foreground" name="Info" />
            </View>
            <Text className="min-w-0 flex-1 text-sm leading-5 text-muted-foreground">
              Sign in with a member account to review guarantor requests.
            </Text>
          </View>
        ) : null}

        {canUseServerApprovals ? (
          <>
            {hasStaleApprovals ? (
              <CooperativeServiceFreshness
                cache={snapshot?.cache}
                label="guarantor approvals"
                onRefresh={refresh}
              />
            ) : null}

            {error ? (
              <CooperativeServiceStateNotice
                actionLabel="Try again"
                description={error}
                onAction={refresh}
                title="Guarantor approvals couldn’t load"
                tone="danger"
              />
            ) : null}

            {isLoading && !snapshot ? <LoadingSpinner /> : null}

            {snapshot ? (
              <>
                <MemberGuarantorSummary
                  approved={snapshot.summary.approvedApprovals}
                  pending={snapshot.summary.pendingApprovals}
                  rejected={snapshot.summary.rejectedApprovals}
                />

                {snapshot.state !== "available" ? (
                  <CooperativeServiceStateNotice
                    description={
                      snapshot.state === "member_profile_missing"
                        ? "Link your member profile before reviewing requests."
                        : "Try again when the cooperative service is restored."
                    }
                    title="Approval data unavailable"
                  />
                ) : null}

                {responseRestriction ? (
                  <CooperativeServiceStateNotice
                    description={responseRestriction}
                    title="Responses unavailable"
                  />
                ) : null}

                {snapshot.approvals.length === 0 ? (
                  <View className="border-y border-border">
                    <EmptyState
                      className="min-h-[180px]"
                      description="Requests that name you as guarantor will appear here."
                      icon="ShieldCheck"
                      title="No requests"
                    />
                  </View>
                ) : null}

                {pendingApprovals.length ? (
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
                        Needs your response
                      </Text>
                      <Text className="text-sm font-semibold text-muted-foreground">
                        Newest first
                      </Text>
                    </View>
                    <VirtualizedCardList
                      data={pendingApprovals}
                      empty={null}
                      estimatedItemSize={largeTextLayout ? 360 : 250}
                      keyExtractor={(approval) => approval.id}
                      maxHeight={largeTextLayout ? 720 : 560}
                      renderItem={({ index, item: approval }) => (
                        <MemberGuarantorApprovalRow
                          approval={approval}
                          currencyCode={currencyCode}
                          isActionBlocked={isActionBlocked}
                          isFirst={index === 0}
                          isSubmitting={submittingApprovalId === approval.id}
                          onOpenDetail={() => openDetail(approval)}
                          onOpenResponse={() => openResponse(approval.id)}
                        />
                      )}
                    />
                  </View>
                ) : null}

                {resolvedApprovals.length ? (
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
                        Resolved
                      </Text>
                      <Text className="text-sm font-semibold text-muted-foreground">
                        {formatCount(resolvedApprovals.length, "request")}
                      </Text>
                    </View>
                    <VirtualizedCardList
                      data={resolvedApprovals}
                      empty={null}
                      estimatedItemSize={largeTextLayout ? 176 : 96}
                      keyExtractor={(approval) => approval.id}
                      maxHeight={largeTextLayout ? 560 : 440}
                      renderItem={({ index, item: approval }) => (
                        <MemberGuarantorApprovalRow
                          approval={approval}
                          currencyCode={currencyCode}
                          isActionBlocked
                          isFirst={index === 0}
                          isSubmitting={false}
                          onOpenDetail={() => openDetail(approval)}
                          onOpenResponse={() => openResponse(approval.id)}
                        />
                      )}
                    />
                  </View>
                ) : null}
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      <CompactFormSheet
        dirty={hasDraft}
        footer={
          <View
            className={cn(
              "gap-2 px-5 pt-3 pb-5",
              largeTextLayout ? "items-stretch" : "flex-row"
            )}
          >
            <Button
              className={cn(
                "min-h-11 py-2",
                largeTextLayout ? "w-full" : "flex-1"
              )}
              disabled={!selectedApproval || isActionBlocked}
              onPress={() => queueDecision("rejected")}
              variant="outline"
            >
              <Icon className="size-base text-foreground" name="X" />
              <Text>Reject</Text>
            </Button>
            <Button
              className={cn(
                "min-h-11 py-2",
                largeTextLayout ? "w-full" : "flex-1"
              )}
              disabled={!selectedApproval || isActionBlocked}
              onPress={() => queueDecision("approved")}
            >
              <Icon
                className="size-base text-primary-foreground"
                name="Check"
              />
              <Text>Approve</Text>
            </Button>
          </View>
        }
        isSubmitting={Boolean(submittingApprovalId)}
        onClose={closeResponse}
        onDismissed={handleResponseDismissed}
        overlay={
          selectedApproval && !responseNote.trim() ? (
            <DevQuickFill
              bottomOffset={82}
              label="Quick fill guarantor response note"
              onPress={() => quickFill(mobileDevQuickFill.guarantor.notes)}
              portal={false}
            />
          ) : undefined
        }
        title="Respond to request"
        visible={isResponseVisible}
      >
        <MemberGuarantorResponseForm
          approval={selectedApproval}
          currencyCode={currencyCode}
          disabled={isActionBlocked}
          error={responseError}
          note={responseNote}
          onChangeNote={changeResponseNote}
        />
      </CompactFormSheet>

      <SubmissionReviewSheet
        confirmLabel={
          pendingDecision?.decision === "approved" ? "Approve" : "Reject"
        }
        isSubmitting={Boolean(submittingApprovalId)}
        onClose={closeReview}
        onConfirm={() => void submitDecision()}
        onDismissed={handleReviewDismissed}
        rows={reviewRows}
        title="Review response"
        visible={Boolean(pendingDecision)}
      />

      <SubmissionSuccessSheet
        description={success ?? "Your guarantor response has been saved."}
        onClose={() => setSuccess(null)}
        title="Response saved"
        visible={Boolean(success)}
      />

      <WorkflowDetailSheet
        onClose={closeDetail}
        rows={detailRows}
        title="Guarantor request"
        visible={Boolean(detailApproval)}
      />
    </SafeArea>
  )
}
