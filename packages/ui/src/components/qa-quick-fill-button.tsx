"use client"

import { useState } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@halaalvest/ui/components/alert-dialog"
import { Button } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"

/**
 * The minimal react-hook-form surface Quick Fill needs for "replace draft?"
 * confirmation and Undo. Any `useForm()` return value satisfies it.
 */
export type QaQuickFillForm = {
  formState: { isDirty: boolean }
  getValues: () => unknown
  reset: (values?: never) => void
}

export type QaQuickFillButtonProps = {
  className?: string
  /** Optional RHF form: enables dirty-draft confirmation and Undo. */
  form?: QaQuickFillForm
  /** Treat the draft as dirty (for forms without react-hook-form). */
  isDirty?: boolean
  label?: string
  onFill: () => void | Promise<void>
  /** Restores the previous draft; derived from `form` when omitted. */
  onUndo?: () => void
  /** The QA Domain the synthetic emails use, shown as a hint. */
  qaDomain?: string | null
  /** The app's own QA gate decides this. Hidden (renders nothing) when false. */
  visible: boolean
}

/**
 * The shared Quick Fill control for web forms (dev and preview only; each app
 * owns the gate through `visible`). The accessible name stays "Quick fill" so
 * smoke tests can find it; the QA badge is decorative.
 */
export function QaQuickFillButton({
  className,
  form,
  isDirty,
  label = "Quick fill",
  onFill,
  onUndo,
  qaDomain,
  visible,
}: QaQuickFillButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [snapshot, setSnapshot] = useState<{ values: unknown } | null>(null)
  const [undoAvailable, setUndoAvailable] = useState(false)
  // Read during render so react-hook-form subscribes to dirty state.
  const dirty = isDirty ?? form?.formState.isDirty ?? false

  if (!visible) return null

  async function fill() {
    if (form) setSnapshot({ values: structuredCloneSafe(form.getValues()) })
    await onFill()
    setUndoAvailable(Boolean(form || onUndo))
  }

  function undo() {
    if (onUndo) onUndo()
    else if (form && snapshot) form.reset(snapshot.values as never)
    setUndoAvailable(false)
    setSnapshot(null)
  }

  return (
    <div
      className={cn("flex items-center justify-end gap-2", className)}
      data-qa-quick-fill="true"
    >
      {undoAvailable ? (
        <Button onClick={undo} size="sm" type="button" variant="ghost">
          Undo
        </Button>
      ) : null}
      <Button
        onClick={() => (dirty ? setConfirmOpen(true) : void fill())}
        size="sm"
        title={
          qaDomain
            ? `Fill with synthetic QA values using @${qaDomain}`
            : "Fill with synthetic QA values"
        }
        type="button"
        variant="outline"
      >
        {label}
        <span
          aria-hidden="true"
          className="rounded-sm bg-primary/10 px-1 text-[0.625rem] font-semibold tracking-wide text-primary"
        >
          QA
        </span>
      </Button>
      <AlertDialog onOpenChange={setConfirmOpen} open={confirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace current draft?</AlertDialogTitle>
            <AlertDialogDescription>
              Quick fill replaces what you have typed with synthetic QA values.
              You can undo it afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep my draft</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false)
                void fill()
              }}
            >
              Replace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function structuredCloneSafe(value: unknown) {
  try {
    return structuredClone(value)
  } catch {
    return value
  }
}
