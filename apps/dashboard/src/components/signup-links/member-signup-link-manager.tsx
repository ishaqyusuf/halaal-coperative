"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useNotifications } from "@halaalvest/notifications-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@halaalvest/ui/components/alert-dialog"
import { Button } from "@halaalvest/ui/components/button"
import {
  CopyIcon,
  PencilIcon,
  RefreshCwIcon,
  Settings2Icon,
} from "lucide-react"
import { TrendPill } from "@/components/dashboard"
import { MemberSignupLinkSheet } from "@/components/sheets/member-signup-link-sheet"
import { useMemberSignupLinkParams } from "@/hooks/use-member-signup-link-params"
import {
  rotateMemberSignupLinkAction,
  toggleMemberSignupLinkAction,
} from "@/lib/dashboard-actions"
import {
  signupAccessModeLabels,
  signupLinkAvailabilityLabels,
  type MemberSignupLinkView,
  type SignupAccessMode,
} from "@/lib/signup-links/member-signup-links"

function availabilityTone(link: MemberSignupLinkView) {
  if (link.availability === "available") {
    return "positive" as const
  }

  if (link.availability === "disabled") {
    return "neutral" as const
  }

  return "warning" as const
}

function MemberSignupLinkRow({
  link,
  onEdit,
}: {
  link: MemberSignupLinkView
  onEdit: () => void
}) {
  const router = useRouter()
  const { showError, showSuccess } = useNotifications()
  const [isRotateOpen, setIsRotateOpen] = useState(false)
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
        setIsRotateOpen(false)
        router.refresh()
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
          "The previous token is now invalid. Copy the replacement link before sharing it."
        )
        router.refresh()
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
        "Open Edit link to copy the URL manually."
      )
    }
  }

  return (
    <article className="py-6" data-signup-link-row={link.id}>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(30rem,auto)] xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-foreground">{link.name}</h3>
            <TrendPill tone={availabilityTone(link)}>
              {signupLinkAvailabilityLabels[link.availability]}
            </TrendPill>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Created {link.createdAt}. {link.notes ?? "No internal note."}
          </p>
          <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Last used</dt>
              <dd className="mt-0.5 text-foreground">
                {link.lastUsedAt ?? "Not used yet"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Expiry</dt>
              <dd className="mt-0.5 text-foreground">
                {link.expiresAt ?? "No expiry"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Capacity</dt>
              <dd className="mt-0.5 text-foreground">
                {link.maxSignups ?? "Unlimited"}
              </dd>
            </div>
          </dl>
        </div>

        <dl className="grid grid-cols-2 border-y border-border/70 md:grid-cols-4">
          {[
            ["Signups", link.analytics.totalRequests],
            ["Remaining", link.analytics.remainingSlots ?? "Unlimited"],
            ["Verified", link.analytics.verifiedCount],
            ["Approved", link.analytics.approvedCount],
          ].map(([label, value]) => (
            <div className="px-3 py-3 first:pl-0 md:first:pl-3" key={label}>
              <dt className="text-[11px] font-medium text-muted-foreground uppercase">
                {label}
              </dt>
              <dd className="mt-1 text-lg font-semibold text-foreground">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Pending approval: {link.analytics.pendingApprovalCount} · Rejected:{" "}
        {link.analytics.rejectedCount}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-2 md:flex md:flex-wrap">
        <Button
          className="h-11 w-full md:h-9 md:w-auto"
          onClick={onEdit}
          type="button"
        >
          <PencilIcon />
          Edit link
        </Button>
        <Button
          className="h-11 w-full md:h-9 md:w-auto"
          onClick={onCopy}
          type="button"
          variant="outline"
        >
          <CopyIcon />
          Copy link
        </Button>
        <AlertDialog open={isRotateOpen} onOpenChange={setIsRotateOpen}>
          <AlertDialogTrigger
            render={
              <Button
                className="h-11 w-full md:h-9 md:w-auto"
                disabled={isRotating}
                type="button"
                variant="outline"
              />
            }
          >
            <RefreshCwIcon />
            Regenerate
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Regenerate {link.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                The currently shared URL will stop working immediately. Anyone
                who still needs to apply must receive the replacement link.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep current link</AlertDialogCancel>
              <AlertDialogAction
                disabled={isRotating}
                onClick={onRotate}
                variant="destructive"
              >
                {isRotating ? "Regenerating..." : "Regenerate link"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button
          className="h-11 w-full md:h-9 md:w-auto"
          disabled={isToggling}
          onClick={onToggle}
          type="button"
          variant="outline"
        >
          {isToggling
            ? "Updating..."
            : link.isEnabled
              ? "Disable link"
              : "Enable link"}
        </Button>
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
    <div className="space-y-8">
      <section
        className="grid gap-4 border-y border-border/70 py-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
        id="signup-access-mode"
      >
        <div className="min-w-0">
          <p className="font-medium text-foreground">Member signup gate</p>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Current access: {signupAccessModeLabels[defaultMode]}. New
            applicants still require admin approval.
          </p>
        </div>
        <Button
          className="h-11 w-full md:h-10 md:w-auto"
          onClick={() => openSheet("access")}
          type="button"
          variant="outline"
        >
          <Settings2Icon />
          Edit access mode
        </Button>
      </section>

      <section
        aria-labelledby="staff-signup-links-title"
        id="create-signup-link"
      >
        <div className="flex flex-col gap-3 pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h3
              className="text-base font-semibold text-foreground"
              id="staff-signup-links-title"
            >
              Staff signup links
            </h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Each URL can have its own expiry and signup capacity. Regenerating
              a token immediately invalidates the previously shared URL.
            </p>
          </div>
          <Button
            className="h-11 w-full md:h-10 md:w-auto"
            onClick={() => openSheet("create")}
            type="button"
          >
            Generate signup link
          </Button>
        </div>

        {links.length > 0 ? (
          <div className="divide-y divide-border/70 border-y border-border/70">
            {links.map((link) => (
              <MemberSignupLinkRow
                key={link.id}
                link={link}
                onEdit={() => openSheet("edit", link.id)}
              />
            ))}
          </div>
        ) : (
          <div className="border-y border-dashed border-border/70 py-8 text-sm leading-6 text-muted-foreground">
            No signup links yet. Generate one when you need controlled remote
            member signup.
          </div>
        )}
      </section>

      <MemberSignupLinkSheet defaultMode={defaultMode} links={links} />
    </div>
  )
}
