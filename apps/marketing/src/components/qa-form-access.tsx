"use client"

import { useEffect, useState } from "react"
import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"

type QaAccessState = {
  capability: { available: boolean; environment: string }
  qaDomain: string | null
}

export function QaFormAccess() {
  const [state, setState] = useState<QaAccessState | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [qaDomain, setQaDomain] = useState("")
  const [credential, setCredential] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function refresh() {
    const response = await fetch("/api/qa-access", { cache: "no-store" })
    const next = (await response.json()) as QaAccessState
    setState(next)
    if (next.qaDomain) setQaDomain(next.qaDomain)
  }

  useEffect(() => {
    void refresh().catch(() => setState(null))
  }, [])

  if (!state?.capability.available) return null

  async function authorize() {
    setPending(true)
    setError(null)
    try {
      const response = await fetch("/api/qa-access", {
        body: JSON.stringify({
          action: "authorize",
          credential,
          qaDomain,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      })
      if (!response.ok) throw new Error("authorize")
      setCredential("")
      await refresh()
      setExpanded(false)
      window.location.reload()
    } catch {
      setError("The QA Domain or tester credential could not be authorized.")
    } finally {
      setPending(false)
    }
  }

  async function clear() {
    await fetch("/api/qa-access", {
      body: JSON.stringify({ action: "clear" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })
    setState((current) => (current ? { ...current, qaDomain: null } : current))
    setExpanded(false)
    window.location.reload()
  }

  return (
    <aside className="fixed right-3 bottom-3 z-50 w-[min(22rem,calc(100vw-1.5rem))] border border-neutral-300 bg-white text-neutral-950 shadow-lg">
      <button
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={() => setExpanded((value) => !value)}
        type="button"
      >
        <span>
          <span className="block text-[0.65rem] font-bold tracking-[0.1em] text-emerald-700 uppercase">
            QA forms
          </span>
          <strong className="block text-sm">
            {state.qaDomain ?? "Authorize Quick Fill"}
          </strong>
        </span>
        <span className="border border-neutral-300 px-2 py-1 text-xs">
          {state.capability.environment}
        </span>
      </button>

      {expanded ? (
        <div className="grid gap-3 border-t border-neutral-200 p-4">
          {state.qaDomain ? (
            <>
              <p className="text-sm text-neutral-600">
                Typed Quick Fill is enabled only for this exact QA Domain.
              </p>
              <Button onClick={() => void clear()} type="button" variant="outline">
                Change QA Domain
              </Button>
            </>
          ) : (
            <>
              <label className="grid gap-1 text-sm font-medium">
                QA Domain
                <Input
                  autoComplete="off"
                  onChange={(event) => setQaDomain(event.target.value)}
                  value={qaDomain}
                />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Tester credential
                <Input
                  autoComplete="off"
                  onChange={(event) => setCredential(event.target.value)}
                  type="password"
                  value={credential}
                />
              </label>
              {error ? (
                <p className="text-sm text-red-700" role="alert">
                  {error}
                </p>
              ) : null}
              <Button
                disabled={
                  pending || qaDomain.trim().length < 3 || credential.length < 16
                }
                onClick={() => void authorize()}
                type="button"
              >
                {pending ? "Authorizing" : "Authorize Quick Fill"}
              </Button>
              <p className="text-xs text-neutral-600">
                Password, OTP, KYC, approval, and financial-action fields stay
                excluded.
              </p>
            </>
          )}
        </div>
      ) : null}
    </aside>
  )
}
