"use client"

import { type KeyboardEvent, useEffect, useRef, useState } from "react"
import {
  defaultStatementMonthKey,
  describeStatementMonth,
  formatStatementAmount,
  interpolateStatementBalances,
  sampleBatchOfficer,
  sampleFinancing,
  type StatementBalances,
  type StatementMonthKey,
  statementMonthKeys,
  statementMonths,
} from "./one-place-v4-statement-data"

const countUpDurationMs = 520
const swapFadeMs = 140

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}

function balancesOf(key: StatementMonthKey): StatementBalances {
  const month = statementMonths[key]

  return {
    financingLeft: month.financingLeft,
    savingsBalance: month.savingsBalance,
  }
}

export function OnePlaceStatement() {
  const [selectedKey, setSelectedKey] = useState<StatementMonthKey>(
    defaultStatementMonthKey
  )
  // The detail lines change after a short fade; the big figures count up.
  const [detailKey, setDetailKey] = useState<StatementMonthKey>(
    defaultStatementMonthKey
  )
  const [fading, setFading] = useState(false)
  const [balances, setBalances] = useState<StatementBalances>(() =>
    balancesOf(defaultStatementMonthKey)
  )
  const [announcement, setAnnouncement] = useState("")
  const balancesRef = useRef(balances)
  const frameRef = useRef<number | null>(null)
  const fadeTimerRef = useRef<number | null>(null)
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      if (fadeTimerRef.current !== null)
        window.clearTimeout(fadeTimerRef.current)
    },
    []
  )

  function applyBalances(next: StatementBalances) {
    balancesRef.current = next
    setBalances(next)
  }

  function countUpTo(target: StatementBalances) {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)

    if (prefersReducedMotion()) {
      applyBalances(target)
      return
    }

    const from = balancesRef.current
    let startedAt: number | null = null
    const step = (now: number) => {
      startedAt ??= now
      const progress = Math.min(1, (now - startedAt) / countUpDurationMs)

      applyBalances(interpolateStatementBalances(from, target, progress))
      frameRef.current = progress < 1 ? requestAnimationFrame(step) : null
    }

    frameRef.current = requestAnimationFrame(step)
  }

  function showMonth(key: StatementMonthKey) {
    if (fadeTimerRef.current !== null) window.clearTimeout(fadeTimerRef.current)

    if (prefersReducedMotion()) {
      setDetailKey(key)
      setFading(false)
    } else {
      setFading(true)
      fadeTimerRef.current = window.setTimeout(() => {
        setDetailKey(key)
        setFading(false)
        fadeTimerRef.current = null
      }, swapFadeMs)
    }

    countUpTo(balancesOf(key))
    setAnnouncement(describeStatementMonth(statementMonths[key]))
  }

  function select(key: StatementMonthKey, focus = false) {
    if (focus) {
      buttonRefs.current[statementMonthKeys.indexOf(key)]?.focus()
    }

    if (key === selectedKey) return

    setSelectedKey(key)
    showMonth(key)
  }

  function onMonthKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) {
    const count = statementMonthKeys.length
    const nextIndex =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? (index + 1) % count
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? (index - 1 + count) % count
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? count - 1
              : null

    if (nextIndex === null) return

    event.preventDefault()
    select(statementMonthKeys[nextIndex]!, true)
  }

  const detail = statementMonths[detailKey]
  const swapClass = fading ? "swap fading" : "swap"

  return (
    <section aria-labelledby="op4-statement-title" className="statement">
      <div className="st-head">
        <div>
          <h2 id="op4-statement-title">Chidinma Okafor</h2>
          <p>
            <span className="nw">UNI-0418</span> · Unity Staff Cooperative
            Society
          </p>
        </div>
        <span className="chip chip-soft">Sample</span>
      </div>

      <div aria-label="Statement month" className="months" role="radiogroup">
        {statementMonthKeys.map((key, index) => {
          const checked = key === selectedKey

          return (
            <button
              aria-checked={checked}
              className="month"
              key={key}
              onClick={() => select(key)}
              onKeyDown={(event) => onMonthKeyDown(event, index)}
              ref={(node) => {
                buttonRefs.current[index] = node
              }}
              role="radio"
              tabIndex={checked ? 0 : -1}
              type="button"
            >
              {statementMonths[key].label}
            </button>
          )
        })}
      </div>

      <div className="figure num">
        <div className="label">
          <span>Savings balance</span>
          <span>Closed {detail.closedOn}</span>
        </div>
        <div className="big">
          <span className="cur">₦</span>
          <span className="val" data-testid="op4-savings-balance">
            {formatStatementAmount(balances.savingsBalance)}
          </span>
        </div>
        <div className={`sub ${swapClass}`}>
          <span>
            Brought forward{" "}
            <b>{formatStatementAmount(detail.broughtForward)}</b>
          </span>
          <span>
            Contribution{" "}
            <b className="plus">
              +{formatStatementAmount(detail.contribution)}
            </b>
          </span>
        </div>
      </div>

      <div className="figure num">
        <div className="label">
          <span>Financing left to repay</span>
          <span>{sampleFinancing.reference}</span>
        </div>
        <div className="big">
          <span className="cur">₦</span>
          <span className="val">
            {formatStatementAmount(balances.financingLeft)}
          </span>
        </div>
        <div className={`sub ${swapClass}`}>
          <span>
            <b>
              Repayment {detail.repaymentNumber} of {sampleFinancing.termMonths}
            </b>
          </span>
          <span>
            Principal{" "}
            <b>−{formatStatementAmount(sampleFinancing.monthlyRepayment)}</b>
          </span>
        </div>
      </div>

      <ul className={`lines num ${swapClass}`}>
        <li>
          <span aria-hidden="true" className="ic">
            <svg
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              viewBox="0 0 20 20"
            >
              <rect height="12" rx="2" width="14" x="3" y="4" />
              <path d="M3 8h14M7 12h3" />
            </svg>
          </span>
          <div>
            <b>
              Payroll batch <span className="nw">{detail.batch}</span>
            </b>
            <small>
              Posted {detail.postedOn} by {sampleBatchOfficer}
            </small>
          </div>
          <span className="amt">
            ₦
            {(
              detail.contribution + sampleFinancing.monthlyRepayment
            ).toLocaleString("en-NG")}
          </span>
        </li>
        <li>
          <span aria-hidden="true" className="ic">
            <svg
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              viewBox="0 0 20 20"
            >
              <path d="M10.5 3H16v5.5l-7.5 7.5L3 10.5z" />
              <circle cx="13" cy="6" r="1" />
            </svg>
          </span>
          <div>
            <b>Monthly levy</b>
            <small>A charge, shown apart from savings</small>
          </div>
          <span className="amt">₦500</span>
        </li>
      </ul>

      <p aria-live="polite" className="sr">
        {announcement}
      </p>
      <div className="zero num">
        <span aria-hidden="true" className="ic">
          <svg
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.2"
            viewBox="0 0 20 20"
          >
            <path d="m4.5 10.5 3.5 3.5 7.5-8" />
          </svg>
        </span>
        <div>
          <b>Interest charged</b>
          <small>
            <span className="nw">{sampleFinancing.reference}</span> is
            interest-free
          </small>
        </div>
        <span className="amt">₦0.00</span>
      </div>
    </section>
  )
}
