import { ConfirmSheet } from "@/components/app/confirm-sheet"
import { FullScreenFormSheet } from "@/components/app/full-screen-form-sheet"
import { ScreenShell } from "@/components/app/screen-shell"
import {
  StatusBlock,
  StatusCard,
  StatusRow,
  StatusSection,
  StatusSectionHeading,
  StatusTile,
} from "@/components/app/status-card"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Elevated } from "@/components/ui/list-card"
import { ListSkeleton } from "@/components/ui/skeleton"
import { StatusBanner } from "@/components/ui/status-banner"
import { Text } from "@/components/ui/text"
import { View } from "react-native"
import type { PrivacyNotice, PrivacyRequest } from "../api/account-privacy-api"
import {
  PrivacyReference,
  PrivacySteps,
} from "../components/privacy-request-progress"
import {
  PRIVACY_STATUS,
  canCancelPrivacyRequest,
  livePrivacyRequest,
  noticeItems,
  noticeVersionLabel,
  pastPrivacyRequests,
  pastRequestNote,
  privacyDay,
  privacyDueDay,
} from "../model/privacy-presentation"

export type PrivacySheet = "review" | "success" | "cancel" | null

/**
 * Close my account on 03 Status card (T26): one status card says where the
 * request stands (progress steps, response date, copyable reference), the
 * notice explains what closing means (the cooperative settles money first,
 * like closing a bank account), and the review opens full screen.
 */
export function AccountPrivacyScreen(props: {
  accountLabel: string
  busy: boolean
  loading: boolean
  message: string | null
  notice: PrivacyNotice | null
  offline: boolean
  readError: string | null
  receipt: PrivacyRequest | null
  refreshing: boolean
  requestsLoaded: boolean
  requests: PrivacyRequest[]
  sheet: PrivacySheet
  writeError: string | null
  onBack: () => void
  onCloseSheet: () => void
  onConfirmCancel: () => void
  onDone: () => void
  onOpen: (sheet: Exclude<PrivacySheet, null | "success">) => void
  onRefresh: () => void
  onSubmit: () => void
}) {
  const live = livePrivacyRequest(props.requests)
  const past = pastPrivacyRequests(props.requests)
  const status = live ? PRIVACY_STATUS[live.status] : null
  const cancellable = live ? canCancelPrivacyRequest(live) : false
  const ready = Boolean(props.notice) && props.requestsLoaded
  const items = props.notice ? noticeItems(props.notice) : []

  const footer = !ready
    ? undefined
    : live
      ? cancellable
        ? (
            <Button
              disabled={props.offline || props.busy}
              onPress={() => props.onOpen("cancel")}
              testID="privacy-cancel"
              variant="secondary"
            >
              <Icon className="size-base text-accent-foreground" name="Undo2" />
              <Text>Cancel my request</Text>
            </Button>
          )
        : undefined
      : (
          <Button
            disabled={props.offline || props.busy}
            onPress={() => props.onOpen("review")}
            testID="privacy-review"
            variant="destructive"
          >
            <Icon className="size-base text-destructive-foreground" name="LogOut" />
            <Text>Ask to close my account</Text>
          </Button>
        )

  return (
    <ScreenShell
      back={props.onBack}
      footer={footer}
      onRefresh={ready ? props.onRefresh : undefined}
      refreshing={props.refreshing}
      testID="account-privacy-screen"
      title="Close my account"
    >
      {props.message ? <StatusBanner kind="info" title={props.message} /> : null}
      {props.offline ? (
        <StatusBanner kind="offline" title="Reconnect to send or update your request." />
      ) : null}
      {ready && props.readError ? (
        <StatusBanner
          kind="error"
          onRetry={props.offline ? undefined : props.onRefresh}
          title="Couldn’t refresh your requests"
        />
      ) : null}
      {!ready && !props.loading ? (
        <StatusBlock
          action={props.offline ? undefined : { icon: "RefreshCw", label: "Try again", onPress: props.onRefresh }}
          body={
            props.readError ??
            (props.offline
              ? "Your requests load when you’re back online."
              : "Privacy requests could not be loaded. Try again.")
          }
          icon={props.offline ? "WifiOff" : "CircleAlert"}
          testID="privacy-error"
          title={props.offline ? "Requests need a connection" : "Requests couldn’t load"}
          tone={props.offline ? "warning" : "danger"}
        />
      ) : !ready ? (
        <View className="gap-[9px]">
          <StatusSectionHeading title="Your requests" />
          <ListSkeleton rows={2} />
        </View>
      ) : (
        <>
          {live && status ? (
            <StatusCard
              body={status.body}
              icon={status.icon}
              pill={status.pill}
              testID="privacy-status"
              title={status.title ?? status.pill}
              tone={status.tone}
            >
              <PrivacySteps
                done={status.step ?? 0}
                live={live.status === "processing"}
                warm={status.tone === "warning"}
              />
              <Text className="text-muted-foreground" variant="small">
                {`Requested ${privacyDay(live.requestedAt)}${live.status === "processing" ? "" : ` · We respond by ${privacyDueDay(live)}`}`}
              </Text>
              <PrivacyReference id={live.id} />
            </StatusCard>
          ) : (
            <StatusCard
              body={props.notice!.scope}
              icon="LogOut"
              pill="No request"
              testID="privacy-status"
              title="Close your account"
              tone="danger"
            />
          )}
          {!live ? (
            <StatusSection title="Before you ask to close your account">
              {items.map((item) => (
                <StatusRow
                  alignTop
                  icon={item.icon}
                  key={item.text}
                  meta={item.text}
                  title={item.heading}
                  tone={item.tone}
                />
              ))}
            </StatusSection>
          ) : null}
          {past.length ? (
            <StatusSection title="Past requests">
              {past.map((request) => {
                const copy = PRIVACY_STATUS[request.status]
                return (
                  <StatusRow
                    alignTop
                    icon={copy.icon}
                    key={request.id}
                    meta={pastRequestNote(request)}
                    title={`${copy.pill} · requested ${privacyDay(request.requestedAt)}`}
                    tone={copy.tone}
                  />
                )
              })}
            </StatusSection>
          ) : !live ? (
            <Text className="px-[4px] text-muted-foreground" variant="small">
              No requests to close your account yet.
            </Text>
          ) : null}
        </>
      )}

      <FullScreenFormSheet
        footer={
          <View className="gap-[4px]">
            <Button
              disabled={props.offline}
              loading={props.busy}
              onPress={props.onSubmit}
              testID="privacy-submit"
              variant="destructive"
            >
              {props.writeError && !props.busy ? (
                <Icon className="size-base text-destructive-foreground" name="RefreshCw" />
              ) : null}
              <Text>
                {props.busy
                  ? "Submitting…"
                  : props.writeError
                    ? "Try again"
                    : "Send my request"}
              </Text>
            </Button>
            <Button disabled={props.busy} onPress={props.onCloseSheet} variant="ghost">
              <Text>Go back</Text>
            </Button>
          </View>
        }
        isSubmitting={props.busy}
        onClose={props.onCloseSheet}
        title="Review request"
        visible={props.sheet === "review"}
      >
        <View className="gap-[16px]">
          <View className="items-center gap-[6px] px-[8px] pb-[2px]">
            <View className="mb-[6px]">
              <StatusTile icon="LogOut" tone="danger" />
            </View>
            <Text accessibilityRole="header" className="text-center" variant="title">
              Ask to close your account?
            </Text>
            <Text className="text-center text-muted-foreground" variant="small">
              Your cooperative settles your savings, shares and loans first. We close your login only after that, and we email you when it’s done.
            </Text>
          </View>
          {props.writeError ? <StatusBanner kind="error" title={props.writeError} /> : null}
          <Elevated className="rounded-[20px] bg-card" radius={20}>
            <View className="px-[16px] py-[4px]">
              {[
                ["Account", props.accountLabel],
                ["Covers", "All your cooperatives on HalaalVest"],
                ["Notice", props.notice ? `Version ${noticeVersionLabel(props.notice.version)}` : "—"],
              ].map(([label, value], index) => (
                <View
                  className={
                    index > 0
                      ? "min-h-[44px] flex-row items-center justify-between gap-[12px] border-t border-border py-[10px]"
                      : "min-h-[44px] flex-row items-center justify-between gap-[12px] py-[10px]"
                  }
                  key={label}
                >
                  <Text className="text-muted-foreground" variant="small">
                    {label}
                  </Text>
                  <Text className="min-w-0 shrink text-right font-bold" variant="small">
                    {value}
                  </Text>
                </View>
              ))}
            </View>
          </Elevated>
          <StatusSection title="Please review">
            {items.map((item, index) => (
              <StatusRow
                alignTop
                icon={item.icon}
                key={item.text}
                meta={item.text}
                title={`${index + 1}. ${item.heading}`}
                tone={item.tone}
              />
            ))}
          </StatusSection>
        </View>
      </FullScreenFormSheet>

      <FullScreenFormSheet
        footer={
          <Button onPress={props.onDone} testID="privacy-success-done">
            <Text>Done</Text>
          </Button>
        }
        onClose={props.onDone}
        title="Close my account"
        visible={props.sheet === "success"}
      >
        {props.receipt ? (
          <View className="items-center gap-[10px] px-[8px] pt-[48px]" testID="privacy-success">
            <StatusTile icon="Check" size={56} tone="success" />
            <Text accessibilityRole="header" className="mt-[6px] text-center" variant="screenTitle">
              Request received
            </Text>
            <Text className="mb-[8px] max-w-[300px] text-center text-muted-foreground" variant="body">
              {`Keep this reference to follow up. We respond within 30 days, by ${privacyDueDay(props.receipt)}.`}
            </Text>
            <View className="self-stretch">
              <Elevated className="rounded-[12px] bg-card" radius={12}>
                <PrivacyReference id={props.receipt.id} raised />
              </Elevated>
            </View>
          </View>
        ) : null}
      </FullScreenFormSheet>

      <ConfirmSheet
        cancelLabel="Go back"
        confirmDisabled={props.offline}
        confirmLabel={props.writeError ? "Try again" : "Cancel request"}
        description="Keep your account and withdraw this request. You can do this until your login is closed."
        error={props.writeError}
        icon="Undo2"
        isConfirming={props.busy}
        onCancel={props.onCloseSheet}
        onConfirm={props.onConfirmCancel}
        title="Cancel your request?"
        visible={props.sheet === "cancel"}
      />
    </ScreenShell>
  )
}
