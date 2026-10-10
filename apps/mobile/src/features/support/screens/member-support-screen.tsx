import { CachedReadBanner } from "@/components/app/cached-read-banner"
import { CompactFormSheet } from "@/components/app/compact-form-sheet"
import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { EmptyState } from "@/components/app/empty-state"
import { FormStateBanner } from "@/components/app/form-state-banner"
import { FullScreenFormSheet } from "@/components/app/full-screen-form-sheet"
import { SectionCard } from "@/components/app/section-card"
import { ScreenHeader } from "@/components/app/screen-header"
import { ScreenBackButton } from "@/components/app/screen-back-button"
import { getStatusBadgeTone, StatusBadge } from "@/components/app/status-badge"
import { SubmissionReviewSheet } from "@/components/app/submission-review-sheet"
import { SubmissionSuccessSheet } from "@/components/app/submission-success-sheet"
import { WorkflowDetailSheet } from "@/components/app/workflow-detail-sheet"
import { VirtualizedCardList } from "@/components/app/virtualized-card-list"
import { LoadingSpinner } from "@/components/loading-spinner"
import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import { useAuthContext } from "@/hooks/use-auth"
import { useColors } from "@/hooks/use-color"
import { useMobileFormDraft } from "@/hooks/use-mobile-form-draft"
import {
  createMemberSupportCase,
  getMemberSupport,
  getMemberSupportDetail,
  replyMemberSupportCase,
} from "../api/member-support-api"
import type {
  MobileMemberSupport,
  MobileSupportCase,
  MobileSupportCategory,
} from "../model/member-support-types"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { formatMobileRecordDetail } from "@/lib/mobile-metrics"
import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import { mobileDevQuickFill } from "@/dev/mobile-dev-quick-fill"
import { NotificationDestinationNotice } from "@/features/notifications/public/notification-destination-notice"
import { useRouter } from "expo-router"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Keyboard, ScrollView, View } from "react-native"

const supportCategories: {
  label: string
  value: MobileSupportCategory
}[] = [
  { label: "Payment", value: "payment_issue" },
  { label: "Account", value: "account_update" },
  { label: "Shares", value: "shares" },
  { label: "Financing", value: "financing" },
  { label: "Procurement", value: "procurement" },
  { label: "Feature request", value: "feature_request" },
  { label: "Technical", value: "technical" },
  { label: "Other", value: "other" },
]

function formatStatus(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value))
}

function formatMessageAuthor(input: {
  authorName: string | null
  authorType: string
}) {
  if (input.authorType === "member") return "You"
  if (input.authorName) return input.authorName

  return formatStatus(input.authorType)
}

function normalizeMessage(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase()
}

function formatFinancialReviewLabel(status: string) {
  return status === "not_required"
    ? "Finance boundary · No correction required"
    : `Money-impact review · ${formatStatus(status)}`
}

export function SupportScreen({
  initialEntityId = null,
}: {
  initialEntityId?: string | null
}) {
  const { profile } = useAuthContext()
  const colors = useColors()
  const router = useRouter()
  const [support, setSupport] = useState<MobileMemberSupport | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isLoadingDetailId, setIsLoadingDetailId] = useState<string | null>(
    null
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [replyCaseId, setReplyCaseId] = useState<string | null>(null)
  const [replyMessage, setReplyMessage] = useState("")
  const [isReplying, setIsReplying] = useState(false)
  const [category, setCategory] =
    useState<MobileSupportCategory>("payment_issue")
  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")
  const [moneyImpactRequested, setMoneyImpactRequested] = useState(false)
  const [isCreateFormVisible, setIsCreateFormVisible] = useState(false)
  const [isReplyFormVisible, setIsReplyFormVisible] = useState(false)
  const [isReviewingSubmit, setIsReviewingSubmit] = useState(false)
  const queuedCreateSuccessRef = useRef<string | null>(null)
  const handledNotificationEntityRef = useRef<string | null>(null)
  const [notificationCase, setNotificationCase] =
    useState<MobileSupportCase | null>(null)
  const [isDestinationUnavailable, setIsDestinationUnavailable] =
    useState(false)
  const queuedReplySuccessRef = useRef<string | null>(null)
  const canUseServerSupport = canUseMobileFeatureData(profile, "member")
  const hasStaleSupport = isMobileReadCacheStale(support?.cache)
  const supportDraft = useMemo(
    () => ({
      category,
      description,
      moneyImpactRequested,
      replyCaseId,
      replyMessage,
      subject,
    }),
    [
      category,
      description,
      moneyImpactRequested,
      replyCaseId,
      replyMessage,
      subject,
    ]
  )
  const clearSupportDraft = useMobileFormDraft({
    enabled: canUseServerSupport,
    key: "member.support.forms",
    onHydrate: (draft) => {
      setCategory(draft.category)
      setSubject(draft.subject)
      setDescription(draft.description)
      setMoneyImpactRequested(draft.moneyImpactRequested)
      setReplyCaseId(draft.replyCaseId)
      setReplyMessage(draft.replyMessage)
    },
    value: supportDraft,
  })
  const stats = useMemo(
    () => [
      {
        label: "Open",
        value: support ? String(support.summary.openCases) : "—",
      },
      {
        label: "Priority",
        value: support ? String(support.summary.highPriorityOpenCases) : "—",
      },
      {
        label: "All cases",
        value: support ? String(support.summary.totalCases) : "—",
      },
    ],
    [
      support?.summary.highPriorityOpenCases,
      support?.summary.openCases,
      support?.summary.totalCases,
    ]
  )
  const canSubmit = Boolean(
    support?.canCreateCase &&
    subject.trim().length >= 3 &&
    description.trim().length >= 5 &&
    !hasStaleSupport
  )
  const canReply = Boolean(
    replyCaseId && replyMessage.trim().length >= 2 && !hasStaleSupport
  )
  const hasSupportDraft = Boolean(
    subject.trim() ||
    description.trim() ||
    moneyImpactRequested ||
    replyMessage.trim()
  )
  const reviewRows = [
    {
      detail:
        supportCategories.find((item) => item.value === category)?.label ??
        "Support",
      icon: "Headphones",
      label: subject.trim() || "Support case",
      value: moneyImpactRequested ? "Finance review" : "General",
    },
    {
      detail: "Support can route review, not silently change balances.",
      icon: "BadgeDollarSign",
      label: "Money impact",
      value: moneyImpactRequested ? "Requested" : "Not requested",
    },
  ]

  const loadSupport = useCallback(() => {
    let mounted = true

    if (!canUseServerSupport) {
      setSupport(null)
      setError(null)
      setIsLoading(false)

      return () => {
        mounted = false
      }
    }

    setIsLoading(true)
    setError(null)

    void getMemberSupport()
      .then((response) => {
        if (mounted) {
          setSupport(response)
        }
      })
      .catch(() => {
        if (mounted) {
          setError("Support cases are unavailable.")
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
  }, [canUseServerSupport])

  useEffect(() => loadSupport(), [loadSupport])

  useEffect(() => {
    if (
      !initialEntityId ||
      !canUseServerSupport ||
      handledNotificationEntityRef.current === initialEntityId
    ) {
      return
    }

    handledNotificationEntityRef.current = initialEntityId
    let mounted = true
    setIsDestinationUnavailable(false)
    void getMemberSupportDetail(initialEntityId)
      .then((detail) => {
        if (mounted) setNotificationCase(detail)
      })
      .catch(() => {
        if (mounted) setIsDestinationUnavailable(true)
      })

    return () => {
      mounted = false
    }
  }, [canUseServerSupport, initialEntityId])

  async function handleLoadMore() {
    const cursor = support?.nextCursor
    if (!cursor || isLoadingMore) return

    setIsLoadingMore(true)
    setError(null)
    try {
      const response = await getMemberSupport(cursor)
      setSupport((current) => {
        if (!current) return response
        const casesById = new Map(current.cases.map((item) => [item.id, item]))
        response.cases.forEach((item) => casesById.set(item.id, item))
        return {
          ...response,
          cases: Array.from(casesById.values()),
          summary: current.summary,
        }
      })
    } catch {
      setError("More support cases could not be loaded.")
    } finally {
      setIsLoadingMore(false)
    }
  }

  async function handleOpenReply(supportCaseId: string) {
    if (hasStaleSupport || isLoadingDetailId) return

    setError(null)
    setSuccess(null)
    setIsLoadingDetailId(supportCaseId)
    try {
      const detail = await getMemberSupportDetail(supportCaseId)
      setSupport((current) =>
        current
          ? {
              ...current,
              cases: current.cases.map((item) =>
                item.id === detail.id ? detail : item
              ),
            }
          : current
      )
      setReplyCaseId(supportCaseId)
      setReplyMessage("")
      setIsReplyFormVisible(true)
    } catch {
      setError("Support case details could not be loaded.")
    } finally {
      setIsLoadingDetailId(null)
    }
  }

  async function handleCreateCase() {
    if (hasStaleSupport) {
      setError("Refresh support data before submitting a case.")
      return
    }

    if (!canSubmit || isSubmitting) return

    setError(null)
    setSuccess(null)
    setIsSubmitting(true)

    try {
      await createMemberSupportCase({
        category,
        description: description.trim(),
        moneyImpactRequested,
        subject: subject.trim(),
      })
      await clearSupportDraft()
      queuedCreateSuccessRef.current = "Support case submitted."
      setIsReviewingSubmit(false)
    } catch {
      setError("Support case could not be submitted.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleReply() {
    if (hasStaleSupport) {
      setError("Refresh support data before replying.")
      return
    }

    if (!canReply || !replyCaseId || isReplying) return

    setError(null)
    setSuccess(null)
    setIsReplying(true)

    try {
      await replyMemberSupportCase({
        message: replyMessage.trim(),
        supportCaseId: replyCaseId,
      })
      await clearSupportDraft()
      queuedReplySuccessRef.current = "Support reply sent."
      setIsReplyFormVisible(false)
    } catch {
      setError("Support reply could not be sent.")
    } finally {
      setIsReplying(false)
    }
  }

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-5">
        <ScreenHeader
          leading={<ScreenBackButton onPress={() => router.back()} />}
          title="Support"
        />

        {isDestinationUnavailable ? (
          <NotificationDestinationNotice
            onDismiss={() => setIsDestinationUnavailable(false)}
          />
        ) : null}

        {!canUseServerSupport ? (
          <SectionCard icon="Headphones" title="Support">
            <Text className="text-sm leading-5 text-muted-foreground">
              Sign in with a production member account to create and track
              support cases.
            </Text>
          </SectionCard>
        ) : null}

        {canUseServerSupport ? (
          <>
            <CachedReadBanner cache={support?.cache} label="support data" />

            <View className="flex-row border-y border-border">
              {stats.map((item, index) => (
                <View
                  accessibilityLabel={`${item.label}: ${item.value}`}
                  className={
                    index === 0
                      ? "min-w-0 flex-1 gap-1 py-3 pr-3"
                      : "min-w-0 flex-1 gap-1 border-l border-border px-3 py-3"
                  }
                  key={item.label}
                >
                  <Text
                    className="text-[10px] font-extrabold tracking-[0.45px] text-muted-foreground uppercase"
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                  <Text className="text-xl font-extrabold text-foreground">
                    {item.value}
                  </Text>
                </View>
              ))}
            </View>

            {support?.canCreateCase ? (
              <>
                <Button
                  accessibilityHint="Opens a keyboard-safe support form"
                  className="h-12"
                  onPress={() => setIsCreateFormVisible(true)}
                >
                  <Icon
                    name="MessageCirclePlus"
                    className="size-base text-primary-foreground"
                  />
                  <Text>
                    {hasSupportDraft
                      ? "Continue support case"
                      : "New support case"}
                  </Text>
                </Button>
                <FullScreenFormSheet
                  dirty={hasSupportDraft}
                  footer={
                    <View className="flex-row items-center gap-3">
                      {!hasSupportDraft ? (
                        <DevQuickFill
                          label="Quick fill support case"
                          onPress={() => {
                            setCategory("payment_issue")
                            setSubject(mobileDevQuickFill.support.subject)
                            setDescription(
                              mobileDevQuickFill.support.description
                            )
                            setMoneyImpactRequested(false)
                          }}
                          placement="footer"
                          portal={false}
                        />
                      ) : null}
                      <Button
                        className="h-12 flex-1"
                        disabled={!canSubmit || isSubmitting}
                        onPress={() => {
                          Keyboard.dismiss()
                          setIsReviewingSubmit(true)
                        }}
                      >
                        <Icon
                          name="Send"
                          className="size-base text-primary-foreground"
                        />
                        <Text>
                          {isSubmitting ? "Submitting" : "Review case"}
                        </Text>
                      </Button>
                    </View>
                  }
                  isSubmitting={isSubmitting}
                  onClose={() => setIsCreateFormVisible(false)}
                  onDismissed={() => {
                    if (!queuedCreateSuccessRef.current) return
                    setSuccess(queuedCreateSuccessRef.current)
                    queuedCreateSuccessRef.current = null
                  }}
                  overlay={
                    <SubmissionReviewSheet
                      description="Review this support case before sending it. Money-impact requests create a review trail; support does not silently mutate finance records."
                      isSubmitting={isSubmitting}
                      onClose={() => setIsReviewingSubmit(false)}
                      onConfirm={handleCreateCase}
                      onDismissed={() => {
                        if (!queuedCreateSuccessRef.current) return
                        setSubject("")
                        setDescription("")
                        setMoneyImpactRequested(false)
                        setIsCreateFormVisible(false)
                        loadSupport()
                      }}
                      rows={reviewRows}
                      title="Review support case"
                      visible={isReviewingSubmit}
                    />
                  }
                  title="New support case"
                  visible={isCreateFormVisible}
                >
                  <View className="gap-3">
                    <FormStateBanner
                      hasDraft={hasSupportDraft}
                      isStale={hasStaleSupport}
                    />
                    <View className="flex-row flex-wrap gap-2">
                      {supportCategories.map((item) => {
                        const isActive = item.value === category

                        return (
                          <Button
                            className="h-10"
                            key={item.value}
                            onPress={() => setCategory(item.value)}
                            variant={isActive ? "secondary" : "outline"}
                          >
                            <Text>{item.label}</Text>
                          </Button>
                        )
                      })}
                    </View>
                    <View className="gap-2">
                      <Text className="text-sm font-semibold text-foreground">
                        Subject
                      </Text>
                      <Input
                        accessibilityLabel="Support case subject"
                        editable={!isSubmitting}
                        onChangeText={setSubject}
                        placeholder="Subject"
                        value={subject}
                      />
                    </View>
                    <View className="gap-2">
                      <Text className="text-sm font-semibold text-foreground">
                        Description
                      </Text>
                      <Textarea
                        accessibilityLabel="Support case description"
                        editable={!isSubmitting}
                        onChangeText={setDescription}
                        placeholder="Describe what you need help with"
                        value={description}
                      />
                    </View>
                    <Button
                      className="h-11 justify-start"
                      disabled={isSubmitting}
                      onPress={() => setMoneyImpactRequested((value) => !value)}
                      variant={moneyImpactRequested ? "secondary" : "outline"}
                    >
                      <Icon name="BadgeDollarSign" className="size-base" />
                      <Text>
                        {moneyImpactRequested
                          ? "Money-impact review requested"
                          : "Request money-impact review"}
                      </Text>
                    </Button>
                    {error ? (
                      <Text className="text-sm font-medium text-destructive">
                        {error}
                      </Text>
                    ) : null}
                    {success ? (
                      <Text className="text-success text-sm font-medium">
                        {success}
                      </Text>
                    ) : null}
                  </View>
                </FullScreenFormSheet>
              </>
            ) : support ? (
              <View className="gap-1 border-y border-border py-4">
                <Text className="font-semibold text-foreground">
                  New support cases are unavailable
                </Text>
                <Text className="text-sm leading-5 text-muted-foreground">
                  Your cooperative currently keeps existing conversations
                  readable but does not allow new member cases.
                </Text>
              </View>
            ) : null}

            <View className="gap-3">
              <View className="flex-row items-baseline justify-between gap-3">
                <Text className="text-lg font-extrabold text-foreground">
                  Cases
                </Text>
                <Text className="text-xs font-semibold text-muted-foreground">
                  {support
                    ? `${support.summary.totalCases} ${support.summary.totalCases === 1 ? "case" : "cases"}`
                    : isLoading
                      ? "Loading"
                      : "Unavailable"}
                </Text>
              </View>
              {isLoading ? (
                <LoadingSpinner />
              ) : !support ? (
                <View className="items-center gap-4 py-8">
                  <EmptyState
                    description="Support records could not be loaded."
                    icon="Headphones"
                    title="Support unavailable"
                  />
                  <Button onPress={loadSupport} variant="outline">
                    <Text>Try again</Text>
                  </Button>
                </View>
              ) : (
                <>
                  <VirtualizedCardList
                    data={support?.cases ?? []}
                    empty={
                      <EmptyState
                        description="Questions, receipt issues, and finance-boundary support cases will appear here."
                        icon="Headphones"
                        title="No support cases"
                      />
                    }
                    estimatedItemSize={240}
                    inline
                    keyExtractor={(supportCase) => supportCase.id}
                    maxHeight={640}
                    renderItem={({ item: supportCase }) => {
                      const visibleRecentMessages =
                        supportCase.recentMessages.filter(
                          (message) =>
                            normalizeMessage(message.message) !==
                            normalizeMessage(supportCase.detail)
                        )
                      const earlierMessageCount = Math.max(
                        0,
                        supportCase.messageCount - 1
                      )

                      return (
                        <View
                          className="gap-3 border-b border-border pb-4"
                          key={supportCase.id}
                        >
                          <View className="gap-1">
                            <View className="flex-row items-start justify-between gap-3">
                              <Text className="flex-1 font-semibold text-foreground">
                                {supportCase.subject}
                              </Text>
                              <StatusBadge
                                label={formatStatus(supportCase.status)}
                                tone={getStatusBadgeTone(supportCase.status)}
                              />
                            </View>
                            <Text className="text-sm leading-5 text-muted-foreground">
                              {supportCase.detail}
                            </Text>
                            <Text className="text-xs text-muted-foreground">
                              {formatStatus(supportCase.category)} ·{" "}
                              {supportCase.messageCount}{" "}
                              {supportCase.messageCount === 1
                                ? "message"
                                : "messages"}{" "}
                              · {formatDate(supportCase.lastActivityAt)}
                            </Text>
                          </View>
                          {visibleRecentMessages.length ? (
                            <View className="gap-2 border-l-2 border-border pl-3">
                              {visibleRecentMessages.map((message) => (
                                <View className="gap-1" key={message.id}>
                                  <Text className="text-xs font-medium text-muted-foreground">
                                    {formatMessageAuthor(message)} -{" "}
                                    {formatDate(message.createdAt)}
                                  </Text>
                                  <Text className="text-sm leading-5 text-foreground">
                                    {message.message}
                                  </Text>
                                  {message.attachmentUrl ? (
                                    <Text className="text-xs text-muted-foreground">
                                      Attachment available
                                    </Text>
                                  ) : null}
                                </View>
                              ))}
                              {earlierMessageCount >
                              visibleRecentMessages.length ? (
                                <Text className="text-xs text-muted-foreground">
                                  Showing {visibleRecentMessages.length} of{" "}
                                  {earlierMessageCount} earlier messages
                                </Text>
                              ) : null}
                            </View>
                          ) : null}
                          {supportCase.linkedRecordType &&
                          supportCase.linkedRecordId ? (
                            <Text
                              accessibilityLabel={`Linked ${formatStatus(supportCase.linkedRecordType)} ${supportCase.linkedRecordId}`}
                              className="text-xs font-medium text-muted-foreground"
                            >
                              Linked{" "}
                              {formatStatus(supportCase.linkedRecordType)} ·{" "}
                              {formatMobileRecordDetail(
                                supportCase.linkedRecordId
                              )}
                            </Text>
                          ) : null}
                          {supportCase.moneyImpactRequested ||
                          supportCase.requiresFinancialAdjustment ? (
                            <View className="border-warn gap-1 border-l-2 pl-3">
                              <Text className="text-sm font-semibold text-foreground">
                                {formatFinancialReviewLabel(
                                  supportCase.financialAdjustmentApprovalStatus
                                )}
                              </Text>
                              <Text className="text-xs leading-5 text-muted-foreground">
                                Support records governance evidence only. Any
                                balance correction requires a separate
                                authorized finance workflow.
                              </Text>
                              {supportCase.financialAdjustmentApprovalNotes ? (
                                <Text className="text-xs leading-5 text-muted-foreground">
                                  {supportCase.financialAdjustmentApprovalNotes}
                                </Text>
                              ) : null}
                            </View>
                          ) : null}
                          {supportCase.resolutionSummary ? (
                            <View className="border-success gap-1 border-l-2 pl-3">
                              <Text className="text-sm font-semibold text-foreground">
                                Resolution
                              </Text>
                              <Text className="text-sm leading-5 text-muted-foreground">
                                {supportCase.resolutionSummary}
                              </Text>
                            </View>
                          ) : null}
                          {replyCaseId === supportCase.id ? (
                            <>
                              <Button
                                className="h-10 self-start"
                                disabled={hasStaleSupport || isReplying}
                                onPress={() => setIsReplyFormVisible(true)}
                                variant="outline"
                              >
                                <Icon
                                  name="MessageSquareReply"
                                  className="size-base"
                                />
                                <Text>Continue reply</Text>
                              </Button>
                              <CompactFormSheet
                                dirty={Boolean(replyMessage.trim())}
                                isSubmitting={isReplying}
                                onClose={() => setIsReplyFormVisible(false)}
                                onDismissed={() => {
                                  if (!queuedReplySuccessRef.current) return
                                  setReplyCaseId(null)
                                  setReplyMessage("")
                                  setSuccess(queuedReplySuccessRef.current)
                                  queuedReplySuccessRef.current = null
                                  loadSupport()
                                }}
                                title="Reply to support case"
                                visible={isReplyFormVisible}
                              >
                                <Textarea
                                  accessibilityLabel="Support reply"
                                  editable={!hasStaleSupport && !isReplying}
                                  onChangeText={setReplyMessage}
                                  placeholder="Write a reply"
                                  value={replyMessage}
                                />
                                <View className="flex-row items-center gap-3">
                                  {!replyMessage.trim() ? (
                                    <DevQuickFill
                                      label="Quick fill reply"
                                      onPress={() =>
                                        setReplyMessage(
                                          mobileDevQuickFill.support.reply
                                        )
                                      }
                                      placement="footer"
                                      portal={false}
                                    />
                                  ) : null}
                                  <Button
                                    className="h-11 flex-1"
                                    disabled={!canReply || isReplying}
                                    onPress={handleReply}
                                  >
                                    <Icon
                                      name="Send"
                                      className="size-base text-primary-foreground"
                                    />
                                    <Text>
                                      {isReplying ? "Sending" : "Send reply"}
                                    </Text>
                                  </Button>
                                </View>
                              </CompactFormSheet>
                            </>
                          ) : (
                            <Button
                              className="h-10 self-start"
                              disabled={
                                hasStaleSupport ||
                                Boolean(isLoadingDetailId) ||
                                isReplying ||
                                supportCase.status === "closed"
                              }
                              onPress={() =>
                                void handleOpenReply(supportCase.id)
                              }
                              variant="outline"
                            >
                              <Icon
                                name="MessageSquareReply"
                                className="size-base"
                              />
                              <Text>
                                {isLoadingDetailId === supportCase.id
                                  ? "Loading"
                                  : supportCase.status === "closed"
                                    ? "Closed"
                                    : "Reply"}
                              </Text>
                            </Button>
                          )}
                        </View>
                      )
                    }}
                  />
                  {support?.nextCursor ? (
                    <Button
                      className="mt-4 h-11"
                      disabled={isLoadingMore}
                      onPress={handleLoadMore}
                      variant="outline"
                    >
                      <Text>
                        {isLoadingMore ? "Loading" : "Load more cases"}
                      </Text>
                    </Button>
                  ) : null}
                </>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
      <SubmissionSuccessSheet
        description={success ?? "Your support action completed."}
        onClose={() => setSuccess(null)}
        title={success?.includes("reply") ? "Reply sent" : "Support case sent"}
        visible={Boolean(success)}
      />
      <WorkflowDetailSheet
        onClose={() => setNotificationCase(null)}
        rows={
          notificationCase
            ? [
                {
                  detail: `Updated ${formatDate(notificationCase.lastActivityAt)}`,
                  icon: "Headphones",
                  label: "Status",
                  value: formatStatus(notificationCase.status),
                },
                {
                  detail: formatStatus(notificationCase.category),
                  icon: "MessageSquareText",
                  label: "Case",
                  value: notificationCase.subject,
                },
                {
                  detail: notificationCase.detail,
                  icon: "FileText",
                  label: "Request",
                },
                ...(notificationCase.resolutionSummary
                  ? [
                      {
                        detail: notificationCase.resolutionSummary,
                        icon: "CircleCheck",
                        label: "Resolution",
                      },
                    ]
                  : []),
              ]
            : []
        }
        title={notificationCase?.subject ?? "Support case"}
        visible={Boolean(notificationCase)}
      />
    </SafeArea>
  )
}
