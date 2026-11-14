"use client"

import { Button } from "@halaalvest/ui/components/button"
import { ArrowUp02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { type ReactNode, useLayoutEffect, useRef, useState } from "react"

export const COMPOSER_MAX = 4000

type ComposerProps = {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  /** A reply is on its way; sending waits for it. */
  busy: boolean
  /** The box itself is off (assistant unavailable, chat failed to load). */
  disabled: boolean
  placeholder: string
  label: string
  /** Shown under the box. */
  footer?: ReactNode
}

/**
 * The chat box shared by the assistant page and the quick widget (ported
 * from EwaTrade; voice and attachments are not in the first release). One
 * line to start, grows to 3 lines on phones and 5 on larger screens. Enter
 * adds a line; the round Send button or Ctrl/⌘+Enter sends.
 */
export function AssistantComposer({
  value,
  onChange,
  onSend,
  busy,
  disabled,
  placeholder,
  label,
  footer,
}: ComposerProps) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  // Wrapped text stacks the box (text on top, button below) until cleared;
  // large screens are always stacked.
  const [wrapped, setWrapped] = useState(false)
  useLayoutEffect(() => {
    const textarea = inputRef.current
    if (!textarea) return
    textarea.style.height = ""
    if (!value) {
      setWrapped(false)
      return
    }
    const style = getComputedStyle(textarea)
    const lineHeight = Number.parseFloat(style.lineHeight)
    const padding =
      Number.parseFloat(style.paddingTop) +
      Number.parseFloat(style.paddingBottom)
    if (textarea.scrollHeight - padding > lineHeight * 1.5) setWrapped(true)
    const lines = window.matchMedia("(min-width: 768px)").matches ? 5 : 3
    textarea.style.height = `${Math.min(textarea.scrollHeight, lineHeight * lines + padding)}px`
  }, [value])
  const stacked = wrapped || value.includes("\n")
  const canSend =
    !busy &&
    !disabled &&
    value.trim().length > 0 &&
    value.length <= COMPOSER_MAX
  const send = () => {
    if (canSend) onSend()
  }
  const round = "size-9 shrink-0 rounded-[50%]"

  return (
    <div>
      <form
        className="rounded-[26px] border border-border bg-background p-1.5 shadow-xs"
        onSubmit={(event) => {
          event.preventDefault()
          send()
        }}
      >
        <div className="flex flex-wrap items-center gap-1">
          <div
            className={`relative min-w-0 ${stacked ? "order-1 basis-full" : "order-2 flex-1"} lg:order-1 lg:basis-full`}
          >
            <textarea
              ref={inputRef}
              aria-label={label}
              rows={1}
              className="block w-full resize-none bg-transparent px-3 py-2 text-sm leading-5 outline-none disabled:opacity-60"
              maxLength={COMPOSER_MAX + 1}
              value={value}
              disabled={disabled}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={(event) => {
                // Enter is a new line; Ctrl/⌘+Enter sends.
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault()
                  send()
                }
              }}
            />
            {value ? null : (
              // One line only; the field's own placeholder would wrap.
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-3 top-2 truncate text-sm leading-5 text-muted-foreground"
              >
                {placeholder}
              </span>
            )}
          </div>
          <span
            aria-hidden
            className={`${stacked ? "order-3 flex-1" : "hidden"} lg:order-3 lg:block lg:flex-1`}
          />
          <div className="order-4 flex items-center gap-1">
            <Button
              type="submit"
              size="icon"
              className={`${round} disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100`}
              aria-label="Send"
              title="Send (Ctrl+Enter)"
              disabled={!canSend}
            >
              <HugeiconsIcon icon={ArrowUp02Icon} className="size-4" />
            </Button>
          </div>
        </div>
      </form>
      {value.length > COMPOSER_MAX ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          Shorten the message to 4,000 characters before sending.
        </p>
      ) : footer ? (
        <div className="mt-1.5 px-4 text-[11px] text-muted-foreground">
          {footer}
        </div>
      ) : null}
    </div>
  )
}
