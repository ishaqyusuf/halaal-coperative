import { ScrollView, View } from "react-native"
import { SafeArea } from "@/components/safe-area"
import { ScreenBackButton } from "@/components/app/screen-back-button"
import { ScreenHeader } from "@/components/app/screen-header"
import { SubmissionReviewSheet } from "@/components/app/submission-review-sheet"
import { Button } from "@/components/ui/button"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import type { LegalBundle, LegalRecord } from "../api/legal-api"

export function LegalAgreementsScreen(props: {
  bundle: LegalBundle | null
  records: LegalRecord[]
  loading: boolean
  busy: boolean
  offline: boolean
  reviewed: boolean
  confirming: boolean
  error: string | null
  message: string | null
  onBack: () => void
  onRefresh: () => void
  onReview: (value: boolean) => void
  onConfirming: (value: boolean) => void
  onAccept: () => void
}) {
  const current =
    props.bundle?.available &&
    props.bundle.documents.every((document) =>
      props.records.some(
        (record) =>
          record.documentType === document.documentType &&
          record.documentVersion === document.documentVersion &&
          record.contentHash === document.contentHash
      )
    )
  return (
    <SafeArea className="bg-background">
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 50, gap: 18 }}
      >
        <ScreenHeader
          title="Platform documents"
          description="Review the terms and privacy notice for your HalaalVest account."
          leading={<ScreenBackButton onPress={props.onBack} />}
        />
        {props.offline ? (
          <Text accessibilityLiveRegion="polite">
            Reconnect to load the current documents and record your
            acknowledgement.
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
        <Button
          variant="outline"
          disabled={props.loading || props.busy || props.offline}
          onPress={props.onRefresh}
        >
          <Text>{props.loading ? "Loading…" : "Refresh documents"}</Text>
        </Button>
        {props.bundle && !props.bundle.available ? (
          <Text className="text-sm leading-6 text-muted-foreground">
            {props.bundle.acceptanceRequired
              ? "Approved current documents are temporarily unavailable. Try again later."
              : "These platform documents are still review drafts. There is nothing to accept yet."}
          </Text>
        ) : null}
        {props.bundle?.documents.map((document) => (
          <View
            className="gap-4 rounded-xl border border-border p-4"
            key={document.documentType}
          >
            <Text className="text-xl font-semibold">
              {document.contentSnapshot.title}
            </Text>
            <Text className="text-sm text-muted-foreground">
              Version {document.documentVersion} · Effective{" "}
              {new Date(
                document.contentSnapshot.effectiveAt
              ).toLocaleDateString()}
            </Text>
            <Text className="leading-6">
              {document.contentSnapshot.introduction}
            </Text>
            {document.contentSnapshot.sections.map((section) => (
              <View className="gap-2" key={section.title}>
                <Text className="font-semibold">{section.title}</Text>
                <Text className="leading-6 text-muted-foreground">
                  {section.body}
                </Text>
              </View>
            ))}
          </View>
        ))}
        {current ? (
          <Text accessibilityLiveRegion="polite">
            Your acceptance of the current terms and acknowledgement of the
            current privacy notice are recorded.
          </Text>
        ) : null}
        {props.bundle?.available && !current ? (
          <View className="gap-4">
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: props.reviewed }}
              className="min-h-11 flex-row items-start gap-3 rounded-lg border border-border p-3"
              haptic
              onPress={() => props.onReview(!props.reviewed)}
            >
              <Text>{props.reviewed ? "☑" : "☐"}</Text>
              <Text className="min-w-0 flex-1 leading-6">
                I accept the platform terms and acknowledge that I have read the
                privacy notice shown above.
              </Text>
            </Pressable>
            <Button
              disabled={
                !props.reviewed || props.loading || props.busy || props.offline
              }
              onPress={() => props.onConfirming(true)}
            >
              <Text>Review and record</Text>
            </Button>
          </View>
        ) : null}
      </ScrollView>
      <SubmissionReviewSheet
        title="Record platform documents?"
        description="Your acceptance of the terms and acknowledgement of the privacy notice will be recorded with their exact versions."
        rows={(props.bundle?.documents ?? []).map((document) => ({
          label: document.contentSnapshot.title,
          value: `Version ${document.documentVersion}`,
        }))}
        error={props.error}
        visible={props.confirming}
        isSubmitting={props.busy}
        onClose={() => {
          if (!props.busy) props.onConfirming(false)
        }}
        onConfirm={props.onAccept}
        confirmLabel="Record acknowledgement"
      />
    </SafeArea>
  )
}
