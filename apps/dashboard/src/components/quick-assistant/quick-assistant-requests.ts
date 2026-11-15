"use client"

import { useEffect, useSyncExternalStore } from "react"

/**
 * Opens the quick assistant from anywhere in the dashboard (ported from
 * EwaTrade's `page-fab/fab-slot.ts`). A prefill only fills the composer; it
 * is never sent.
 */
const ASSISTANT_REQUEST = "halaalvest:open-quick-assistant"

// A composer prefill waits here until an assistant chat takes it: the quick
// panel mounts lazily, and the /assistant fallback mounts after navigation.
let pendingDraft: string | null = null
const draftListeners = new Set<() => void>()

/**
 * Opens the quick assistant, optionally with `draft` in its composer.
 * Returns false when no mounted launcher took the request (for example on
 * the assistant page); the draft then stays pending for `/assistant`.
 */
export function requestQuickAssistant({ draft }: { draft?: string } = {}) {
  if (draft) {
    pendingDraft = draft
    for (const listener of draftListeners) listener()
  }
  const request = new Event(ASSISTANT_REQUEST, { cancelable: true })
  window.dispatchEvent(request)
  return request.defaultPrevented
}

/** Calls `take` with a pending prefill on mount and whenever a new one arrives. */
export function useAssistantDraftRequests(take: (draft: string) => void) {
  useEffect(() => {
    const onDraft = () => {
      const draft = pendingDraft
      pendingDraft = null
      if (draft) take(draft)
    }
    onDraft()
    draftListeners.add(onDraft)
    return () => {
      draftListeners.delete(onDraft)
    }
  }, [take])
}

let launchers = 0
const listeners = new Set<() => void>()
const notify = () => {
  for (const listener of listeners) listener()
}
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** The shell's launcher: takes open requests while mounted. */
export function useQuickAssistantRequests(open: () => void) {
  useEffect(() => {
    const onRequest = (event: Event) => {
      event.preventDefault()
      open()
    }
    window.addEventListener(ASSISTANT_REQUEST, onRequest)
    return () => window.removeEventListener(ASSISTANT_REQUEST, onRequest)
  }, [open])
  useEffect(() => {
    launchers += 1
    notify()
    return () => {
      launchers -= 1
      notify()
    }
  }, [])
}

/** True while the shell's quick assistant launcher is mounted. */
export function useQuickAssistantLauncher() {
  return useSyncExternalStore(
    subscribe,
    () => launchers > 0,
    () => false
  )
}

/** ⌘J / Ctrl+J toggles the quick assistant (⌘K stays with search). */
export function isQuickAssistantShortcut(event: {
  key: string
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
}) {
  return (
    event.key.toLowerCase() === "j" &&
    (event.metaKey || event.ctrlKey) &&
    !event.altKey &&
    !event.shiftKey
  )
}

/** Composer prefill for a staff member's "Ask assistant" on a member record. */
export function memberHistoryDraft(memberNumber: string) {
  return `Show ${memberNumber}'s history`
}

/** Composer prefill for "Ask assistant" while reviewing a payment receipt. */
export function receiptReviewDraft(memberNumber: string) {
  return `Show ${memberNumber}'s statement and recent receipts`
}

/**
 * Opens the quick panel with `draft` in its composer, or the assistant page
 * (which takes the same pending draft) when no launcher is mounted. Never
 * sends.
 */
export function askAssistant(draft: string, openPage: () => void) {
  if (!requestQuickAssistant({ draft })) openPage()
}
