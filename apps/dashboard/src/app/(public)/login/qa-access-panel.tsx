"use client"

import { useEffect, useState } from "react"
import { Badge } from "@halaalvest/ui/components/badge"
import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"

type QaProfile = {
  cooperativeName: string
  eligible: boolean
  identityLabel: string
  memberCode: string | null
  role: string
  selectionRef: string
}

type QaState = {
  capability: { available: boolean; environment: string; status: string }
  profiles: {
    expiresAt: string
    profiles: QaProfile[]
    qaDomain: string
  } | null
}

export function QaAccessPanel() {
  const [state, setState] = useState<QaState | null>(null)
  const [qaDomain, setQaDomain] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function refresh() {
    const response = await fetch("/auth/qa", { cache: "no-store" })
    const next = (await response.json()) as QaState
    setState(next)
    if (next.profiles?.qaDomain) setQaDomain(next.profiles.qaDomain)
  }

  useEffect(() => {
    void refresh().catch(() => setState(null))
  }, [])

  if (!state?.capability.available) return null

  async function authorize() {
    setPending(true)
    setError(null)
    try {
      const response = await fetch("/auth/qa", {
        body: JSON.stringify({ action: "authorize", qaDomain }),
        headers: { "content-type": "application/json" },
        method: "POST",
      })
      if (!response.ok) throw new Error("authorize")
      await refresh()
    } catch {
      setError("The QA Domain could not be authorized.")
    } finally {
      setPending(false)
    }
  }

  async function enter(selectionRef: string) {
    setPending(true)
    setError(null)
    try {
      const response = await fetch("/auth/qa", {
        body: JSON.stringify({ action: "enter", selectionRef }),
        headers: { "content-type": "application/json" },
        method: "POST",
      })
      const result = (await response.json()) as { redirectTo?: string }
      if (!response.ok || !result.redirectTo) throw new Error("enter")
      window.location.assign(result.redirectTo)
    } catch {
      setError("That QA profile is no longer available. Reauthorize and retry.")
      setPending(false)
    }
  }

  async function clearAuthorization() {
    await fetch("/auth/qa", {
      body: JSON.stringify({ action: "clear" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })
    setState((current) => (current ? { ...current, profiles: null } : current))
  }

  return (
    <section
      className="mb-6 border border-border bg-background"
      aria-labelledby="qa-access-title"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.08em] text-emerald-700 uppercase dark:text-emerald-300">
            QA access
          </p>
          <h2 id="qa-access-title" className="mt-1 text-base font-semibold">
            {state.profiles
              ? state.profiles.qaDomain
              : "Connect this QA browser"}
          </h2>
        </div>
        <Badge variant="outline">{state.capability.environment}</Badge>
      </div>

      {state.profiles ? (
        <div className="p-4">
          <p className="text-sm leading-6 text-muted-foreground">
            Choose an eligible profile. The ordinary role and tenant session
            checks remain active.
          </p>
          <div className="mt-4 divide-y divide-border border border-border">
            {state.profiles.profiles.map((profile) => (
              <button
                key={profile.selectionRef}
                className="flex min-h-16 w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-50"
                disabled={pending || !profile.eligible}
                onClick={() => void enter(profile.selectionRef)}
                type="button"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-xs font-bold">
                  {profile.identityLabel
                    .split(/\s+/)
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm">
                    {profile.identityLabel}
                  </strong>
                  <span className="block truncate text-xs text-muted-foreground">
                    {profile.cooperativeName}
                    {profile.memberCode ? ` · ${profile.memberCode}` : ""}
                  </span>
                </span>
                <Badge variant="outline">
                  {profile.role.replaceAll("_", " ")}
                </Badge>
                <span aria-hidden>→</span>
              </button>
            ))}
          </div>
          <Button
            className="mt-4 w-full"
            onClick={() => void clearAuthorization()}
            type="button"
            variant="outline"
          >
            Change QA Domain
          </Button>
          {error ? (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <p className="mt-3 text-xs text-muted-foreground">
            No password is returned, displayed, or filled.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 p-4">
          <p className="text-sm leading-6 text-muted-foreground">
            Enter your assigned QA Domain.
          </p>
          <label className="grid gap-1.5 text-sm font-medium">
            QA Domain
            <Input
              autoComplete="off"
              onChange={(event) => setQaDomain(event.target.value)}
              value={qaDomain}
            />
          </label>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            disabled={pending || qaDomain.trim().length < 3}
            onClick={() => void authorize()}
            type="button"
          >
            {pending ? "Authorizing" : "Authorize this browser"}
          </Button>
          <p className="text-xs text-muted-foreground">
            QA access expires automatically and retains ordinary role
            permissions.
          </p>
        </div>
      )}
    </section>
  )
}
