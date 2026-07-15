import { CachedReadBanner } from "@/components/app/cached-read-banner"
import { EmptyState } from "@/components/app/empty-state"
import { FormStateBanner } from "@/components/app/form-state-banner"
import { SectionCard } from "@/components/app/section-card"
import { StatCard } from "@/components/app/stat-card"
import { getStatusBadgeTone, StatusBadge } from "@/components/app/status-badge"
import { SubmissionReviewSheet } from "@/components/app/submission-review-sheet"
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
  createMobileMemberSupportCase,
  getMobileMemberSupport,
  replyMobileMemberSupportCase,
  type MobileMemberSupport,
  type MobileSupportCategory,
} from "@/lib/mobile-home-api"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { isMockSessionToken } from "@/lib/session-store"
import { useRouter } from "expo-router"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ScrollView, View } from "react-native"

const supportCategories: {
  label: string
  value: MobileSupportCategory
}[] = [
  { label: "Payment", value: "payment_issue" },
  { label: "Account", value: "account_update" },
  { label: "Shares", value: "shares" },
  { label: "Financing", value: "financing" },
  { label: "Procurement", value: "procurement" },
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

export function SupportScreen() {
  const { profile } = useAuthContext()
  const colors = useColors()
  const router = useRouter()
  const [support, setSupport] = useState<MobileMemberSupport | null>(null)
  const [isLoading, setIsLoading] = useState(false)
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
  const [isReviewingSubmit, setIsReviewingSubmit] = useState(false)
  const canUseServerSupport = Boolean(
    profile?.role === "member" &&
    profile?.token &&
    !isMockSessionToken(profile.token)
  )
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
        detail: "Open, in progress, or waiting on member",
        label: "Open",
        value: String(support?.summary.openCases ?? 0),
      },
      {
        detail: "High or urgent open cases",
        label: "Priority",
        value: String(support?.summary.highPriorityOpenCases ?? 0),
      },
      {
        detail: "All member support cases",
        label: "Total",
        value: String(support?.summary.totalCases ?? 0),
      },
    ],
    [
      support?.summary.highPriorityOpenCases,
      support?.summary.openCases,
      support?.summary.totalCases,
    ]
  )
  const canSubmit = Boolean(
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

    void getMobileMemberSupport()
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
      await createMobileMemberSupportCase({
        category,
        description: description.trim(),
        moneyImpactRequested,
        subject: subject.trim(),
      })
      await clearSupportDraft()
      setSubject("")
      setDescription("")
      setMoneyImpactRequested(false)
      setSuccess("Support case submitted.")
      setIsReviewingSubmit(false)
      loadSupport()
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
      await replyMobileMemberSupportCase({
        message: replyMessage.trim(),
        supportCaseId: replyCaseId,
      })
      await clearSupportDraft()
      setReplyCaseId(null)
      setReplyMessage("")
      setSuccess("Support reply sent.")
      loadSupport()
    } catch {
      setError("Support reply could not be sent.")
    } finally {
      setIsReplying(false)
    }
  }

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-5">
        <Button
          className="h-10 self-start px-3"
          onPress={() => router.back()}
          variant="outline"
        >
          <Icon name="ArrowLeft" className="size-base text-foreground" />
          <Text>Back</Text>
        </Button>

        <View className="gap-2">
          <Text className="text-3xl font-black text-foreground">Support</Text>
          <Text className="text-base leading-6 text-muted-foreground">
            Open a member support case and track recent replies.
          </Text>
        </View>

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

            <View className="flex-row flex-wrap gap-3">
              {stats.map((item) => (
                <StatCard key={item.label} {...item} />
              ))}
            </View>

            <SectionCard icon="MessageCirclePlus" title="New support case">
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
                <Button
                  className="h-12"
                  disabled={!canSubmit || isSubmitting}
                  onPress={() => setIsReviewingSubmit(true)}
                >
                  <Icon
                    name="Send"
                    className="size-base text-primary-foreground"
                  />
                  <Text>{isSubmitting ? "Submitting" : "Submit case"}</Text>
                </Button>
              </View>
            </SectionCard>

            <SectionCard icon="Headphones" title="Recent cases">
              {isLoading ? (
                <LoadingSpinner />
              ) : (
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
                  keyExtractor={(supportCase) => supportCase.id}
                  maxHeight={640}
                  renderItem={({ item: supportCase }) => (
                    <View
                      className="gap-3 rounded-md bg-secondary p-3"
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
                          {formatStatus(supportCase.category)} -{" "}
                          {supportCase.messageCount} message(s) -{" "}
                          {formatDate(supportCase.lastActivityAt)}
                        </Text>
                      </View>
                      {supportCase.recentMessages.length ? (
                        <View className="gap-2 border-l-2 border-border pl-3">
                          {supportCase.recentMessages.map((message) => (
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
                          {supportCase.messageCount >
                          supportCase.recentMessages.length ? (
                            <Text className="text-xs text-muted-foreground">
                              Showing latest {supportCase.recentMessages.length}{" "}
                              of {supportCase.messageCount} messages
                            </Text>
                          ) : null}
                        </View>
                      ) : null}
                      {replyCaseId === supportCase.id ? (
                        <View className="gap-2">
                          <Textarea
                            editable={!hasStaleSupport && !isReplying}
                            onChangeText={setReplyMessage}
                            placeholder="Write a reply"
                            value={replyMessage}
                          />
                          <View className="flex-row gap-2">
                            <Button
                              className="h-10 flex-1"
                              disabled={!canReply || isReplying}
                              onPress={handleReply}
                            >
                              <Icon
                                name="Send"
                                className="size-base text-primary-foreground"
                              />
                              <Text>{isReplying ? "Sending" : "Send"}</Text>
                            </Button>
                            <Button
                              className="h-10 flex-1"
                              disabled={isReplying}
                              onPress={() => {
                                setReplyCaseId(null)
                                setReplyMessage("")
                              }}
                              variant="outline"
                            >
                              <Text>Cancel</Text>
                            </Button>
                          </View>
                        </View>
                      ) : (
                        <Button
                          className="h-10 self-start"
                          disabled={hasStaleSupport || isReplying}
                          onPress={() => {
                            setReplyCaseId(supportCase.id)
                            setReplyMessage("")
                            setError(null)
                            setSuccess(null)
                          }}
                          variant="outline"
                        >
                          <Icon
                            name="MessageSquareReply"
                            className="size-base"
                          />
                          <Text>Reply</Text>
                        </Button>
                      )}
                    </View>
                  )}
                />
              )}
            </SectionCard>
          </>
        ) : null}
      </ScrollView>
      <SubmissionReviewSheet
        description="Review this support case before sending it. Money-impact requests create a review trail; support does not silently mutate finance records."
        isSubmitting={isSubmitting}
        onClose={() => setIsReviewingSubmit(false)}
        onConfirm={handleCreateCase}
        rows={reviewRows}
        title="Review support case"
        visible={isReviewingSubmit}
      />
    </SafeArea>
  )
}
