"use client"

import { useCallback, useRef } from "react"

/** Event the native Quick Fill dispatches on a component's hidden input. */
export const qaQuickFillInputEvent = "qa-quick-fill"

/**
 * Lets a component that keeps its own state behind a hidden `<input name>`
 * (date pickers, selects) accept a value from the native-form Quick Fill.
 * Returns a ref callback for that hidden input.
 */
export function useQaQuickFillInput(onValue: (value: string) => void) {
  const latest = useRef(onValue)
  latest.current = onValue

  return useCallback((input: HTMLInputElement | null) => {
    if (!input) return
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail
      latest.current(typeof detail === "string" ? detail : String(detail ?? ""))
    }
    input.addEventListener(qaQuickFillInputEvent, listener)
    return () => input.removeEventListener(qaQuickFillInputEvent, listener)
  }, [])
}
