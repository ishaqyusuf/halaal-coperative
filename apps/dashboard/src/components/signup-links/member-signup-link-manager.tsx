"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { TenantLink as Link } from "@halaalvest/tenant-url/next"
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
} from "@halaalvest/ui/components/alert-dialog"
import { Button } from "@halaalvest/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@halaalvest/ui/components/dropdown-menu"
import { CopyIcon, MoreHorizontalIcon, PencilIcon } from "lucide-react"
import { TrendPill } from "@/components/dashboard"
import { MemberSignupLinkSheet } from "@/components/sheets/member-signup-link-sheet"
import { useCopySignupLink } from "@/components/signup-links/member-signup-link-content"
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
import { formatDayMonthYear } from "@/utils/format"

// With size="touch" (44px), shrinking on md (WP18).
const rowButtonClassName = "md:h-10"

function availabilityTone(link: MemberSignupLinkView) {
  if (link.availability === "available") return "positive" as const
  if (link.availability === "disabled") return "neutral" as const
  return "warning" as const
}

function linkFacts(link: MemberSignupLinkView) {
  const used = link.analytics.totalRequests
  const facts = [`${used} ${used === 1 ? "person" : "people"} joined`]

  facts.push(
    link.analytics.remainingSlots === null
      ? "No limit"
      : `${link.analytics.remainingSlots} places left`
  )
  facts.push(
    link.expiresAt
      ? `Last day ${formatDayMonthYear(link.expiresAt)}`
      : "No end date"
  )

  return facts.join(" · ")
}

function MemberSignupLinkRow({
  link,
  onEdit,
}: {
  link: MemberSignupLinkView
  onEdit: () => void
}) {
  const router = useRouter()
  const copyLink = useCopySignupLink()
  const { showError, showSuccess } = useNotifications()
  const [isReplaceOpen, setIsReplaceOpen] = useState(false)
  const [isReplacing, startReplaceTransition] = useTransition()
  const [isToggling, startToggleTransition] = useTransition()
  const waiting = link.analytics.pendingApprovalCount

  function onToggle() {
    startToggleTransition(async () => {
      try {
        const formData = new FormData()
        formData.set("enabled", String(!link.isEnabled))
        formData.set("linkId", link.id)
        await toggleMemberSignupLinkAction(formData)
        showSuccess(
          link.isEnabled ? "Link turned off" : "Link turned on",
          link.isEnabled
            ? `${link.name} no longer works.`
            : `${link.name} works again.`
        )
        router.refresh()
      } catch (error) {
        showError(
          "Could not change the link",
          error instanceof Error ? error.message : "Please try again."
        )
      }
    })
  }

  function onReplace() {
    startReplaceTransition(async () => {
      try {
        const formData = new FormData()
        formData.set("linkId", link.id)
        await rotateMemberSignupLinkAction(formData)
        showSuccess("New link ready", "Copy it and share it again.")
        setIsReplaceOpen(false)
        router.refresh()
      } catch (error) {
        showError(
          "Could not replace the link",
          error instanceof Error ? error.message : "Please try again."
        )
      }
    })
  }

  return (
    <article
      className="grid gap-4 py-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
      data-signup-link-row={link.id}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="text-lg font-semibold break-words text-foreground">
            {link.name}
          </h3>
          <TrendPill tone={availabilityTone(link)}>
            {signupLinkAvailabilityLabels[link.availability]}
          </TrendPill>
        </div>
        <p className="mt-1 text-muted-foreground">{linkFacts(link)}</p>
        {waiting > 0 ? (
          <Link
            className="mt-1 inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4 md:min-h-0"
            href="/membership-approvals?status=pending_approval"
          >
            {waiting} waiting for your approval
          </Link>
        ) : null}
      </div>

      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 md:flex">
        <Button
          className={rowButtonClassName}
          size="touch"
          disabled={link.availability !== "available"}
          onClick={() => void copyLink(link)}
          type="button"
        >
          <CopyIcon />
          Copy link
        </Button>
        <Button
          className={rowButtonClassName}
          size="touch"
          onClick={onEdit}
          type="button"
          variant="outline"
        >
          <PencilIcon />
          Edit
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                aria-label={`More for ${link.name}`}
                className="md:size-10"
                disabled={isToggling || isReplacing}
                size="icon-touch"
                type="button"
                variant="outline"
              />
            }
          >
            <MoreHorizontalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem className="min-h-11" onClick={onToggle}>
              {link.isEnabled ? "Turn off" : "Turn on"}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="min-h-11"
              onClick={() => setIsReplaceOpen(true)}
              variant="destructive"
            >
              Replace with a new link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog onOpenChange={setIsReplaceOpen} open={isReplaceOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace {link.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The old link stops working now. Share the new link with anyone who
              still needs to join.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep the old link</AlertDialogCancel>
            <AlertDialogAction
              disabled={isReplacing}
              onClick={onReplace}
              variant="destructive"
            >
              {isReplacing ? "Replacing…" : "Replace link"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
    <div className="grid gap-8">
      <section
        aria-labelledby="signup-access-title"
        className="grid gap-3 border-b border-border/70 pb-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
        id="signup-access-mode"
      >
        <div className="min-w-0">
          <p
            className="text-base font-medium text-muted-foreground"
            id="signup-access-title"
          >
            Who can join online
          </p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {signupAccessModeLabels[defaultMode]}
          </p>
        </div>
        <Button
          size="touch"
          className="w-full md:h-10 md:w-auto"
          onClick={() => openSheet("access")}
          type="button"
          variant="outline"
        >
          Change
        </Button>
      </section>

      <section aria-labelledby="signup-links-title" id="create-signup-link">
        <h2 className="text-lg font-semibold" id="signup-links-title">
          Links
        </h2>

        {links.length > 0 ? (
          <div className="mt-2 divide-y divide-border/70 border-y border-border/70">
            {links.map((link) => (
              <MemberSignupLinkRow
                key={link.id}
                link={link}
                onEdit={() => openSheet("edit", link.id)}
              />
            ))}
          </div>
        ) : (
          <p className="mt-2 border-y border-dashed border-border/70 py-8 text-lg text-muted-foreground">
            No links yet. Use New link to make one.
          </p>
        )}
      </section>

      <MemberSignupLinkSheet defaultMode={defaultMode} links={links} />
    </div>
  )
}
