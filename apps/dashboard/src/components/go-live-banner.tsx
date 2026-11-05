"use client"

import { useEffect, useState } from "react"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@halaalvest/ui/components/alert"
import { Button } from "@halaalvest/ui/components/button"
import { CircleCheckIcon, XIcon } from "lucide-react"
import { goLiveBannerParam } from "@/lib/getting-started/go-live-readiness"

/**
 * One-time banner after going live. It drops the `?live=1` flag from the
 * address bar on mount, so a reload or shared link does not show it again.
 */
export function GoLiveBanner({ message }: { message: string }) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const url = new URL(window.location.href)
    if (!url.searchParams.has(goLiveBannerParam)) return

    url.searchParams.delete(goLiveBannerParam)
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`
    )
  }, [])

  if (dismissed) return null

  return (
    <Alert className="mb-5">
      <CircleCheckIcon />
      <AlertTitle>You&apos;re live</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
      <AlertAction>
        <Button
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <XIcon />
        </Button>
      </AlertAction>
    </Alert>
  )
}
