import { ScrollView, View } from "react-native"
import { SafeArea } from "@/components/safe-area"
import { ScreenHeader } from "@/components/app/screen-header"
import { ScreenBackButton } from "@/components/app/screen-back-button"
import { SubmissionReviewSheet } from "@/components/app/submission-review-sheet"
import { Button } from "@/components/ui/button"
import { Text } from "@/components/ui/text"
import type { PrivacyNotice, PrivacyRequest } from "../api/account-privacy-api"

export type PrivacyConfirmation =
  | { kind: "request" }
  | { kind: "cancel"; requestId: string }
  | null
export function AccountPrivacyScreen(props: {
  notice: PrivacyNotice | null
  requests: PrivacyRequest[]
  loading: boolean
  busy: boolean
  offline: boolean
  error: string | null
  message: string | null
  confirmation: PrivacyConfirmation
  onBack: () => void
  onRefresh: () => void
  onManageStore: () => void
  onReview: (value: PrivacyConfirmation) => void
  onConfirm: () => void
}) {
  const pending = props.requests.some(
    (request) =>
      !["completed", "rejected", "cancelled"].includes(request.status)
  )
  const disabled = props.loading || props.busy || props.offline
  return (
    <SafeArea className="bg-background">
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 20 }}
      >
        <ScreenHeader
          title="Delete account"
          leading={<ScreenBackButton onPress={props.onBack} />}
          description="Request account deletion and review your request’s progress."
        />
        {props.offline ? (
          <Text accessibilityLiveRegion="polite">
            Reconnect to submit or update a privacy request.
          </Text>
        ) : null}
        {props.error ? (
          <Text accessibilityLiveRegion="polite" className="text-destructive">
            {props.error}
          </Text>
        ) : null}
        {props.message ? (
          <Text accessibilityLiveRegion="polite">{props.message}</Text>
        ) : null}
        <Button disabled={disabled} variant="outline" onPress={props.onRefresh}>
          <Text>{props.loading ? "Loading…" : "Refresh requests"}</Text>
        </Button>
        <View className="gap-2">
          <Button variant="outline" onPress={props.onManageStore}>
            <Text>Manage or cancel app subscription</Text>
          </Button>
          <Text className="text-sm text-muted-foreground">
            Deleting your account does not cancel Apple or Google renewal
            charges. Manage your subscription in your store account.
          </Text>
        </View>
        {props.notice ? (
          <View className="gap-3">
            <Text className="text-lg font-semibold">
              Before you request deletion
            </Text>
            <Text>{props.notice.scope}</Text>
            {props.notice.consequences.map((item) => (
              <Text
                className="text-sm leading-6 text-muted-foreground"
                key={item}
              >
                {item}
              </Text>
            ))}
            <Button
              variant="destructive"
              disabled={disabled || pending}
              onPress={() => props.onReview({ kind: "request" })}
            >
              <Text>
                {pending
                  ? "Request already in progress"
                  : "Review deletion request"}
              </Text>
            </Button>
          </View>
        ) : null}
        <View className="gap-4">
          <Text className="text-lg font-semibold">Your requests</Text>
          {!props.loading && !props.requests.length ? (
            <Text className="text-muted-foreground">
              No account deletion requests found.
            </Text>
          ) : null}
          {props.requests.map((request) => (
            <View
              className="gap-2 rounded-xl border border-border p-4"
              key={request.id}
            >
              <Text className="font-semibold">
                {request.status.replaceAll("_", " ")}
              </Text>
              <Text className="text-sm text-muted-foreground">
                Requested {new Date(request.requestedAt).toLocaleDateString()}
              </Text>
              <Text selectable className="text-xs text-muted-foreground">
                Reference: {request.id}
              </Text>
              {request.accessRevokedAt && !request.completedAt ? (
                <Text>
                  Account access has ended. Data processing is still in
                  progress.
                </Text>
              ) : null}
              {request.completionSummary ? (
                <Text>{request.completionSummary}</Text>
              ) : null}
              {!request.accessRevokedAt &&
              ["submitted", "verified", "awaiting_information"].includes(
                request.status
              ) ? (
                <Button
                  variant="outline"
                  disabled={disabled}
                  onPress={() =>
                    props.onReview({ kind: "cancel", requestId: request.id })
                  }
                >
                  <Text>Cancel deletion request</Text>
                </Button>
              ) : null}
            </View>
          ))}
        </View>
      </ScrollView>
      <SubmissionReviewSheet
        title={
          props.confirmation?.kind === "cancel"
            ? "Cancel deletion request?"
            : "Submit deletion request?"
        }
        description={
          props.confirmation?.kind === "cancel"
            ? "Keep your account and withdraw this request before processing begins."
            : "This submits a request for verification and processing. It does not immediately delete your account or cancel store subscriptions."
        }
        rows={
          props.confirmation?.kind === "request"
            ? (props.notice?.consequences ?? []).map((value, index) => ({
                label: `${index + 1}. Please review`,
                value,
              }))
            : []
        }
        confirmLabel={
          props.confirmation?.kind === "cancel"
            ? "Cancel request"
            : "Submit request"
        }
        cancelLabel="Go back"
        error={props.error}
        isSubmitting={props.busy}
        onClose={() => {
          if (!props.busy) props.onReview(null)
        }}
        onConfirm={props.onConfirm}
        visible={props.confirmation !== null}
      />
    </SafeArea>
  )
}
