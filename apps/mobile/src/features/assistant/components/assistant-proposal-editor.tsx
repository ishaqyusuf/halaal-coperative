import { FullScreenFormSheet } from "@/components/app/full-screen-form-sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type {
  AssistantProposal,
  AssistantProposalFields,
} from "@halaalvest/assistant/contracts"
import { paymentRequestOptions } from "@halaalvest/assistant/intents"
import { type ReactNode, useEffect, useState } from "react"
import { Keyboard, View } from "react-native"
import {
  type ProposalFormErrors,
  type ProposalFormValues,
  proposalFieldsFromForm,
  proposalFormValues,
} from "../model/proposal-model"

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string
  error?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-foreground">{label}</Text>
      {children}
      {error ? (
        <Text accessibilityLiveRegion="polite" className="text-sm text-destructive">
          {error}
        </Text>
      ) : hint ? (
        <Text className="text-sm text-muted-foreground">{hint}</Text>
      ) : null}
    </View>
  )
}

/**
 * Edits one revision in the shared keyboard-safe form sheet. Saving sends
 * the whole field set for a new revision; the person reviews the updated
 * card before confirming. Allocation and the member stay server-chosen.
 */
export function AssistantProposalEditor({
  proposal,
  disabled,
  failed,
  onSave,
  onClose,
}: {
  proposal: AssistantProposal | null
  disabled: boolean
  /** The last save was refused; shown inside the sheet, over the thread. */
  failed: string | null
  onSave: (fields: AssistantProposalFields) => Promise<void>
  onClose: () => void
}) {
  const [values, setValues] = useState<ProposalFormValues | null>(null)
  const [errors, setErrors] = useState<ProposalFormErrors>({})
  const [saving, setSaving] = useState(false)
  const key = proposal ? `${proposal.id}:${proposal.revision}` : null
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset per revision
  useEffect(() => {
    setValues(proposal ? proposalFormValues(proposal.fields) : null)
    setErrors({})
  }, [key])
  const fields = proposal?.fields
  const set = (name: keyof ProposalFormValues) => (text: string) =>
    setValues((current) => (current ? { ...current, [name]: text } : current))
  const off = disabled || saving
  const initial = proposal ? proposalFormValues(proposal.fields) : null
  const dirty =
    !!values &&
    !!initial &&
    (Object.keys(values) as (keyof ProposalFormValues)[]).some(
      (name) => values[name] !== initial[name]
    )

  const save = async () => {
    if (!fields || !values || saving) return
    Keyboard.dismiss()
    const parsed = proposalFieldsFromForm(fields, values)
    if (!parsed.ok) {
      setErrors(parsed.errors)
      return
    }
    setErrors({})
    setSaving(true)
    try {
      await onSave(parsed.fields)
    } finally {
      setSaving(false)
    }
  }

  return (
    <FullScreenFormSheet
      dirty={dirty}
      footer={
        <Button className="h-12" disabled={off || !values} onPress={() => void save()}>
          <Text>{saving ? "Saving…" : "Save changes"}</Text>
        </Button>
      }
      isSubmitting={saving}
      onClose={onClose}
      title="Edit draft"
      visible={!!proposal}
    >
      {fields && values ? (
        <View className="gap-4">
          <Text className="text-base leading-[22px] text-muted-foreground">
            Save changes, then review the updated card before confirming.
          </Text>
          {failed ? (
            <View className="gap-1 rounded-[18px] border border-warn/40 bg-warn/10 p-3">
              <Text className="text-base font-bold text-warn">
                Draft not saved
              </Text>
              <Text className="text-base leading-[22px] text-foreground">
                {failed}
              </Text>
            </View>
          ) : null}
          {fields.kind === "record-payment" ? (
            <Field label="Member">
              <Text className="text-base leading-[22px] text-foreground">
                {fields.member
                  ? `${fields.member.name} · ${fields.member.memberNumber}`
                  : "Not chosen. Name the member in the chat."}
              </Text>
            </Field>
          ) : null}
          {fields.kind === "payment-request" ? (
            <Field label="What is it for?" error={errors.purpose}>
              <View className="gap-2" accessibilityRole="radiogroup">
                {paymentRequestOptions.map((option) => {
                  const selected = values.purpose === option.value
                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected, disabled: off }}
                      className={cn(
                        "min-h-12 justify-center rounded-xl border px-3.5 py-2.5",
                        selected ? "border-brand bg-accent" : "border-border bg-card"
                      )}
                      disabled={off}
                      onPress={() => set("purpose")(option.value)}
                    >
                      <Text
                        className={cn(
                          "text-base leading-[22px]",
                          selected ? "font-bold text-accent-foreground" : "text-foreground"
                        )}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </Field>
          ) : null}
          <Field
            label="Amount (₦)"
            error={errors.amount}
            hint="Naira, e.g. 25000 or 25000.50"
          >
            <Input
              accessibilityLabel="Amount in naira"
              editable={!off}
              keyboardType="decimal-pad"
              onChangeText={set("amount")}
              placeholder="0"
              value={values.amount}
            />
          </Field>
          {fields.kind !== "payment-request" ? (
            <Field label="Date paid" error={errors.paidOn} hint="YYYY-MM-DD">
              <Input
                accessibilityLabel="Date paid"
                autoCapitalize="none"
                editable={!off}
                keyboardType="numbers-and-punctuation"
                onChangeText={set("paidOn")}
                placeholder="2026-11-14"
                value={values.paidOn}
              />
            </Field>
          ) : null}
          {fields.kind === "record-payment" ? (
            <>
              <Field
                label="Collection month"
                error={errors.period}
                hint="YYYY-MM"
              >
                <Input
                  accessibilityLabel="Collection month"
                  autoCapitalize="none"
                  editable={!off}
                  keyboardType="numbers-and-punctuation"
                  onChangeText={set("period")}
                  placeholder="2026-11"
                  value={values.period}
                />
              </Field>
              <Field label="Paid by" error={errors.channel}>
                <Input
                  accessibilityLabel="Paid by"
                  editable={!off}
                  maxLength={80}
                  onChangeText={set("channel")}
                  placeholder="Bank transfer"
                  value={values.channel}
                />
              </Field>
            </>
          ) : null}
          {fields.kind !== "payment-request" ? (
            <Field label="Payment reference" error={errors.paymentReference}>
              <Input
                accessibilityLabel="Payment reference"
                autoCapitalize="none"
                editable={!off}
                maxLength={120}
                onChangeText={set("paymentReference")}
                value={values.paymentReference}
              />
            </Field>
          ) : (
            <Field label="Note" error={errors.note}>
              <Textarea
                accessibilityLabel="Note"
                editable={!off}
                maxLength={500}
                onChangeText={set("note")}
                value={values.note}
              />
            </Field>
          )}
          {"allocations" in fields && fields.allocations.length ? (
            <Text className="text-sm text-muted-foreground">
              The cooperative splits the amount across what is owed when you
              save.
            </Text>
          ) : null}
        </View>
      ) : null}
    </FullScreenFormSheet>
  )
}
