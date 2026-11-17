import { AppSheet } from "@/components/app/app-sheet"
import { EmptyState } from "@/components/app/empty-state"
import { ReviewRow } from "@/components/app/result-screen"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Elevated } from "@/components/ui/list-card"
import { Pressable } from "@/components/ui/pressable"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBanner } from "@/components/ui/status-banner"
import { StatusPill, type StatusTone } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { View } from "react-native"
import { openReceiptProof } from "../api/receipt-proof-api"
import type { MobilePaymentReceipt } from "../model/member-receipt-types"
import {
  receiptCategories,
  receiptDate,
  receiptMoney,
  receiptMonth,
  receiptStatus,
  receiptTitle,
} from "../model/receipt-presentation"

const tileColors: Record<StatusTone, string> = {
  brand: "bg-accent text-accent-foreground",
  danger: "bg-tint-danger text-tint-danger-foreground",
  info: "bg-tint-sky text-tint-sky-foreground",
  lilac: "bg-tint-lilac text-tint-lilac-foreground",
  neutral: "bg-surface-raised text-foreground-soft",
  success: "bg-tint-success text-tint-success-foreground",
  warning: "bg-tint-warm text-tint-warm-foreground",
}

export function ReceiptTile({ tone }: { tone: StatusTone }) {
  const [surface, ink] = tileColors[tone].split(" ")
  return (
    <View
      className={cn(
        "size-[44px] items-center justify-center rounded-[14px]",
        surface
      )}
    >
      <Icon className={cn("size-[20px]", ink)} name="ReceiptText" />
    </View>
  )
}

export function ReceiptCardLabel({
  receipt,
  currency,
}: {
  receipt: MobilePaymentReceipt
  currency: string
}) {
  const status = receiptStatus(receipt.status)
  return (
    <View className="flex-row items-center gap-[12px] rounded-[18px] border border-border bg-card p-[14px]">
      <ReceiptTile tone={status.tone} />
      <View className="min-w-0 flex-1">
        <Text className="font-extrabold" numberOfLines={1} variant="body">
          {receiptTitle(receipt)}
        </Text>
        <Text
          className="text-muted-foreground"
          numberOfLines={1}
          variant="small"
        >
          {receiptMoney(receipt.totalAmount, currency)} · Paid{" "}
          {receiptDate(receipt.paidAt, true)}
        </Text>
      </View>
      <StatusPill icon={status.icon} label={status.label} tone={status.tone} />
    </View>
  )
}

export function ReceiptFinanceNote({
  receipt,
}: {
  receipt: MobilePaymentReceipt
}) {
  if (!receipt.reviewNotes) return null
  const correction = receipt.status === "correction_requested"
  const ink = correction
    ? "text-tint-danger-foreground"
    : "text-foreground-soft"
  return (
    <View
      className={cn(
        "flex-row gap-[10px] rounded-[14px] p-[12px]",
        correction ? "bg-tint-danger" : "bg-surface-raised"
      )}
    >
      <Icon
        className={cn("mt-[1px] size-[17px]", ink)}
        name={correction ? "CircleAlert" : "Info"}
      />
      <View className="flex-1">
        <Text className={ink} variant="label">
          Finance note
        </Text>
        <Text className={ink} variant="small">
          {receipt.reviewNotes}
        </Text>
      </View>
    </View>
  )
}

function ReceiptTimeline({ receipt }: { receipt: MobilePaymentReceipt }) {
  const needsCorrection = receipt.status === "correction_requested"
  const rejected = receipt.status === "rejected"
  const approved = receipt.status === "approved"
  const resolved = needsCorrection || rejected || approved
  const steps = [
    {
      label: "Sent",
      date: receiptDate(receipt.submittedAt, true),
      tone: "done",
    },
    { label: "In review", date: null, tone: resolved ? "done" : "current" },
    {
      label: needsCorrection
        ? "Correction"
        : rejected
          ? "Rejected"
          : "Approved",
      date: null,
      tone: approved ? "done" : resolved ? "bad" : "future",
    },
  ]
  return (
    <View
      accessibilityLabel={`Status: ${receiptStatus(receipt.status).label}`}
      accessible
      className="flex-row rounded-[18px] border border-border bg-card px-[12px] py-[14px]"
    >
      <View className="absolute top-[25px] right-[19%] left-[19%] h-[2px] bg-border" />
      <View
        className={cn(
          "absolute top-[25px] left-[19%] h-[2px] bg-primary",
          approved ? "right-[19%]" : "right-1/2"
        )}
      />
      {steps.map((step) => (
        <View className="flex-1 items-center gap-[4px]" key={step.label}>
          <View
            className={cn(
              "size-[22px] items-center justify-center rounded-full border-2",
              step.tone === "done"
                ? "border-primary bg-primary"
                : step.tone === "current"
                  ? "border-primary bg-accent"
                  : step.tone === "bad"
                    ? "bg-tint-danger border-destructive"
                    : "border-border bg-card"
            )}
          >
            {step.tone === "done" || step.tone === "bad" ? (
              <Icon
                className={cn(
                  "size-[14px]",
                  step.tone === "done"
                    ? "text-primary-foreground"
                    : "text-destructive"
                )}
                name={
                  step.tone === "done"
                    ? "Check"
                    : rejected
                      ? "X"
                      : "CircleAlert"
                }
              />
            ) : null}
          </View>
          <Text className="text-foreground-soft" variant="caption">
            {step.label}
          </Text>
          {step.date ? (
            <Text className="text-muted-foreground" variant="caption">
              {step.date}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  )
}

function ReceiptProof({ receipt }: { receipt: MobilePaymentReceipt }) {
  const [error, setError] = useState(false)
  const [opening, setOpening] = useState(false)
  const url = receipt.proofDocumentUrl
  if (!url) {
    return (
      <View className="bg-surface-raised flex-row items-center gap-[8px] rounded-[14px] p-[12px]">
        <Icon className="size-[17px] text-muted-foreground" name="Info" />
        <Text className="text-foreground-soft flex-1" variant="small">
          No proof was attached to this receipt.
        </Text>
      </View>
    )
  }
  const name = receipt.proofDocumentName || "Proof of payment"
  const pdf = /\.pdf$/i.test(name)
  return (
    <>
      <Pressable
        accessibilityLabel={`Open proof, ${name}`}
        accessibilityRole="button"
        className="min-h-[66px] flex-row items-center gap-[12px] rounded-[14px] border border-border bg-card px-[12px]"
        disabled={opening}
        onPress={async () => {
          setError(false)
          setOpening(true)
          try {
            await openReceiptProof(url, receipt.proofDocumentName)
          } catch {
            setError(true)
          } finally {
            setOpening(false)
          }
        }}
      >
        <View
          className={cn(
            "size-[44px] items-center justify-center rounded-[10px]",
            pdf ? "bg-tint-danger" : "bg-accent"
          )}
        >
          {pdf ? (
            <Text className="text-tint-danger-foreground" variant="caption">
              PDF
            </Text>
          ) : (
            <Icon
              className="size-[20px] text-accent-foreground"
              name="FileText"
            />
          )}
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-bold" numberOfLines={1} variant="small">
            {name}
          </Text>
          <Text className="text-muted-foreground" variant="caption">
            {opening ? "Opening…" : pdf ? "PDF" : "Attachment"}
          </Text>
        </View>
        <Icon
          className="size-[18px] text-muted-foreground"
          name="ChevronRight"
        />
      </Pressable>
      {error ? (
        <StatusBanner
          kind="error"
          title="Couldn’t open proof"
          description="Tap the attachment to try again."
        />
      ) : null}
    </>
  )
}

export function ReceiptDetail({
  canSupport,
  currency,
  error,
  loading,
  onClose,
  onRetry,
  onSupport,
  receipt,
  visible,
}: {
  canSupport: boolean
  currency: string
  error: boolean
  loading: boolean
  onClose: () => void
  onRetry: () => void
  onSupport: () => void
  receipt: MobilePaymentReceipt | null
  visible: boolean
}) {
  return (
    <AppSheet
      onClose={onClose}
      title={receipt ? receiptTitle(receipt) : "Receipt"}
      variant="form"
      visible={visible}
    >
      {receipt ? (
        <View className="gap-[14px]">
          <View className="items-center gap-[4px]">
            <Text tabular variant="hero">
              {receiptMoney(receipt.totalAmount, currency)}
            </Text>
            <Text className="text-muted-foreground" variant="small">
              Paid {receiptDate(receipt.paidAt)} ·{" "}
              {receipt.channel === "transfer"
                ? "Bank transfer"
                : receipt.channel[0].toUpperCase() + receipt.channel.slice(1)}
            </Text>
          </View>
          <ReceiptTimeline receipt={receipt} />
          <ReceiptFinanceNote receipt={receipt} />
          <View className="gap-[8px]">
            <Text className="text-muted-foreground uppercase" variant="caption">
              Split · {receipt.allocations.length}
            </Text>
            <Elevated
              className="overflow-hidden rounded-[16px] border border-border bg-card"
              radius={16}
            >
              {receipt.allocations.map((split, index) => (
                <View
                  className={index ? "border-t border-border" : ""}
                  key={split.id}
                >
                  <ReviewRow
                    compact
                    label={receiptCategories[split.category]}
                    value={receiptMoney(split.amount, currency)}
                    tabular
                  />
                  {split.targetPeriodStart ? (
                    <Text
                      className="-mt-[8px] px-[16px] pb-[9px] text-muted-foreground"
                      variant="caption"
                    >
                      {receiptMonth(split.targetPeriodStart.slice(0, 7), true)}
                    </Text>
                  ) : null}
                </View>
              ))}
            </Elevated>
          </View>
          <View className="gap-[8px]">
            <Text className="text-muted-foreground uppercase" variant="caption">
              Proof
            </Text>
            <ReceiptProof key={receipt.id} receipt={receipt} />
          </View>
          <View className="overflow-hidden rounded-[16px] border border-border bg-card">
            <ReviewRow
              compact
              label="Reference"
              value={receipt.paymentReference || "None"}
            />
            <View className="border-t border-border">
              <ReviewRow
                compact
                label="Sent"
                value={receiptDate(receipt.submittedAt)}
              />
            </View>
            {receipt.memberNotes ? (
              <View className="border-t border-border">
                <ReviewRow
                  compact
                  label="Your note"
                  value={receipt.memberNotes}
                />
              </View>
            ) : null}
          </View>
          {canSupport ? (
            <Button
              onPress={onSupport}
              variant={
                receipt.status === "correction_requested"
                  ? "default"
                  : "outline"
              }
            >
              <Icon className="size-[18px]" name="CircleHelp" />
              <Text>
                {receipt.status === "correction_requested"
                  ? "Reply to finance"
                  : "Get help with this receipt"}
              </Text>
            </Button>
          ) : (
            <StatusBanner kind="info" title="New support cases are off" />
          )}
        </View>
      ) : loading ? (
        <View className="gap-[12px]">
          <Skeleton className="h-[62px] w-1/2 self-center rounded-[14px]" />
          <Skeleton className="h-[92px] w-full rounded-[18px]" />
          <Skeleton className="h-[126px] w-full rounded-[18px]" />
        </View>
      ) : (
        <EmptyState
          action={{
            label: error ? "Try again" : "Back to receipts",
            onPress: error ? onRetry : onClose,
          }}
          description={
            error
              ? "Check your connection and try again."
              : "It may have been removed, or it belongs to another account."
          }
          icon="ReceiptText"
          title={
            error
              ? "Couldn’t load this receipt"
              : "This receipt isn’t available"
          }
          tone={error ? "error" : "default"}
        />
      )}
    </AppSheet>
  )
}
