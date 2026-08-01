"use client"

import { useTransition } from "react"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import { MemberSignupLinkSheet } from "@/components/sheets/member-signup-link-sheet"
import type {
  MemberSignupLinkView,
  SignupAccessMode,
} from "@/components/signup-links/member-signup-link-content"
import { useMemberSignupLinkParams } from "@/hooks/use-member-signup-link-params"
import {
  rotateMemberSignupLinkAction,
  toggleMemberSignupLinkAction,
} from "@/lib/dashboard-actions"

function MemberSignupLinkCard({
  link,
  onEdit,
}: {
  link: MemberSignupLinkView
  onEdit: () => void
}) {
  const { showError, showSuccess } = useNotifications()
  const [isRotating, startRotateTransition] = useTransition()
  const [isToggling, startToggleTransition] = useTransition()

  function onToggle() {
    startToggleTransition(async () => {
      try {
        const formData = new FormData()
        formData.set("enabled", String(!link.isEnabled))
        formData.set("linkId", link.id)
        await toggleMemberSignupLinkAction(formData)
        showSuccess(
          link.isEnabled ? "Signup link disabled" : "Signup link enabled",
          `${link.name} is now ${link.isEnabled ? "disabled" : "enabled"}.`
        )
      } catch (error) {
        showError(
          "Could not update signup link",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  function onRotate() {
    startRotateTransition(async () => {
      try {
        const formData = new FormData()
        formData.set("linkId", link.id)
        await rotateMemberSignupLinkAction(formData)
        showSuccess(
          "Signup link regenerated",
          "The previous token is now invalid."
        )
      } catch (error) {
        showError(
          "Could not regenerate signup link",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(link.signupUrl)
      showSuccess(
        "Signup link copied",
        "The full signup URL is now in your clipboard."
      )
    } catch {
      showError(
        "Could not copy signup link",
        "Copy the link manually from the field."
      )
    }
  }

  return (
    <article className="rounded-lg border border-border/70 bg-background/92 p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-semibold text-foreground">
              {link.name}
            </p>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${link.isEnabled ? "bg-emerald-100 text-emerald-900" : "bg-muted text-muted-foreground"}`}
            >
              {link.isEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Created on {link.createdAt}.{" "}
            {link.lastUsedAt
              ? `Last used on ${link.lastUsedAt}.`
              : "Not used yet."}
          </p>
        </div>

        <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 xl:min-w-[360px]">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <p className="text-xs font-medium uppercase">Signups</p>
            <p className="mt-2 text-xl font-semibold text-foreground">
              {link.analytics.totalRequests}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <p className="text-xs font-medium uppercase">Remaining</p>
            <p className="mt-2 text-xl font-semibold text-foreground">
              {link.analytics.remainingSlots === null
                ? "Unlimited"
                : link.analytics.remainingSlots}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <p className="text-xs font-medium uppercase">Verified</p>
            <p className="mt-2 text-xl font-semibold text-foreground">
              {link.analytics.verifiedCount}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <p className="text-xs font-medium uppercase">Approved</p>
            <p className="mt-2 text-xl font-semibold text-foreground">
              {link.analytics.approvedCount}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button type="button" onClick={onEdit}>
          Edit link
        </Button>
        <Button type="button" variant="outline" onClick={onCopy}>
          Copy link
        </Button>
        <Button
          disabled={isRotating}
          type="button"
          variant="outline"
          onClick={onRotate}
        >
          Regenerate token
        </Button>
        <Button
          disabled={isToggling}
          type="button"
          variant="outline"
          onClick={onToggle}
        >
          {link.isEnabled ? "Disable link" : "Enable link"}
        </Button>
      </div>

      <div className="mt-5 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
        <p>Pending approval: {link.analytics.pendingApprovalCount}</p>
        <p>Rejected: {link.analytics.rejectedCount}</p>
        <p>Expiry: {link.expiresAt ?? "No expiry"}</p>
      </div>
    </article>
  )
}

export function MemberSignupLinkManager({
  defaultMode,
  links,
}: {
  defaultMode: SignupAccessMode
  links: MemberSignupLinkView[]
}) {
  const { setParams } = useMemberSignupLinkParams()

  function openSheet(type: "access" | "create" | "edit", linkId?: string) {
    void setParams({
      signupLinkId: linkId ?? null,
      signupLinkSheetType: type,
    })
  }

  return (
    <div className="space-y-6">
      <section
        id="signup-access-mode"
        className="rounded-lg border border-border/70 bg-background/92 p-5 shadow-sm"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-muted-foreground uppercase">
              Access mode
            </p>
            <h3 className="mt-2 text-lg font-semibold text-foreground">
              Member signup gate
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Current mode:{" "}
              <span className="font-medium text-foreground">
                {defaultMode.replaceAll("_", " ")}
              </span>
            </p>
          </div>
          <Button type="button" onClick={() => openSheet("access")}>
            Edit access mode
          </Button>
        </div>
      </section>

      <section
        id="create-signup-link"
        className="rounded-lg border border-border/70 bg-background/92 p-5 shadow-sm"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-muted-foreground uppercase">
              Generator
            </p>
            <h3 className="mt-2 text-lg font-semibold text-foreground">
              Staff signup links
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Generate controlled signup URLs from a focused modal.
            </p>
          </div>
          <Button type="button" onClick={() => openSheet("create")}>
            Generate signup link
          </Button>
        </div>
      </section>

      <div className="space-y-4">
        {links.length > 0 ? (
          links.map((link) => (
            <MemberSignupLinkCard
              key={link.id}
              link={link}
              onEdit={() => openSheet("edit", link.id)}
            />
          ))
        ) : (
          <section className="rounded-lg border border-dashed border-border/70 bg-background/92 p-6 text-sm text-muted-foreground shadow-sm">
            No signup links yet. Generate one when you need controlled remote
            member signup.
          </section>
        )}
      </div>

      <MemberSignupLinkSheet defaultMode={defaultMode} links={links} />
    </div>
  )
}
