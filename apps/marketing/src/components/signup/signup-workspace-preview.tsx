"use client"

import { useEffect, useRef } from "react"
import {
  BarChart3Icon,
  HandCoinsIcon,
  ListChecksIcon,
  LockIcon,
  PiggyBankIcon,
  UsersIcon,
} from "lucide-react"
import { countryFlag } from "@/lib/international-phone"

export type SignupWorkspacePreviewProps = {
  cooperativeName: string
  /** e.g. "Nigeria"; empty until chosen. */
  countryName: string
  /** ISO code for the flag, when a country is chosen. */
  countryCode: string | null
  /** "USC-0001", or a partial "USC-····" while typing. */
  ownerCode: string
  ownerEmail: string
  ownerName: string
  /** "+234 803 123 4567", or empty. */
  ownerPhone: string
  /** "USC", or "" until 3–5 letters are typed. */
  prefix: string
  workspaceSlug: string
  workspaceUrlSuffix: string
}

const navItems = [
  { icon: ListChecksIcon, label: "Getting started" },
  { icon: UsersIcon, label: "Members" },
  { icon: PiggyBankIcon, label: "Contributions" },
  { icon: HandCoinsIcon, label: "Financing" },
  { icon: BarChart3Icon, label: "Reports" },
] as const

const stopWords = new Set([
  "and",
  "cooperative",
  "limited",
  "ltd",
  "multipurpose",
  "of",
  "society",
  "the",
])

export function cooperativeInitials(name: string) {
  const words = name
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean)
  const significant = words.filter((word) => !stopWords.has(word.toLowerCase()))
  const source = significant.length ? significant : words
  return source
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("")
}

/** Replays a short wash on the element when `value` changes. */
function usePulse<T extends HTMLElement>(value: string) {
  const ref = useRef<T>(null)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const element = ref.current
    if (!element) return
    element.classList.remove("pv-pulse")
    void element.offsetWidth
    element.classList.add("pv-pulse")
  }, [value])
  return ref
}

/**
 * Right-hand panel of /signup: the owner's dashboard in a browser frame and a
 * member's phone sign-in, both drawn from what is typed. Decorative: the form
 * itself carries every value for assistive tech.
 */
export function SignupWorkspacePreview({
  cooperativeName,
  countryCode,
  countryName,
  ownerCode,
  ownerEmail,
  ownerName,
  ownerPhone,
  prefix,
  workspaceSlug,
  workspaceUrlSuffix,
}: SignupWorkspacePreviewProps) {
  const name = cooperativeName.trim()
  const initials = cooperativeInitials(name) || prefix.slice(0, 2) || "··"
  const firstName = ownerName.trim().split(/\s+/)[0] ?? ""
  const urlRef = usePulse<HTMLDivElement>(workspaceSlug)
  const codeRef = usePulse<HTMLDivElement>(prefix)
  const memberPrefix = prefix || "ABC"

  return (
    <aside aria-label="Preview of your workspace" className="su-right">
      <div className="su-right-in">
        <p className="su-stage">
          <i aria-hidden="true" />
          Your workspace, as you type
        </p>
        <div aria-hidden="true" className="pv">
          <div className="pv-browser">
            <div className="pv-bar">
              <div className="pv-dots">
                <i />
                <i />
                <i />
              </div>
              <div className="pv-url" ref={urlRef}>
                <LockIcon />
                <span>
                  {workspaceSlug ? (
                    <>
                      {workspaceSlug}
                      <span className="host">{workspaceUrlSuffix}</span>
                    </>
                  ) : (
                    <span className="host">
                      your-cooperative{workspaceUrlSuffix}
                    </span>
                  )}
                </span>
              </div>
            </div>
            <div className="pv-app">
              <div className="pv-side">
                <div className="pv-org">
                  <span className="pv-tile">{initials}</span>
                  <div className="min-w-0">
                    <b>{name || "Your cooperative"}</b>
                    <small>
                      {countryCode ? (
                        <span className="su-flag">
                          {countryFlag(countryCode)}
                        </span>
                      ) : null}
                      {countryName || "Country not set"}
                    </small>
                  </div>
                </div>
                {navItems.map(({ icon: Icon, label }, index) => (
                  <span
                    className={index === 0 ? "pv-nav on" : "pv-nav"}
                    key={label}
                  >
                    <Icon />
                    {label}
                  </span>
                ))}
              </div>
              <div className="pv-main">
                <h4>
                  {firstName ? `Welcome, ${firstName}` : "Welcome"}
                </h4>
                <p>Owner · {ownerEmail.trim() || "your email"}</p>
                <div className="pv-progress">
                  <span />
                  Step 1 of 11
                </div>
                <dl className="pv-rows">
                  <div>
                    <dt>Owner</dt>
                    <dd data-empty={ownerName.trim() ? undefined : ""}>
                      {ownerName.trim() || "You"}
                    </dd>
                  </div>
                  <div>
                    <dt>Your code</dt>
                    <dd>{ownerCode}</dd>
                  </div>
                  <div>
                    <dt>Phone</dt>
                    <dd data-empty={ownerPhone ? undefined : ""}>
                      {ownerPhone || "Not added"}
                    </dd>
                  </div>
                  <div>
                    <dt>Members</dt>
                    <dd>1 · you</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          <div className="pv-phone">
            <div className="pv-screen">
              <div className="pv-status">
                <span>9:41</span>
                <i />
                <em>
                  <b style={{ height: 5 }} />
                  <b style={{ height: 7 }} />
                  <b style={{ height: 9 }} />
                </em>
              </div>
              <div className="pv-body">
                <span className="pv-tile">{initials}</span>
                <h5>{name || "Your cooperative"}</h5>
                <p>Member sign-in</p>
                <div className="pv-field">
                  <span className="pv-label">Member code</span>
                  <div className="pv-input" ref={codeRef}>
                    <span className="pre">{memberPrefix}</span>-0042
                    <span className="caret" />
                  </div>
                  <small>
                    Every member&apos;s code starts with <b>{memberPrefix}</b>.
                  </small>
                </div>
                <span className="pv-cta">Continue</span>
                <span className="pv-home" />
              </div>
            </div>
          </div>
        </div>
        <p className="pv-cap">
          <span>
            You sign in as <b>{ownerCode}</b>
          </span>
          <span>
            Members sign in as <b>{memberPrefix}-0042</b>
          </span>
        </p>
      </div>
    </aside>
  )
}
