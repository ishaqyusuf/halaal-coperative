"use client"

import { useEffect, useState, type FormEvent } from "react"
import { ArrowUpRight, Building2, ChevronDown } from "lucide-react"
import { Badge } from "@halaalvest/ui/components/badge"
import { Button } from "@halaalvest/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@halaalvest/ui/components/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@halaalvest/ui/components/collapsible"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@halaalvest/ui/components/field"
import { Input } from "@halaalvest/ui/components/input"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@halaalvest/ui/components/item"
import { Spinner } from "@halaalvest/ui/components/spinner"

type QaCooperative = { loginUrl: string; name: string; slug: string }

type QaAccessState = {
  capability: { available: boolean; environment: string }
  cooperatives?: QaCooperative[]
  qaDomain: string | null
}

const reopenKey = "halaalvest_qa_panel_open"

function hostOf(url: string) {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

export function QaFormAccess() {
  const [state, setState] = useState<QaAccessState | null>(null)
  const [open, setOpen] = useState(false)
  const [qaDomain, setQaDomain] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function refresh() {
    const response = await fetch("/api/qa-access", { cache: "no-store" })
    const next = (await response.json()) as QaAccessState
    setState(next)
    if (next.qaDomain) setQaDomain(next.qaDomain)
    return next
  }

  useEffect(() => {
    void refresh().catch(() => setState(null))
    // Reopen once after the authorize reload, on the cooperative list.
    try {
      if (sessionStorage.getItem(reopenKey)) {
        sessionStorage.removeItem(reopenKey)
        setOpen(true)
      }
    } catch {
      // Storage can be unavailable; the panel just starts collapsed.
    }
  }, [])

  if (!state?.capability.available) return null

  async function authorize(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      const response = await fetch("/api/qa-access", {
        body: JSON.stringify({ action: "authorize", qaDomain }),
        headers: { "content-type": "application/json" },
        method: "POST",
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string
        } | null
        throw new Error(body?.message ?? "authorize")
      }
      // Quick Fill reads the authorization on load; reload once so forms
      // pick it up, and reopen on the cooperative list.
      try {
        sessionStorage.setItem(reopenKey, "1")
      } catch {
        // The panel just starts collapsed after the reload.
      }
      window.location.reload()
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message !== "authorize"
          ? cause.message
          : "The QA Domain could not be authorized."
      )
      setPending(false)
    }
  }

  async function clear() {
    await fetch("/api/qa-access", {
      body: JSON.stringify({ action: "clear" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })
    window.location.reload()
  }

  const cooperatives = state.cooperatives ?? []

  return (
    // Bottom-left keeps it clear of the right-aligned primary actions in
    // the sign-up and onboarding footers; collapsed it stays compact.
    <Collapsible
        className="fixed bottom-3 left-16 z-50"
        onOpenChange={setOpen}
        open={open}
      >
        <Card
          className={
            open
              ? "w-[min(24rem,calc(100vw-5rem))] gap-0 py-0 shadow-lg"
              : // CardHeader is an inline-size container, so it adds no
                // intrinsic width: an auto-width card collapses to padding.
                "w-[min(17rem,calc(100vw-5rem))] gap-0 py-0 shadow-lg"
          }
          size="sm"
        >
          <CollapsibleTrigger
            render={
              <button
                className="w-full text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                type="button"
              />
            }
          >
            <CardHeader className="flex items-center justify-between gap-3 py-3">
              <div className="grid gap-0.5">
                <CardDescription className="text-[0.65rem] font-semibold tracking-[0.1em] text-primary uppercase">
                  QA forms
                </CardDescription>
                <CardTitle className="text-sm">
                  {state.qaDomain ?? "Authorize Quick Fill"}
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{state.capability.environment}</Badge>
                <ChevronDown
                  aria-hidden
                  className={`size-4 text-muted-foreground transition-transform ${
                    open ? "rotate-180" : ""
                  }`}
                />
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="grid gap-4 border-t py-4">
              {state.qaDomain ? (
                <>
                  <div className="grid gap-2">
                    <p className="text-xs text-muted-foreground">
                      {cooperatives.length
                        ? "Open a cooperative to sign in on its own subdomain."
                        : "No active cooperative is registered for this QA Domain yet. Sign one up to start."}
                    </p>
                    {cooperatives.length ? (
                      <ItemGroup className="max-h-64 gap-2 overflow-y-auto">
                        {cooperatives.map((cooperative) => (
                          <Item
                            key={cooperative.slug}
                            render={<a href={cooperative.loginUrl} />}
                            size="sm"
                            variant="outline"
                          >
                            <ItemMedia variant="icon">
                              <Building2 />
                            </ItemMedia>
                            <ItemContent>
                              <ItemTitle>{cooperative.name}</ItemTitle>
                              <ItemDescription>
                                {hostOf(cooperative.loginUrl)}
                              </ItemDescription>
                            </ItemContent>
                            <ItemActions>
                              <ArrowUpRight
                                aria-hidden
                                className="size-4 text-muted-foreground"
                              />
                            </ItemActions>
                          </Item>
                        ))}
                      </ItemGroup>
                    ) : null}
                  </div>
                  <FieldDescription>
                    Typed Quick Fill is enabled only for this exact QA Domain.
                  </FieldDescription>
                  <Button
                    onClick={() => void clear()}
                    type="button"
                    variant="outline"
                  >
                    Change QA Domain
                  </Button>
                </>
              ) : (
                <form onSubmit={(event) => void authorize(event)}>
                  <FieldGroup className="gap-3">
                    <Field data-invalid={error ? true : undefined}>
                      <FieldLabel htmlFor="qa-domain">QA Domain</FieldLabel>
                      <Input
                        aria-invalid={error ? true : undefined}
                        autoComplete="off"
                        id="qa-domain"
                        onChange={(event) => setQaDomain(event.target.value)}
                        placeholder="name.qa.test"
                        value={qaDomain}
                      />
                      {error ? <FieldError>{error}</FieldError> : null}
                    </Field>
                    <Button
                      disabled={pending || qaDomain.trim().length < 3}
                      type="submit"
                    >
                      {pending ? <Spinner data-icon="inline-start" /> : null}
                      {pending ? "Authorizing" : "Authorize Quick Fill"}
                    </Button>
                    <FieldDescription>
                      Password, OTP, KYC, approval, and financial-action fields
                      stay excluded.
                    </FieldDescription>
                  </FieldGroup>
                </form>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
    </Collapsible>
  )
}
