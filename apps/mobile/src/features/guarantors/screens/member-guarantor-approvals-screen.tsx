import { AppList } from "@/components/app/app-list"
import { EmptyState } from "@/components/app/empty-state"
import { ScreenHeaderButton } from "@/components/app/screen-shell"
import { ListCard, rowPosition } from "@/components/ui/list-card"
import { SectionHeader } from "@/components/ui/section-header"
import { StatusBanner } from "@/components/ui/status-banner"
import { Text } from "@/components/ui/text"
import type { MobileMemberCooperativeServiceQaState } from "@/features/member-cooperative-services/public/member-cooperative-service-qa-state"
import { NotificationDestinationNotice } from "@/features/notifications/public/notification-destination-notice"
import { useAuthContext } from "@/hooks/use-auth"
import { useRouter } from "expo-router"
import { useEffect } from "react"
import { BackHandler, StyleSheet, View } from "react-native"
import Animated, { FadeIn, SlideInRight } from "react-native-reanimated"
import {
  GuarantorDecisionCard,
  GuarantorHistoryRow,
} from "../components/member-guarantor-approval-row"
import { MemberGuarantorDetail } from "../components/member-guarantor-detail"
import {
  GuarantorDecisionResult,
  GuarantorDecisionSheets,
} from "../components/member-guarantor-response-form"
import {
  type GuarantorQaOutcome,
  useMemberGuarantorApprovalsController,
} from "../hooks/use-member-guarantor-approvals-controller"
import type { MobileGuarantorRequest } from "../model/member-guarantor-types"

type ListItem = MobileGuarantorRequest | "answered"

// Reanimated entering styles can replace className styles on the same view.
const styles = { fullScreenOverlay: StyleSheet.absoluteFill }

export function GuarantorApprovalsScreen({
  initialEntityId = null,
  qaHistory = false,
  qaOutcome = null,
  qaState = null,
}: {
  initialEntityId?: string | null
  qaHistory?: boolean
  qaOutcome?: GuarantorQaOutcome | null
  qaState?: MobileMemberCooperativeServiceQaState | null
}) {
  const router = useRouter()
  const { profile } = useAuthContext()
  const controller = useMemberGuarantorApprovalsController({
    initialEntityId,
    qaHistory,
    qaOutcome,
    qaState,
  })
  const {
    closeDetail,
    closeFlow,
    detail,
    flow,
    offline,
    rows,
    snapshot,
    stale,
  } = controller
  const result =
    flow?.phase === "success" ||
    flow?.phase === "conflict" ||
    flow?.phase === "error"
  const pending = rows.filter((row) => row.status === "pending")
  const answered = rows.filter((row) => row.status !== "pending")
  const data: ListItem[] = answered.length
    ? [...pending, "answered", ...answered]
    : pending
  const pendingCount =
    qaHistory || controller.search
      ? pending.length
      : (snapshot?.summary.pendingApprovals ?? 0)
  const answeredCount =
    qaHistory || controller.search
      ? answered.length
      : (snapshot?.summary.totalApprovals ?? 0) - pendingCount
  const savedAt = snapshot?.cache?.cachedAt
  const savedTime = savedAt
    ? new Date(savedAt).toLocaleTimeString("en-NG", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null
  const responseRestriction = offline
    ? "Connect to answer"
    : stale
      ? "Refresh to answer"
      : (controller.restriction ?? undefined)
  const showingRequests =
    snapshot?.state === "available" && Boolean(data.length)
  const hasOverlay = Boolean(detail || result)

  useEffect(() => {
    if (!hasOverlay || flow?.phase === "note" || flow?.phase === "confirm")
      return
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      if (result) closeFlow()
      else closeDetail()
      return true
    })
    return () => listener.remove()
  }, [closeDetail, closeFlow, flow?.phase, hasOverlay, result])

  return (
    <View className="flex-1">
      <View
        accessibilityElementsHidden={hasOverlay}
        className="flex-1"
        importantForAccessibility={hasOverlay ? "no-hide-descendants" : "auto"}
      >
        <AppList
          back={false}
          data={data}
          estimatedItemSize={152}
          extraData={JSON.stringify([
            controller.blocked,
            controller.currencyCode,
            responseRestriction,
            answeredCount,
            data.length,
          ])}
          fixedHeader={
            <View className="min-h-[44px] flex-row items-center px-[12px]">
              <ScreenHeaderButton
                accessibilityLabel="Go back"
                icon="ChevronLeft"
                onPress={() => {
                  if (router.canGoBack()) router.back()
                  else router.replace("/(member)/(tabs)")
                }}
              />
            </View>
          }
          header={
            <View className="gap-[12px]">
              {profile?.tenant.name ? (
                <Text
                  className="-mt-[7px] text-muted-foreground"
                  variant="small"
                >
                  {profile.tenant.name}
                </Text>
              ) : null}
              {controller.missingDestination ? (
                <NotificationDestinationNotice
                  onDismiss={controller.dismissDestinationUnavailable}
                />
              ) : null}
              {offline || stale ? (
                <StatusBanner
                  description="You can read the saved requests. Connect and refresh to answer."
                  kind={offline ? "offline" : "stale"}
                  onRetry={offline ? undefined : controller.refresh}
                  title={
                    offline
                      ? savedTime
                        ? `Offline · showing requests saved at ${savedTime}`
                        : "You’re offline"
                      : "Showing saved requests"
                  }
                />
              ) : null}
              {controller.restriction ? (
                <StatusBanner
                  description={controller.restriction}
                  kind="info"
                  title="Responses unavailable"
                />
              ) : null}
              {showingRequests ? (
                <>
                  <SectionHeader
                    className="min-h-[24px]"
                    title="Waiting for you"
                    value={String(pendingCount)}
                  />
                  {pending.length === 0 && !controller.search ? (
                    <ListCard>
                      <EmptyState
                        className="py-[20px]"
                        description="When a member names you as their guarantor, the request shows up here."
                        icon="Check"
                        title="Nothing waiting for you"
                      />
                    </ListCard>
                  ) : null}
                </>
              ) : null}
            </View>
          }
          empty={
            <EmptyState
              description={
                !controller.canRead
                  ? "Sign in with a member account to review guarantor requests."
                  : snapshot?.state === "member_profile_missing"
                    ? "Ask your cooperative to link your member profile."
                    : controller.search
                      ? "Try a different name, member number or financing product."
                      : "Requests that name you as guarantor will appear here."
              }
              icon={controller.search ? "SearchX" : "ShieldCheck"}
              title={
                !controller.canRead
                  ? "Member access required"
                  : snapshot?.state === "member_profile_missing"
                    ? "Your member profile isn’t linked"
                    : controller.search
                      ? "No matching requests"
                      : "No requests yet"
              }
            />
          }
          error={stale && rows.length > 0 ? null : controller.error}
          errorTitle="Guarantor approvals couldn’t load"
          isFetchingNextPage={controller.isFetchingNextPage}
          isLoading={controller.isLoading}
          keyExtractor={(row) => (row === "answered" ? "answered" : row.id)}
          onEndReached={controller.onEndReached}
          onRefresh={controller.canRead ? controller.refresh : undefined}
          onRetry={controller.refresh}
          refreshing={controller.refreshing}
          renderItem={({ item, index }) => {
            if (item === "answered")
              return (
                <SectionHeader
                  className="mx-[18px] mt-[8px] mb-[8px] min-h-[24px]"
                  title="Answered"
                  value={String(answeredCount)}
                />
              )
            const open = () => controller.openDetail(item)
            return item.status === "pending" ? (
              <GuarantorDecisionCard
                approval={item}
                blocked={controller.blocked}
                currencyCode={controller.currencyCode}
                onDecision={(decision) =>
                  controller.openDecision(item, decision)
                }
                onOpen={open}
                restriction={responseRestriction}
              />
            ) : (
              <GuarantorHistoryRow
                approval={item}
                currencyCode={controller.currencyCode}
                onOpen={open}
                position={rowPosition(
                  index - pending.length - 1,
                  answered.length
                )}
              />
            )
          }}
          search={
            (snapshot?.summary.totalApprovals ?? 0) > 10 || controller.search
              ? {
                  onChangeText: controller.setSearch,
                  placeholder: "Search requests",
                  totalCount: snapshot?.summary.totalApprovals ?? 11,
                  value: controller.search,
                  localSearch: offline,
                }
              : undefined
          }
          testID="guarantor-approvals-list"
          title="Guarantor approvals"
        />
      </View>
      {detail ? (
        <Animated.View
          accessibilityElementsHidden={result}
          accessibilityViewIsModal
          style={styles.fullScreenOverlay}
          entering={SlideInRight.duration(280)}
          importantForAccessibility={result ? "no-hide-descendants" : "auto"}
        >
          <MemberGuarantorDetail
            approval={detail}
            blocked={
              controller.blocked || Boolean(controller.formError && !flow)
            }
            currencyCode={controller.currencyCode}
            onBack={closeDetail}
            onDecision={(decision) => controller.openDecision(detail, decision)}
            restriction={
              responseRestriction ??
              (!flow ? (controller.formError ?? undefined) : undefined)
            }
          />
        </Animated.View>
      ) : null}
      {result ? (
        <Animated.View
          accessibilityViewIsModal
          style={styles.fullScreenOverlay}
          entering={FadeIn.duration(220)}
        >
          <GuarantorDecisionResult controller={controller} />
        </Animated.View>
      ) : null}
      <GuarantorDecisionSheets
        controller={controller}
        key={flow?.approval.id}
      />
    </View>
  )
}
