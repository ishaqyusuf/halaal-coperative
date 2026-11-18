"use client"

import {
  type CSSProperties,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import {
  financingLeft,
  formatAmount,
  type HeroMember,
  type HeroMemberKey,
  heroMembers,
  payrollDeduction,
  samplePayroll,
  savingsBalance,
} from "./homepage-data"
import { HomepageMark } from "./homepage-mark"

const SWAP_OUT_MS = 170
const TOUR_MOVE_MS = 850
const TOUR_DWELL_MS = 3400
const TOUR_IDLE_RETRY_MS = 1500
const USER_HOLD_MS = 9000

function membersByKey(key: HeroMemberKey) {
  return heroMembers.find((member) => member.key === key) ?? heroMembers[0]!
}

/** Eases a number from `from` to `to` inside animation frames only, so a paused page keeps the final value. */
function animateNumber(
  from: number,
  to: number,
  ms: number,
  onFrame: (value: number) => void
) {
  let start: number | null = null
  let frame = requestAnimationFrame(function step(now) {
    if (start === null) start = now
    const k = Math.max(0, Math.min(1, (now - start) / ms))
    const eased = 1 - (1 - k) ** 3
    onFrame(k < 1 ? from + (to - from) * eased : to)
    if (k < 1) frame = requestAnimationFrame(step)
  })
  return () => cancelAnimationFrame(frame)
}

function Check() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.4"
      viewBox="0 0 16 16"
    >
      <path d="m3.5 8.5 3 3 6-7" />
    </svg>
  )
}

function StatementBody({
  balance,
  member,
  targetRef,
}: {
  balance: number
  member: HeroMember
  targetRef: (element: HTMLDivElement | null) => void
}) {
  const broughtForward = (
    <div className="s-line">
      <div>
        <b>Brought forward</b>
        <small>1 Oct</small>
      </div>
      <span className="amt">{formatAmount(member.broughtForward)}</span>
    </div>
  )

  return (
    <>
      <div className="s-who">
        <small>Unity Staff Cooperative · sample</small>
        <b>
          {member.name} · {member.memberNumber}
        </b>
        <div className="s-bal">
          <span>Savings balance</span>
          <strong>{formatAmount(Math.round(balance))}</strong>
        </div>
      </div>
      <div className="s-month">October 2026</div>
      {member.held ? (
        <>
          <div className="s-note" ref={targetRef}>
            <b>October deduction under review</b>
            Your employer deducted {formatAmount(member.held.deducted, false)}.
            The cooperative expected {formatAmount(member.held.expected, false)},
            so the treasurer is checking it before it posts.
          </div>
          {broughtForward}
        </>
      ) : (
        <>
          {broughtForward}
          <div className="s-line target" ref={targetRef}>
            <div>
              <b>Contribution</b>
              <small>
                October payroll ·{" "}
                <span className="nw">{samplePayroll.batch}</span>
              </small>
            </div>
            <span className="amt plus">
              +{formatAmount(member.contribution)}
            </span>
          </div>
          {member.financing ? (
            <>
              <div className="s-line">
                <div>
                  <b>Repayment {member.financing.paymentNumber}</b>
                  <small>
                    <span className="nw">{member.financing.reference}</span> ·
                    October payroll
                  </small>
                </div>
                <span className="amt">
                  −{formatAmount(member.financing.repayment)}
                </span>
              </div>
              <div className="s-line">
                <div>
                  <b>Left to repay</b>
                  <small>
                    <span className="nw">{member.financing.reference}</span> ·
                    ₦0 interest
                  </small>
                </div>
                <span className="amt">
                  {formatAmount(financingLeft(member.financing))}
                </span>
              </div>
            </>
          ) : null}
        </>
      )}
    </>
  )
}

export function HomepageHero() {
  const [selected, setSelected] = useState<HeroMemberKey>("amina")
  const [shown, setShown] = useState<HeroMemberKey>("amina")
  const [swap, setSwap] = useState<"idle" | "out" | "in">("idle")
  const [balance, setBalance] = useState(() => savingsBalance(heroMembers[0]!))
  const [counts, setCounts] = useState<{ held: number; posted: number }>({
    held: samplePayroll.held,
    posted: samplePayroll.posted,
  })
  const [intro, setIntro] = useState(false)
  const [motion, setMotion] = useState(false)
  const [paused, setPaused] = useState(false)

  const composeRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  const rowRefs = useRef(new Map<HeroMemberKey, HTMLTableRowElement>())
  const targetRef = useRef<HTMLDivElement | null>(null)
  const wireRef = useRef<SVGSVGElement>(null)
  const pathRef = useRef<SVGPathElement>(null)
  const dotARef = useRef<SVGCircleElement>(null)
  const dotBRef = useRef<SVGCircleElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)

  const balanceRef = useRef(balance)
  const selectedRef = useRef(selected)
  const pausedRef = useRef(paused)
  const motionRef = useRef(motion)
  const timers = useRef<number[]>([])
  const stopBalance = useRef<(() => void) | null>(null)
  const pendingDraw = useRef<"animate" | "still" | null>(null)
  const tour = useRef({ hold: false, inView: false, started: false, userUntil: 0 })

  // Event handlers and timers read the latest state through these refs.
  useLayoutEffect(() => {
    balanceRef.current = balance
    selectedRef.current = selected
    pausedRef.current = paused
    motionRef.current = motion
  }, [balance, selected, paused, motion])

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }, [])

  const draw = useCallback((animate: boolean) => {
    const wire = wireRef.current
    const compose = composeRef.current
    const table = tableRef.current
    const row = rowRefs.current.get(selectedRef.current)
    const target = targetRef.current
    const path = pathRef.current
    if (!wire || !compose || !table || !row || !target || !path) return
    if (getComputedStyle(wire).display === "none") return

    const box = compose.getBoundingClientRect()
    const anchor = row.querySelector("[data-anchor]")?.getBoundingClientRect()
    if (!anchor) return
    const tableBox = table.getBoundingClientRect()
    const targetBox = target.getBoundingClientRect()
    const x1 = tableBox.right - box.left + 2
    const y1 = anchor.top + anchor.height / 2 - box.top
    const x2 = targetBox.left - box.left
    const y2 = targetBox.top + targetBox.height / 2 - box.top
    const mid = (x1 + x2) / 2

    path.setAttribute("d", `M${x1} ${y1} C${mid} ${y1} ${mid} ${y2} ${x2} ${y2}`)
    dotARef.current?.setAttribute("cx", String(x1))
    dotARef.current?.setAttribute("cy", String(y1))
    dotBRef.current?.setAttribute("cx", String(x2))
    dotBRef.current?.setAttribute("cy", String(y2))
    wire.style.setProperty("--len", String(Math.ceil(path.getTotalLength())))

    if (animate && motionRef.current) {
      wire.classList.add("reset")
      void wire.getBoundingClientRect()
      requestAnimationFrame(() => wire.classList.remove("reset"))
    }
  }, [])

  const select = useCallback(
    (key: HeroMemberKey, animate: boolean) => {
      setSelected(key)
      selectedRef.current = key
      if (!animate || !motionRef.current) {
        setShown(key)
        setBalance(savingsBalance(membersByKey(key)))
        pendingDraw.current = "still"
        return
      }
      setSwap("out")
      later(() => {
        const from = balanceRef.current
        const to = savingsBalance(membersByKey(key))
        setShown(key)
        setSwap("in")
        stopBalance.current?.()
        stopBalance.current = animateNumber(from, to, 700, setBalance)
        pendingDraw.current = "animate"
      }, SWAP_OUT_MS)
    },
    [later]
  )

  // Draw the connector after the statement for the selected member is on screen.
  useLayoutEffect(() => {
    const mode = pendingDraw.current
    if (!mode) return
    pendingDraw.current = null
    requestAnimationFrame(() =>
      requestAnimationFrame(() => draw(mode === "animate"))
    )
  }, [shown, draw])

  // First draw, and redraw whenever the composition changes size.
  useEffect(() => {
    draw(false)
    const compose = composeRef.current
    if (!compose || !("ResizeObserver" in window)) return
    const observer = new ResizeObserver(() => draw(false))
    observer.observe(compose)
    void document.fonts?.ready.then(() => draw(false))
    return () => observer.disconnect()
  }, [draw])

  // Motion is opt-in: only after mount and when the visitor allows it.
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setMotion(!query.matches)
    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])

  // Intro plus guided tour, both started when the hero is on screen.
  useEffect(() => {
    const compose = composeRef.current
    const cursor = cursorRef.current
    if (!motion || !compose || !cursor || !("IntersectionObserver" in window)) {
      return
    }
    const state = tour.current
    let introStarted = false
    let tourTimer = 0
    const stopCounts: Array<() => void> = []

    const hideCursor = () => cursor.classList.remove("on")
    const schedule = (ms: number) => {
      window.clearTimeout(tourTimer)
      tourTimer = window.setTimeout(step, ms)
    }
    const pointAt = (row: HTMLTableRowElement) => {
      const box = compose.getBoundingClientRect()
      const name = row.querySelector(".who b")?.getBoundingClientRect()
      if (!name) return { x: 0, y: 0 }
      return {
        x: name.left - box.left + Math.min(name.width * 0.55, 80),
        y: name.top - box.top + name.height * 0.7,
      }
    }
    function step() {
      if (
        pausedRef.current ||
        state.hold ||
        !state.inView ||
        document.hidden ||
        performance.now() < state.userUntil
      ) {
        hideCursor()
        schedule(TOUR_IDLE_RETRY_MS)
        return
      }
      const rows = heroMembers
        .map((member) => rowRefs.current.get(member.key))
        .filter((row): row is HTMLTableRowElement => !!row && row.offsetParent !== null)
      if (!rows.length) return
      const current = rows.findIndex(
        (row) => row.dataset.m === selectedRef.current
      )
      const next = rows[(current + 1) % rows.length]!
      if (!cursor!.classList.contains("on")) {
        const start = pointAt(rows[Math.max(current, 0)]!)
        cursor!.style.transition = "none"
        cursor!.style.transform = `translate(${start.x}px, ${start.y}px)`
        void cursor!.offsetWidth
        cursor!.style.transition = ""
        cursor!.classList.add("on")
      }
      const point = pointAt(next)
      cursor!.style.transform = `translate(${point.x}px, ${point.y}px)`
      tourTimer = window.setTimeout(() => {
        // The visitor may have clicked a line while the cursor was moving.
        if (pausedRef.current || state.hold || performance.now() < state.userUntil) {
          hideCursor()
          schedule(TOUR_IDLE_RETRY_MS)
          return
        }
        cursor!.classList.remove("click")
        void cursor!.offsetWidth
        cursor!.classList.add("click")
        next.classList.add("press")
        window.setTimeout(() => next.classList.remove("press"), 240)
        select(next.dataset.m as HeroMemberKey, true)
        schedule(TOUR_DWELL_MS)
      }, TOUR_MOVE_MS)
    }

    const startIntro = () => {
      if (introStarted) return
      introStarted = true
      requestAnimationFrame(() => {
        setIntro(true)
        setCounts({ held: 0, posted: 0 })
        window.setTimeout(() => {
          stopCounts.push(
            animateNumber(0, samplePayroll.posted, 1300, (value) =>
              setCounts((prev) => ({ ...prev, posted: Math.round(value) }))
            ),
            animateNumber(0, samplePayroll.held, 1300, (value) =>
              setCounts((prev) => ({ ...prev, held: Math.round(value) }))
            )
          )
        }, 380)
        window.setTimeout(() => {
          setIntro(false)
          draw(true)
        }, 2300)
      })
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          state.inView = entry.isIntersecting
          if (!entry.isIntersecting) continue
          startIntro()
          if (!state.started) {
            state.started = true
            schedule(3000)
          }
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(compose)

    const onEnter = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return
      state.hold = true
      hideCursor()
    }
    const onLeave = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return
      state.hold = false
      schedule(2200)
    }
    const onFocusIn = () => {
      state.hold = true
      hideCursor()
    }
    const onFocusOut = () => {
      state.hold = false
      schedule(2200)
    }
    compose.addEventListener("pointerenter", onEnter)
    compose.addEventListener("pointerleave", onLeave)
    compose.addEventListener("focusin", onFocusIn)
    compose.addEventListener("focusout", onFocusOut)

    return () => {
      observer.disconnect()
      window.clearTimeout(tourTimer)
      stopCounts.forEach((stop) => stop())
      compose.removeEventListener("pointerenter", onEnter)
      compose.removeEventListener("pointerleave", onLeave)
      compose.removeEventListener("focusin", onFocusIn)
      compose.removeEventListener("focusout", onFocusOut)
      hideCursor()
    }
  }, [motion, draw, select])

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer))
      stopBalance.current?.()
    },
    []
  )

  // Event timestamps share performance.now()'s clock, which the tour compares against.
  const onRowClick = (key: HeroMemberKey, timeStamp: number) => {
    tour.current.userUntil = timeStamp + USER_HOLD_MS
    select(key, true)
  }

  const togglePaused = () => {
    setPaused((value) => {
      const next = !value
      if (next) cursorRef.current?.classList.remove("on")
      else tour.current.userUntil = 0
      return next
    })
  }

  const shownMember = membersByKey(shown)
  const selectedMember = membersByKey(selected)
  const postedPercent = (samplePayroll.posted / samplePayroll.lines) * 100

  return (
    <div className="stage" id="product">
      <div className="wrap">
        <div className={`compose${intro ? " intro" : ""}`} ref={composeRef}>
          <svg aria-hidden="true" className="wire" ref={wireRef}>
            <path className="draw" d="" ref={pathRef} />
            <circle cx="-20" cy="-20" r="4" ref={dotARef} />
            <circle cx="-20" cy="-20" r="4" ref={dotBRef} />
          </svg>

          <div
            aria-label="Sample officer workspace: October payroll"
            className="dash"
            role="region"
          >
            <div className="d-top">
              <HomepageMark className="mark" />
              <div className="d-coop">
                <b>Unity Staff Cooperative Society</b>
                <span>Sample workspace</span>
              </div>
              <div aria-hidden="true" className="d-search">
                <svg
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.8"
                  viewBox="0 0 16 16"
                >
                  <circle cx="7" cy="7" r="4.5" />
                  <path d="m10.5 10.5 3 3" />
                </svg>
                Search members and batches
              </div>
              <span aria-hidden="true" className="d-user">
                AD
              </span>
            </div>
            <div className="d-body">
              <div aria-hidden="true" className="d-nav">
                {[
                  ["Overview", "M2.5 7 8 2.5 13.5 7v6.5h-11z"],
                  [
                    "Members",
                    "M6 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM1.5 13.5c.6-2.5 2.3-3.8 4.5-3.8s3.9 1.3 4.5 3.8M11 3.5a2.5 2.5 0 0 1 0 4.5M12.5 9.8c1.2.5 2 1.6 2.3 3.7",
                  ],
                  ["Payroll", "M2 4.5A1.5 1.5 0 0 1 3.5 3h9A1.5 1.5 0 0 1 14 4.5v7a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11.5zM2 6.5h12M5 10h3"],
                  ["Financing", "M3 13V8M6.5 13V5M10 13V9M13.5 13V3"],
                  ["Statements", "M4 2h6l3 3v9H4zM6.5 8h4M6.5 11h4"],
                  ["Reports", "M2.5 13.5h11M4.5 11V7.5M8 11V4.5M11.5 11V9"],
                ].map(([label, d]) => (
                  <span className={label === "Payroll" ? "on" : undefined} key={label}>
                    <svg
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.6"
                      viewBox="0 0 16 16"
                    >
                      <path d={d} />
                    </svg>
                    {label}
                  </span>
                ))}
              </div>
              <div className="d-main">
                <div className="d-head">
                  <div>
                    <h2>October payroll</h2>
                    <p>
                      <span className="nw">{samplePayroll.batch}</span> ·
                      Ministry payroll file · {samplePayroll.lines} lines
                    </p>
                  </div>
                  <div className="d-meta">
                    <span className="st st-ok">
                      <Check />
                      Posted {samplePayroll.postedOn} · {samplePayroll.postedBy}
                    </span>
                    <div className="d-progress num">
                      <span>
                        <b>{counts.posted}</b> posted · <b>{counts.held}</b>{" "}
                        held
                      </span>
                      <div aria-hidden="true" className="d-bar">
                        <i style={{ width: `${postedPercent}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
                <table
                  aria-label="Payroll lines. Select a line to see it on the member's statement."
                  className="lines num"
                  ref={tableRef}
                >
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th className="r hide-s">Savings</th>
                      <th className="r hide-s">Repayment</th>
                      <th className="r">Deducted</th>
                      <th className="r">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {heroMembers.map((member, index) => {
                      const isOn = member.key === selected
                      return (
                        <tr
                          className={member.extra ? "extra" : undefined}
                          data-held={member.held ? "" : undefined}
                          data-m={member.key}
                          data-on={isOn ? "" : undefined}
                          key={member.key}
                          onClick={(event) => onRowClick(member.key, event.timeStamp)}
                          ref={(row) => {
                            if (row) rowRefs.current.set(member.key, row)
                            else rowRefs.current.delete(member.key)
                          }}
                          style={{ "--i": index } as CSSProperties}
                        >
                          <td>
                            <button
                              aria-pressed={isOn}
                              className="who"
                              onClick={(event) => {
                                event.stopPropagation()
                                onRowClick(member.key, event.timeStamp)
                              }}
                              type="button"
                            >
                              <b>{member.name}</b>
                              <small>{member.memberNumber}</small>
                            </button>
                          </td>
                          <td className="r hide-s">
                            <span className="cell">
                              {member.held
                                ? "—"
                                : member.contribution.toLocaleString("en-US")}
                            </span>
                          </td>
                          <td className="r hide-s">
                            <span className="cell">
                              {member.financing
                                ? member.financing.repayment.toLocaleString("en-US")
                                : "—"}
                            </span>
                          </td>
                          <td className="r">
                            <span className="cell" data-anchor="">
                              {payrollDeduction(member).toLocaleString("en-US")}
                              {member.held ? (
                                <small className="exp">
                                  expected{" "}
                                  {member.held.expected.toLocaleString("en-US")}
                                </small>
                              ) : null}
                            </span>
                          </td>
                          <td className="r">
                            <span className="cell">
                              {member.held ? (
                                <span className="st st-held">Held</span>
                              ) : (
                                <span className="st st-ok">Posted</span>
                              )}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div aria-hidden="true" className="cursor" ref={cursorRef}>
            <span className="ring" />
            <svg viewBox="0 0 24 24">
              <path
                d="M5 3.2v15.6l4.1-3.9 2.7 6.2 2.7-1.2-2.7-6.1h5.7z"
                fill="#0B1F36"
                stroke="#fff"
                strokeLinejoin="round"
                strokeWidth="1.6"
              />
            </svg>
          </div>

          <div className="phone">
            <div
              aria-label={`Sample member statement for ${shownMember.name}`}
              className="screen num"
              role="region"
            >
              <span aria-hidden="true" className="notch" />
              <div aria-hidden="true" className="s-bar">
                <span>9:41</span>
                <span>100%</span>
              </div>
              <div className="s-app">
                <b>My account</b>
                <span>Statement</span>
              </div>
              <div
                className={swap === "out" ? "out" : swap === "in" ? "s-in" : undefined}
                id="stmt-body"
              >
                <StatementBody
                  balance={balance}
                  member={shownMember}
                  targetRef={(element) => {
                    targetRef.current = element
                  }}
                />
              </div>
            </div>
          </div>
          <p aria-live="polite" className="sr">
            Showing {selectedMember.name}&apos;s statement.
          </p>
        </div>
        <div className="stage-note">
          <p>
            <b>Sample cooperative.</b> Select any payroll line to see it on that
            member&apos;s statement.
          </p>
          {motion ? (
            <button
              aria-pressed={paused}
              className="tour-btn"
              onClick={togglePaused}
              type="button"
            >
              {paused ? (
                <svg aria-hidden="true" className="i-play" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M5 3.2v9.6c0 .5.5.8.9.5l7-4.8a.6.6 0 0 0 0-1L5.9 2.7c-.4-.3-.9 0-.9.5z" />
                </svg>
              ) : (
                <svg aria-hidden="true" className="i-pause" fill="currentColor" viewBox="0 0 16 16">
                  <rect height="10" rx=".6" width="2.6" x="4" y="3" />
                  <rect height="10" rx=".6" width="2.6" x="9.4" y="3" />
                </svg>
              )}
              <span>{paused ? "Play tour" : "Pause tour"}</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
