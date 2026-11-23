"use client"

import type {
  PaymentReceiptMemberAudience,
  PaymentReceiptMemberAudienceSettings,
} from "@halaalvest/db"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import {
  RadioGroup,
  RadioGroupItem,
} from "@halaalvest/ui/components/radio-group"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { useRouter } from "next/navigation"
import { useState, useTransition, type FormEvent } from "react"
import { MemberCombobox } from "@/components/member-combobox"
import { updatePaymentReceiptMemberAudienceAction } from "@/lib/dashboard-actions"
import { paymentReceiptMemberAudienceLabels } from "@/lib/settings/operation-profile-settings"

const audienceOptions = [
  { value: "disabled", description: "Members cannot send new receipts." },
  { value: "enabled", description: "All eligible members can send receipts." },
  {
    value: "selected_members",
    description: "Only the members you choose can send receipts.",
  },
] as const

export function PaymentReceiptMemberAudienceForm({
  settings,
}: {
  settings: PaymentReceiptMemberAudienceSettings
}) {
  const router = useRouter()
  const notifications = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [audience, setAudience] = useState(settings.audience)
  const [members, setMembers] = useState(() =>
    settings.members.map((member) => ({
      id: member.id,
      label: `${member.fullName} (${member.memberNumber})`,
    }))
  )
  const [memberId, setMemberId] = useState("")
  const [memberLabel, setMemberLabel] = useState("")
  const [reason, setReason] = useState("")
  const selected = audience === "selected_members"
  const nextMembers = selected ? members : []
  const removedMember = settings.members.some(
    ({ id }) => !nextMembers.some((member) => member.id === id)
  )
  const changed =
    audience !== settings.audience ||
    removedMember ||
    nextMembers.length !== settings.members.length
  const reasonRequired =
    (settings.audience === "enabled" && audience !== "enabled") ||
    (settings.audience === "selected_members" &&
      audience !== "enabled" &&
      (audience === "disabled" || removedMember))
  const canAddMember = Boolean(
    memberId && memberLabel && !members.some((member) => member.id === memberId)
  )

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    startTransition(async () => {
      try {
        await updatePaymentReceiptMemberAudienceAction(formData)
        notifications.showSuccess("Saved", "Member receipt access updated.")
        router.refresh()
      } catch (error) {
        notifications.showError(
          "Could not save",
          error instanceof Error ? error.message : "Try again."
        )
      }
    })
  }

  return (
    <form
      onSubmit={save}
      className="mb-6 grid gap-4 border-b border-border px-4 pb-5 sm:px-6"
    >
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-base font-medium">
          Member receipt submissions
        </legend>
        <input
          type="hidden"
          name="expectedRevision"
          value={settings.revision}
        />
        <input type="hidden" name="audience" value={audience} />
        <RadioGroup
          className="grid gap-2"
          disabled={isPending}
          onValueChange={(value) =>
            setAudience(value as PaymentReceiptMemberAudience)
          }
          value={audience}
        >
          {audienceOptions.map((option) => (
            <label
              key={option.value}
              className="flex min-h-11 items-start gap-3 rounded-md border border-border px-4 py-3"
            >
              <RadioGroupItem className="mt-1" value={option.value} />
              <span>
                <span className="block font-semibold">
                  {paymentReceiptMemberAudienceLabels[option.value]}
                </span>
                <span className="block text-sm text-muted-foreground">
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </RadioGroup>
      </fieldset>
      {selected ? (
        <div className="grid gap-2">
          <label htmlFor="receipt-member-picker" className="font-medium">
            Choose members
          </label>
          <div className="grid items-start gap-2 sm:grid-cols-[1fr_auto]">
            <MemberCombobox
              disabled={isPending}
              id="receipt-member-picker"
              onLabelChange={setMemberLabel}
              onValueChange={setMemberId}
              value={memberId}
            />
            <Button
              type="button"
              variant="outline"
              disabled={isPending || !canAddMember}
              onClick={() => {
                setMembers([...members, { id: memberId, label: memberLabel }])
                setMemberId("")
                setMemberLabel("")
              }}
            >
              Add member
            </Button>
          </div>
          {members.length ? (
            <ul className="divide-y divide-border border-y border-border">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <input type="hidden" name="memberId" value={member.id} />
                  <span>{member.label}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label={`Remove ${member.label}`}
                    disabled={isPending}
                    onClick={() =>
                      setMembers(members.filter(({ id }) => id !== member.id))
                    }
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No members selected.
            </p>
          )}
        </div>
      ) : null}
      {reasonRequired ? (
        <div className="grid gap-2">
          <label htmlFor="receipt-audience-reason" className="font-medium">
            Why is access changing?
          </label>
          <Textarea
            id="receipt-audience-reason"
            name="changeReason"
            required
            maxLength={1000}
            value={reason}
            disabled={isPending}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
      ) : null}
      <p className="text-sm text-muted-foreground">
        Receipt history stays visible and Finance can finish pending reviews.
      </p>
      <Button
        type="submit"
        className="sm:justify-self-end"
        disabled={isPending || !changed || (reasonRequired && !reason.trim())}
      >
        {isPending ? "Saving…" : "Save member access"}
      </Button>
    </form>
  )
}
