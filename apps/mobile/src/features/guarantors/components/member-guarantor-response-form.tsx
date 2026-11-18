import { AppSheet } from "@/components/app/app-sheet"
import { ConfirmSheet } from "@/components/app/confirm-sheet"
import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { ResultScreen, ReviewRow } from "@/components/app/result-screen"
import { Button } from "@/components/ui/button"
import { FormField, useFormFieldControl } from "@/components/ui/form-field"
import { Icon } from "@/components/ui/icon"
import { ListCard, TintedAvatar } from "@/components/ui/list-card"
import { Pressable } from "@/components/ui/pressable"
import { StatusBanner } from "@/components/ui/status-banner"
import { StatusPill } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { mobileDevQuickFill } from "@/dev/mobile-dev-quick-fill"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { useState } from "react"
import { Keyboard, View } from "react-native"
import {
  GUARANTOR_NOTE_MAX,
  type useMemberGuarantorApprovalsController,
} from "../hooks/use-member-guarantor-approvals-controller"
import {
  getGuarantorAnswer,
  presentGuarantorApproval,
} from "../model/member-guarantor-presentation"

type Controller = ReturnType<typeof useMemberGuarantorApprovalsController>

export function GuarantorDecisionSheets({
  controller,
}: {
  controller: Controller
}) {
  const largeText = useLargeTextLayout()
  const {
    blocked,
    currencyCode,
    editNote,
    flow,
    formError,
    note,
    offline,
    submitting,
  } = controller
  const [nextSheet, setNextSheet] = useState<"form" | "review" | null>(null)
  if (!flow) return null

  const { approval, decision, editingNote, hadNote, phase } = flow
  const row = presentGuarantorApproval(approval, currencyCode)
  const agree = decision === "approved"
  const firstName = row.borrower.trim().split(/\s+/)[0]
  const noteLabel = agree ? "Note for your cooperative" : "Reason"
  const confirmed = phase === "confirm" && nextSheet !== "form"
  return (
    <>
      <ConfirmSheet
        confirmDisabled={blocked}
        confirmLabel={agree ? "Agree" : "Decline"}
        description={
          agree
            ? "Your cooperative sees your answer as soon as you agree. You can’t change it here afterwards."
            : "Your cooperative sees your reason. You can’t change it here afterwards."
        }
        expandedTitle="Review response"
        icon={agree ? "ShieldCheck" : "X"}
        isConfirming={submitting}
        onCancel={controller.closeFlow}
        onConfirm={() => void controller.submit()}
        onDismissed={() => {
          if (nextSheet === "form") {
            setNextSheet(null)
            editNote()
          }
        }}
        sideBySide={!largeText}
        title={
          agree
            ? `Agree to guarantee ${row.borrower}?`
            : `Decline ${firstName}’s request?`
        }
        tone={agree ? "default" : "destructive"}
        visible={confirmed}
      >
        {agree ? (
          <ListCard className="bg-surface-raised" inset={false}>
            <ReviewRow
              label="Amount"
              value={row.requestedAmount}
              tabular
              compact
            />
            <ReviewRow label="Term" value={row.term} compact />
            <ReviewRow
              label="Monthly"
              value={row.monthlyServicing}
              tabular
              compact
            />
          </ListCard>
        ) : null}
        {note.trim() ? (
          <View className="bg-surface-raised gap-[4px] rounded-[12px] px-[12px] py-[9px]">
            <Text numberOfLines={3} variant="small">
              “{note.trim()}”
            </Text>
            <Text className="text-muted-foreground" variant="caption">
              {agree ? "Your note" : "Your reason"}
            </Text>
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          className="min-h-[44px] flex-row items-center gap-[6px] self-start"
          onPress={() => {
            if (!submitting) setNextSheet("form")
          }}
        >
          <Icon
            className="size-sm text-primary"
            name={note.trim() ? "Pencil" : "Plus"}
          />
          <Text className="text-primary" variant="label">
            {agree ? (note.trim() ? "Edit note" : "Add a note") : "Edit reason"}
          </Text>
        </Pressable>
      </ConfirmSheet>

      <AppSheet
        footer={
          <Button
            disabled={blocked}
            onPress={() => {
              if (!agree && !note.trim()) {
                controller.review()
                return
              }
              Keyboard.dismiss()
              setNextSheet("review")
            }}
          >
            <Text>{agree && editingNote ? "Save note" : "Continue"}</Text>
          </Button>
        }
        onClose={() => {
          if (editingNote) setNextSheet("review")
          else controller.closeNote()
        }}
        onDismissed={() => {
          if (nextSheet === "review") {
            setNextSheet(null)
            controller.review()
          }
        }}
        overlay={
          !note.trim() ? (
            <DevQuickFill
              label="Quick fill guarantor response note"
              onPress={() =>
                controller.setNote(mobileDevQuickFill.guarantor.notes)
              }
              portal={false}
            />
          ) : undefined
        }
        title={
          agree
            ? hadNote
              ? "Edit note"
              : "Add a note"
            : "Reason for declining"
        }
        variant="form"
        visible={phase === "note" && nextSheet !== "review"}
      >
        {offline ? (
          <StatusBanner
            description="Your answer is saved on this phone. Connect to send it."
            kind="offline"
            title="You’re offline"
          />
        ) : null}
        <ListCard className="rounded-[18px]">
          <View className="flex-row items-center gap-[12px] px-[14px] py-[12px]">
            <TintedAvatar name={row.borrower} />
            <View className="min-w-0 flex-1 gap-[2px]">
              <Text className="font-bold" variant="body">
                {row.borrower}
              </Text>
              <Text className="text-muted-foreground" tabular variant="small">
                {row.requestedAmount} · {row.term} · {row.monthlyServicing} a
                month
              </Text>
            </View>
          </View>
        </ListCard>
        <FormField
          error={formError}
          label={noteLabel}
          trailingLabel={agree ? "Optional" : "Required"}
        >
          <View className="gap-[6px]">
            <GuarantorNote
              agree={agree}
              label={noteLabel}
              note={note}
              onChange={controller.setNote}
            />
            <Text
              className="text-right text-muted-foreground"
              tabular
              variant="caption"
            >
              {note.length}/{GUARANTOR_NOTE_MAX}
            </Text>
          </View>
        </FormField>
      </AppSheet>
    </>
  )
}

function GuarantorNote({
  agree,
  label,
  note,
  onChange,
}: {
  agree: boolean
  label: string
  note: string
  onChange: (value: string) => void
}) {
  const field = useFormFieldControl()
  return (
    <Textarea
      accessibilityLabel={label}
      accessibilityLabelledBy={field?.labelId}
      className={cn(
        "min-h-[136px] rounded-[14px] px-[14px] py-[12px]",
        field?.invalid && "border-destructive"
      )}
      maxLength={GUARANTOR_NOTE_MAX}
      onBlur={() => field?.setFocused(false)}
      onChangeText={onChange}
      onFocus={() => field?.setFocused(true)}
      placeholder={
        agree
          ? "Anything your cooperative should know"
          : "Tell your cooperative why you can’t guarantee this request"
      }
      testID="guarantor-response-note"
      value={note}
    />
  )
}

export function GuarantorDecisionResult({
  controller,
}: {
  controller: Controller
}) {
  const {
    closeFlow,
    currencyCode,
    editNote,
    flow,
    offline,
    openDetail,
    submit,
    submitting,
  } = controller
  if (!flow) return null
  const { approval, phase } = flow
  const row = presentGuarantorApproval(approval, currencyCode)
  if (phase === "success") {
    const firstName = row.borrower.trim().split(/\s+/)[0]
    return (
      <ResultScreen
        badgeIcon="Check"
        compact
        description="Your answer is saved and your cooperative can see it."
        details={
          <ListCard inset={false}>
            <ReviewRow
              compact
              label="Member"
              value={`${row.borrower} · ${approval.loanRequest.borrowerMemberNumber}`}
            />
            <ReviewRow
              compact
              label="Your answer"
              value={<StatusPill {...getGuarantorAnswer(approval)} />}
            />
            <ReviewRow
              compact
              label="Amount"
              value={row.requestedAmount}
              tabular
            />
            <ReviewRow compact label="Sent" value={row.respondedDate} tabular />
          </ListCard>
        }
        primary={{ label: "Back to requests", onPress: closeFlow }}
        title={
          approval.status === "approved"
            ? `You agreed to guarantee ${firstName}`
            : `You declined ${firstName}’s request`
        }
        titleVariant="screenTitle"
        tone="success"
      />
    )
  }
  if (phase === "conflict") {
    return (
      <ResultScreen
        badgeIcon="Landmark"
        compact
        description="An answer is already recorded for this request."
        primary={{
          label: "View request",
          onPress: () => {
            closeFlow()
            openDetail(approval)
          },
        }}
        secondary={{
          label: "Back to requests",
          onPress: closeFlow,
          variant: "ghost",
        }}
        title="Already answered"
        titleVariant="screenTitle"
        tone="info"
      />
    )
  }
  return (
    <ResultScreen
      compact
      description={
        offline
          ? "Your answer is still here. Connect to try again."
          : "Your answer is still here, so you can try again."
      }
      primary={{
        label: "Try again",
        loading: submitting,
        onPress: () => void submit(),
      }}
      secondary={{ label: "Edit answer", onPress: editNote, variant: "ghost" }}
      title="Your answer wasn’t sent"
      titleVariant="screenTitle"
      tone="error"
    />
  )
}
