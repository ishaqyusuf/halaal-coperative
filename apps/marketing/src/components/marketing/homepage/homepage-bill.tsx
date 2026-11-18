"use client"

import { useId, useState } from "react"
import {
  assistantFreeMessages,
  formatAmount,
  mobileAccessLabel,
  mobileAccessMonths,
  sampleMonthlyBill,
  seatFeeLabel,
} from "./homepage-data"

type Field = "seats" | "mobileApprovals" | "assistantMessagesUsed"

const fields: readonly { key: Field; label: string; max: number; step: number }[] = [
  { key: "seats", label: "Members active at month end", max: 100_000, step: 1 },
  { key: "mobileApprovals", label: "New mobile approvals", max: 100_000, step: 1 },
  { key: "assistantMessagesUsed", label: "AI assistant messages used", max: 1_000_000, step: 50 },
]

function clampWhole(value: string | number, max: number) {
  const number = Math.floor(Number(value))
  if (!Number.isFinite(number) || number < 0) return 0
  return Math.min(number, max)
}

/** A sample monthly bill the visitor can edit; amounts come from the platform billing rules. */
export function HomepageBill() {
  const id = useId()
  const [values, setValues] = useState<Record<Field, string>>({
    assistantMessagesUsed: "420",
    mobileApprovals: "6",
    seats: "431",
  })

  const numbers = Object.fromEntries(
    fields.map(({ key, max }) => [key, clampWhole(values[key], max)])
  ) as Record<Field, number>
  const bill = sampleMonthlyBill(numbers)

  const set = (key: Field, value: string) =>
    setValues((current) => ({ ...current, [key]: value }))
  const nudge = (key: Field, by: number, max: number) =>
    set(key, String(Math.max(0, clampWhole(numbers[key] + by, max))))

  return (
    <div aria-labelledby={`${id}-title`} className="bill" role="group">
      <div className="bill-head">
        <div>
          <b id={`${id}-title`}>Monthly bill</b>
          <small>Unity Staff Cooperative Society</small>
        </div>
        <span className="tag">Sample</span>
      </div>
      <div className="bill-inputs">
        {fields.map(({ key, label, max, step }) => (
          <div className="num-field" key={key}>
            <label htmlFor={`${id}-${key}`}>{label}</label>
            <div className="stepper">
              <input
                id={`${id}-${key}`}
                inputMode="numeric"
                max={max}
                min={0}
                onBlur={() => set(key, String(numbers[key]))}
                onChange={(event) => set(key, event.target.value)}
                step={step}
                type="number"
                value={values[key]}
              />
              <button
                aria-label={`Decrease ${label.toLowerCase()}`}
                onClick={() => nudge(key, -step, max)}
                type="button"
              >
                <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 16 16">
                  <path d="M3.5 8h9" />
                </svg>
              </button>
              <button
                aria-label={`Increase ${label.toLowerCase()}`}
                onClick={() => nudge(key, step, max)}
                type="button"
              >
                <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 16 16">
                  <path d="M8 3.5v9M3.5 8h9" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
      <table className="bill-lines">
        <tbody>
          <tr>
            <td>
              <b>Seats</b>
              <small>
                {bill.seats.toLocaleString("en-US")} × {seatFeeLabel}
              </small>
            </td>
            <td>{formatAmount(bill.seatAmount)}</td>
          </tr>
          <tr>
            <td>
              <b>Website AI assistant</b>
              <small>
                {bill.extraMessages
                  ? `${assistantFreeMessages} included, ${bill.extraMessages.toLocaleString("en-US")} extra`
                  : `${bill.used.toLocaleString("en-US")} of ${assistantFreeMessages} included`}
              </small>
            </td>
            <td>{formatAmount(bill.assistantAmount)}</td>
          </tr>
          <tr>
            <td>
              <b>Mobile app access</b>
              <small>
                {bill.approvals.toLocaleString("en-US")} × {mobileAccessLabel},{" "}
                {mobileAccessMonths} months each
              </small>
            </td>
            <td>{formatAmount(bill.mobileAmount)}</td>
          </tr>
          <tr className="zero">
            <td>
              <b>Share of member funds</b>
              <small>Not charged</small>
            </td>
            <td>₦0.00</td>
          </tr>
        </tbody>
      </table>
      <div aria-live="polite" className="bill-total num">
        <span>Total for the month</span>
        <strong>{formatAmount(bill.total)}</strong>
      </div>
      <p className="bill-foot">
        Extra AI assistant messages assume billing is on with a cap above this
        month&apos;s use. Provider pass-through costs are not shown.
      </p>
    </div>
  )
}
