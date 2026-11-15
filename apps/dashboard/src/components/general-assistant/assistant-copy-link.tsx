"use client"

import { useTenantHref } from "@halaalvest/tenant-url/react"
import { Button } from "@halaalvest/ui/components/button"
import { Link01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useEffect, useState } from "react"

/** The full URL for an app path such as `assistantHrefs.message(id)`. */
export function absoluteAppUrl(href: string, base: string) {
  return new URL(href, base).toString()
}

/**
 * Copies a link to one saved answer or draft. The link opens the same item
 * for the same signed-in member or staff user only; opening it runs nothing.
 */
export function AssistantCopyLink({
  href,
  label = "Copy link",
  showLabel = false,
}: {
  /** App-relative path from `assistantHrefs`. */
  href: string
  label?: string
  showLabel?: boolean
}) {
  const tenantHref = useTenantHref()
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])
  const text = copied ? "Link copied" : label
  return (
    <Button
      type="button"
      variant="ghost"
      size={showLabel ? "xs" : "icon-xs"}
      aria-label={text}
      title={text}
      onClick={() =>
        void navigator.clipboard
          ?.writeText(absoluteAppUrl(tenantHref(href), window.location.origin))
          .then(() => setCopied(true))
          .catch(() => {})
      }
    >
      <HugeiconsIcon icon={copied ? Tick02Icon : Link01Icon} className="size-3.5" />
      {showLabel ? text : null}
    </Button>
  )
}
