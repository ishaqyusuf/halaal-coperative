"use client"

import { useRef, useState } from "react"

/** The members band phone: a guarantor request the visitor can answer (sample only). */
export function HomepageGuarantor({ mobileAccessLabel }: { mobileAccessLabel: string }) {
  const [answer, setAnswer] = useState<"yes" | "no" | null>(null)
  const approveRef = useRef<HTMLButtonElement>(null)
  const undoRef = useRef<HTMLButtonElement>(null)

  const choose = (value: "yes" | "no") => {
    setAnswer(value)
    requestAnimationFrame(() => undoRef.current?.focus())
  }
  const undo = () => {
    setAnswer(null)
    requestAnimationFrame(() => approveRef.current?.focus())
  }

  return (
    <div className="phone">
      <div
        aria-label="Sample guarantor request on Amina Suleiman's phone"
        className="screen num"
        role="region"
      >
        <span aria-hidden="true" className="notch" />
        <div aria-hidden="true" className="s-bar">
          <span>9:41</span>
          <span>100%</span>
        </div>
        <div className="s-app">
          <b>Guarantor requests</b>
          <span>{answer ? "0 waiting" : "1 waiting"}</span>
        </div>
        <div className="g-card" data-answered={answer ? "" : undefined}>
          <small>Musa Bello · UNI-0112 asked you</small>
          <b>Be a guarantor for FN-0201</b>
          <dl>
            <dt>Amount</dt>
            <dd>₦300,000</dd>
            <dt>Term</dt>
            <dd>12 months</dd>
            <dt>Monthly</dt>
            <dd>₦25,000</dd>
            <dt>Interest</dt>
            <dd>₦0.00</dd>
          </dl>
          {answer ? (
            <p className={`g-done${answer === "no" ? " no" : ""}`} role="status">
              {answer === "yes"
                ? "You approved. Musa Bello and the committee can see your answer."
                : "You declined. Musa Bello can ask another member."}{" "}
              <button onClick={undo} ref={undoRef} type="button">
                Undo
              </button>
            </p>
          ) : (
            <div className="g-actions">
              <button className="g-yes" onClick={() => choose("yes")} ref={approveRef} type="button">
                Approve
              </button>
              <button className="g-no" onClick={() => choose("no")} type="button">
                Decline
              </button>
            </div>
          )}
        </div>
        <div className="s-month">Your account</div>
        <div aria-hidden="true" className="s-list">
          {[
            ["Statement", "October 2026 · ₦437,000 savings"],
            ["My financing", "FN-0192 · ₦450,000 left"],
            ["Mobile app", `Optional · ${mobileAccessLabel} for 12 months`],
          ].map(([title, detail]) => (
            <span className="s-row" key={title}>
              <span>
                <b>{title}</b>
                <small>{detail}</small>
              </span>
              <svg
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 16 16"
              >
                <path d="m6 4 4 4-4 4" />
              </svg>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
