"use client"

import { useRef, useState } from "react"
import {
  QaQuickFillButton,
  type QaQuickFillForm,
} from "@halaalvest/ui/components/qa-quick-fill-button"
import { useQaQuickFill } from "@/components/qa-quick-fill-provider"
import { qaQuickFillInputEvent } from "@/lib/qa-quick-fill-input"

/**
 * The dashboard's Quick Fill control. Visible only when the request carries a
 * QA authorization (local, development or preview, see
 * `getRequestQaQuickFillContext`) and, when given, the page's own
 * server-computed `enabled` flag. Never rendered in production.
 */
export function DashboardQuickFill({
  className,
  enabled,
  form,
  isDirty,
  label,
  onFill,
  onUndo,
}: {
  className?: string
  /** The page's server gate (`canShowQuickFill`), when it passes one down. */
  enabled?: boolean
  form?: QaQuickFillForm
  isDirty?: boolean
  label?: string
  onFill: (qa: { emailDomain: string }) => void | Promise<void>
  onUndo?: () => void
}) {
  const quickFill = useQaQuickFill()

  return (
    <QaQuickFillButton
      className={className}
      form={form}
      isDirty={isDirty}
      label={label}
      onFill={() => onFill({ emailDomain: quickFill.emailDomain })}
      onUndo={onUndo}
      qaDomain={quickFill.emailDomain}
      visible={quickFill.enabled && enabled !== false}
    />
  )
}

/** The active QA email domain for recipes ("" when Quick Fill is off). */
export function useDashboardQaEmailDomain() {
  return useQaQuickFill().emailDomain
}

type NativeValue = string | boolean

function setNativeValue(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: NativeValue
) {
  if (element instanceof HTMLInputElement && element.type === "checkbox") {
    if (element.checked !== Boolean(value)) element.click()
    return
  }
  if (element instanceof HTMLInputElement && element.type === "hidden") {
    // Date pickers and selects keep state behind a hidden input; they listen
    // for this event (see useQaQuickFillInput).
    element.dispatchEvent(
      new CustomEvent(qaQuickFillInputEvent, { detail: String(value) })
    )
    return
  }
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : element instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(
    element,
    String(value)
  )
  element.dispatchEvent(new Event("input", { bubbles: true }))
  element.dispatchEvent(new Event("change", { bubbles: true }))
}

function readNativeValue(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
): NativeValue {
  return element instanceof HTMLInputElement && element.type === "checkbox"
    ? element.checked
    : element.value
}

function namedControls(form: HTMLFormElement, name: string) {
  return Array.from(form.elements).filter(
    (
      element
    ): element is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement =>
      (element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement ||
        element instanceof HTMLSelectElement) &&
      element.name === name &&
      !element.disabled
  )
}

/**
 * Quick Fill for native (server-action) forms: place it inside the `<form>`;
 * it sets the named controls and can undo back to the previous values.
 */
export function DashboardNativeQuickFill({
  className,
  enabled,
  values,
}: {
  className?: string
  enabled?: boolean
  values: (qa: {
    emailDomain: string
    form: HTMLFormElement
  }) => Record<string, NativeValue | undefined>
}) {
  const anchor = useRef<HTMLSpanElement>(null)
  const [previous, setPrevious] = useState<Record<string, NativeValue> | null>(
    null
  )

  function form() {
    return anchor.current?.closest("form") ?? null
  }

  return (
    <span className="contents" ref={anchor}>
      <DashboardQuickFill
        className={className}
        enabled={enabled}
        onFill={({ emailDomain }) => {
          const target = form()
          if (!target) return
          const next = values({ emailDomain, form: target })
          const before: Record<string, NativeValue> = {}
          for (const [name, value] of Object.entries(next)) {
            if (value === undefined) continue
            for (const control of namedControls(target, name)) {
              before[name] = readNativeValue(control)
              setNativeValue(control, value)
            }
          }
          setPrevious(before)
        }}
        onUndo={() => {
          const target = form()
          if (!target || !previous) return
          for (const [name, value] of Object.entries(previous)) {
            for (const control of namedControls(target, name)) {
              setNativeValue(control, value)
            }
          }
          setPrevious(null)
        }}
      />
    </span>
  )
}

/**
 * Quick Fill for forms kept in `useState`: pass the current draft and how to
 * restore it; Undo puts the draft back as it was before the fill.
 */
export function DashboardStateQuickFill<TDraft>({
  className,
  draft,
  enabled,
  isDirty,
  label,
  onFill,
  restore,
}: {
  className?: string
  draft: TDraft
  enabled?: boolean
  isDirty?: boolean
  label?: string
  onFill: (qa: { emailDomain: string }) => void
  restore: (draft: TDraft) => void
}) {
  const [previous, setPrevious] = useState<{ draft: TDraft } | null>(null)

  return (
    <DashboardQuickFill
      className={className}
      enabled={enabled}
      isDirty={isDirty}
      label={label}
      onFill={(qa) => {
        setPrevious({ draft })
        onFill(qa)
      }}
      onUndo={() => {
        if (previous) restore(previous.draft)
        setPrevious(null)
      }}
    />
  )
}
