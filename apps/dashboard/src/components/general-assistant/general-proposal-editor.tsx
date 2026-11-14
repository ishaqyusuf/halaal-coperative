"use client"

import type {
  AssistantProposal,
  AssistantProposalFields,
} from "@halaalvest/assistant/contracts"
import { paymentRequestOptions } from "@halaalvest/assistant/intents"
import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import { Label } from "@halaalvest/ui/components/label"
import {
  NativeSelect,
  NativeSelectOption,
} from "@halaalvest/ui/components/native-select"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { type ReactNode, useId, useState } from "react"
import {
  type ProposalFormErrors,
  type ProposalFormValues,
  proposalFieldsFromForm,
  proposalFormValues,
} from "./proposal-model"

function Field({
  label,
  error,
  hint,
  children,
  id,
}: {
  label: string
  error?: string
  hint?: string
  id: string
  children: ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

/**
 * Edits one revision. Saving sends the whole field set for a new revision;
 * the person reviews the updated card before confirming. Allocation and the
 * member stay server-chosen (ask in chat to change the member).
 */
export function GeneralProposalEditor({
  proposal,
  disabled,
  onSave,
  onCancel,
}: {
  proposal: AssistantProposal
  disabled: boolean
  onSave: (fields: AssistantProposalFields) => Promise<void>
  onCancel: () => void
}) {
  const base = useId()
  const fields = proposal.fields
  const [values, setValues] = useState<ProposalFormValues>(() =>
    proposalFormValues(fields)
  )
  const [errors, setErrors] = useState<ProposalFormErrors>({})
  const [saving, setSaving] = useState(false)
  const set =
    (key: keyof ProposalFormValues) =>
    (event: { target: { value: string } }) =>
      setValues((current) => ({ ...current, [key]: event.target.value }))
  const fieldProps = (key: keyof ProposalFormValues) => ({
    id: `${base}-${key}`,
    value: values[key],
    onChange: set(key),
    disabled: disabled || saving,
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `${base}-${key}-error` : undefined,
  })

  return (
    <form
      className="grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault()
        if (saving) return
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
      }}
    >
      {fields.kind === "record-payment" ? (
        <div className="grid gap-1">
          <p className="text-sm font-medium">Member</p>
          <p className="text-sm text-muted-foreground">
            {fields.member
              ? `${fields.member.name} · ${fields.member.memberNumber}`
              : "Not chosen. Name the member in the chat."}
          </p>
        </div>
      ) : null}
      {fields.kind === "payment-request" ? (
        <Field
          id={`${base}-purpose`}
          label="What is it for?"
          error={errors.purpose}
        >
          <NativeSelect className="w-full" {...fieldProps("purpose")}>
            <NativeSelectOption value="">Choose one</NativeSelectOption>
            {paymentRequestOptions.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      ) : null}
      <Field
        id={`${base}-amount`}
        label="Amount (₦)"
        error={errors.amount}
        hint="Naira, e.g. 25000 or 25000.50"
      >
        <Input inputMode="decimal" autoComplete="off" {...fieldProps("amount")} />
      </Field>
      {fields.kind !== "payment-request" ? (
        <Field id={`${base}-paidOn`} label="Date paid" error={errors.paidOn}>
          <Input type="date" {...fieldProps("paidOn")} />
        </Field>
      ) : null}
      {fields.kind === "record-payment" ? (
        <>
          <Field
            id={`${base}-period`}
            label="Collection month"
            error={errors.period}
          >
            <Input type="month" {...fieldProps("period")} />
          </Field>
          <Field id={`${base}-channel`} label="Paid by" error={errors.channel}>
            <Input
              placeholder="e.g. Bank transfer"
              maxLength={80}
              {...fieldProps("channel")}
            />
          </Field>
        </>
      ) : null}
      {fields.kind !== "payment-request" ? (
        <Field
          id={`${base}-paymentReference`}
          label="Payment reference"
          error={errors.paymentReference}
        >
          <Input maxLength={120} {...fieldProps("paymentReference")} />
        </Field>
      ) : (
        <Field id={`${base}-note`} label="Note" error={errors.note}>
          <Textarea rows={3} maxLength={500} {...fieldProps("note")} />
        </Field>
      )}
      {"allocations" in fields && fields.allocations.length ? (
        <p className="text-xs text-muted-foreground">
          The cooperative splits the amount across what you owe when you save.
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          disabled={saving}
          onClick={onCancel}
        >
          Back
        </Button>
        <Button type="submit" disabled={disabled || saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  )
}
