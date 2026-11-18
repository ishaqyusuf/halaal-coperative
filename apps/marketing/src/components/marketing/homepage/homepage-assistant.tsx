"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  type AssistantCard,
  type AssistantStep,
  assistantConversations,
} from "./homepage-data"

type Who = keyof typeof assistantConversations
type Shown = { animate: boolean; id: number; step: AssistantStep }

const TYPE_MS = 28

function AssistantCardView({ card }: { card: AssistantCard }) {
  const [outcome, setOutcome] = useState<"done" | "cancelled" | null>(null)

  return (
    <div className="card">
      <div className="card-h">
        <b>{card.title}</b>
        <small>{card.subtitle}</small>
      </div>
      <dl>
        {card.rows.map(([label, value, tone]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd className={tone === "good" ? "g" : undefined}>{value}</dd>
          </div>
        ))}
      </dl>
      {card.confirm ? (
        outcome === "done" ? (
          <p className="done" role="status">
            <svg
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.2"
              viewBox="0 0 16 16"
            >
              <path d="m3 8.5 3 3 7-7.5" />
            </svg>
            {card.confirm.doneText}
          </p>
        ) : outcome === "cancelled" ? (
          <p className="note" role="status">
            {card.confirm.cancelledText}
          </p>
        ) : (
          <div className="acts">
            <button className="go" onClick={() => setOutcome("done")} type="button">
              {card.confirm.confirmLabel}
            </button>
            <button className="no" onClick={() => setOutcome("cancelled")} type="button">
              {card.confirm.cancelLabel}
            </button>
          </div>
        )
      ) : null}
    </div>
  )
}

/** The website AI assistant panel, replaying a sample conversation. */
export function HomepageAssistant() {
  const [who, setWho] = useState<Who>("member")
  const [shown, setShown] = useState<Shown[]>(() =>
    assistantConversations.member.steps.map((step, id) => ({ animate: false, id, step }))
  )
  const [typing, setTyping] = useState(false)
  const [draft, setDraft] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [run, setRun] = useState(0)
  const timers = useRef<number[]>([])
  const threadRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const switches = useRef<Array<HTMLButtonElement | null>>([])
  const reduceRef = useRef(true)
  const playedRef = useRef(false)

  const clear = () => {
    timers.current.forEach((timer) => window.clearTimeout(timer))
    timers.current = []
  }

  const play = useCallback((next: Who, instant: boolean) => {
    clear()
    const conversation = assistantConversations[next]
    setRun((value) => value + 1)
    setTyping(false)
    setDraft(null)
    setSending(false)
    if (instant) {
      setShown(conversation.steps.map((step, id) => ({ animate: false, id, step })))
      return
    }
    setShown([])
    let t = 200
    const at = (ms: number, fn: () => void) => {
      timers.current.push(window.setTimeout(fn, ms))
    }
    conversation.steps.forEach((step, id) => {
      if (step.kind === "me") {
        const text = step.text
        at(t, () => setDraft(""))
        for (let i = 1; i <= text.length; i += 1) {
          at(t + i * TYPE_MS, () => setDraft(text.slice(0, i)))
        }
        t += text.length * TYPE_MS + 250
        at(t, () => setSending(true))
        at(t + 220, () => {
          setSending(false)
          setDraft(null)
          setShown((list) => [...list, { animate: true, id, step }])
        })
        t += 520
      } else {
        at(t, () => setTyping(true))
        t += 900
        at(t, () => {
          setTyping(false)
          setShown((list) => [...list, { animate: true, id, step }])
        })
        t += 900
      }
    })
  }, [])

  // Keep the newest message in view, as a chat does.
  useEffect(() => {
    const thread = threadRef.current
    if (!thread) return
    thread.scrollTo({ top: thread.scrollHeight, behavior: reduceRef.current ? "auto" : "smooth" })
  }, [shown, typing])

  // Play once when the panel scrolls into view (motion allowed only).
  useEffect(() => {
    reduceRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const panel = panelRef.current
    if (reduceRef.current || !panel || !("IntersectionObserver" in window)) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !playedRef.current) {
          playedRef.current = true
          play("member", false)
          observer.disconnect()
        }
      },
      { threshold: 0.45 }
    )
    observer.observe(panel)
    return () => {
      observer.disconnect()
      clear()
    }
  }, [play])

  const pick = (next: Who) => {
    setWho(next)
    play(next, reduceRef.current)
  }

  const conversation = assistantConversations[who]
  const people: Who[] = ["member", "staff"]

  return (
    <div className="assist-grid">
      <div>
        <h2 id="assist-title">
          <span className="l1">Your records.</span> <span>Ask the AI.</span>
        </h2>
        <p className="sub">Ask in plain words, on the website.</p>
        <p className="lede">
          Members ask about their savings, financing and receipts. Staff look up
          a member or record a payment. The AI assistant answers from your own
          records and prepares drafts for a person to confirm.
        </p>
        <div className="assist-actions">
          <div aria-label="Conversation" className="who-switch" role="tablist">
            {people.map((person, index) => (
              <button
                aria-selected={who === person}
                key={person}
                onClick={() => pick(person)}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return
                  event.preventDefault()
                  const other = people[(index + 1) % people.length]!
                  switches.current[(index + 1) % people.length]?.focus()
                  pick(other)
                }}
                ref={(element) => {
                  switches.current[index] = element
                }}
                role="tab"
                tabIndex={who === person ? 0 : -1}
                type="button"
              >
                {person === "member" ? "A member asks" : "A treasurer asks"}
              </button>
            ))}
          </div>
          <button className="replay" onClick={() => play(who, reduceRef.current)} type="button">
            <svg
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              viewBox="0 0 16 16"
            >
              <path d="M2.5 8a5.5 5.5 0 1 0 1.7-4" />
              <path d="M2.5 2.5v3h3" />
            </svg>
            Watch the conversation
          </button>
        </div>
        <p className="fine">
          Nothing posts until a person confirms it. Permissions are checked on
          every answer.
        </p>
      </div>

      <div
        aria-label="Sample conversation with the Halaalvest AI assistant"
        className="panel"
        ref={panelRef}
        role="region"
      >
        <div className="p-head">
          <span className="p-mark">
            <svg
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.7"
              viewBox="0 0 16 16"
            >
              <path d="M8 1.8v2.4M8 11.8v2.4M1.8 8h2.4M11.8 8h2.4M3.6 3.6l1.6 1.6M10.8 10.8l1.6 1.6M3.6 12.4l1.6-1.6M10.8 5.2l1.6-1.6" />
            </svg>
          </span>
          <div className="p-title">
            <b>AI assistant</b>
            <span>{conversation.who}</span>
          </div>
          <span aria-hidden="true" className="p-key">
            ⌘ J
          </span>
        </div>
        <div aria-live="polite" className="p-thread num" ref={threadRef}>
          {shown.map(({ animate, id, step }) => (
            <div
              className={`msg ${step.kind}`}
              key={`${run}-${id}`}
              style={animate ? undefined : { animation: "none" }}
            >
              {step.kind === "me" ? step.text : <AssistantCardView card={step.card} />}
            </div>
          ))}
          {typing ? (
            <div aria-hidden="true" className="typing">
              <i />
              <i />
              <i />
            </div>
          ) : null}
        </div>
        <div aria-hidden="true" className="p-compose">
          <span className={draft !== null ? "typed" : undefined}>
            {draft ?? conversation.hint}
          </span>
          <i className={sending ? "on" : undefined}>
            <svg
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 16 16"
            >
              <path d="M8 13V3.5M3.8 7.5 8 3.3l4.2 4.2" />
            </svg>
          </i>
        </div>
      </div>
    </div>
  )
}
