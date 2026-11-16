import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import type { ReactNode } from "react"
import {
  formatJourneyStepCounter,
  type OnboardingJourneyStepKey,
} from "@halaalvest/domain"
import { buttonVariants } from "@halaalvest/ui/components/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@halaalvest/ui/components/card"
import { cn } from "@halaalvest/ui/lib/utils"
import { GettingStartedFooterActionsSlot } from "@/components/getting-started-footer-slot"
import { ArrowLeftIcon, ChevronDownIcon } from "lucide-react"

// One Path step frame for the dashboard (steps 5–11). The step heading is the
// page heading: "Step N of 11", one large title, one short sentence, the
// fields, an optional "Why we ask" note (closed until opened) and a sticky
// footer with Back and one primary action.
//
// The primary action is either passed as `primary` or portalled by a client
// form into the footer slot with `GettingStartedFooterPortal`, so the primary
// action always saves, then moves on.
export function OnePathStep({
  action,
  aside,
  asideTitle = "Why we ask",
  backHref,
  backLabel = "Back",
  children,
  eyebrow,
  lede,
  primary,
  stepKey,
  title,
}: {
  action?: ReactNode
  aside?: ReactNode
  asideTitle?: string
  backHref?: string | null
  backLabel?: string
  children: ReactNode
  eyebrow?: string
  lede?: ReactNode
  primary?: ReactNode
  stepKey: OnboardingJourneyStepKey
  title: ReactNode
}) {
  return (
    <div className="flex flex-col">
      <Card className="@container">
        <CardHeader>
          {action ? <CardAction>{action}</CardAction> : null}
          <p className="text-sm font-semibold text-primary">
            {eyebrow ?? formatJourneyStepCounter(stepKey)}
          </p>
          <CardTitle
            aria-level={1}
            className="text-2xl leading-tight text-balance sm:text-3xl"
            role="heading"
          >
            {title}
          </CardTitle>
          {lede ? (
            <CardDescription className="max-w-2xl text-base">
              {lede}
            </CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="min-w-0">{children}</div>
          {aside ? (
            <details className="group border-t border-border/70 pt-2 text-base text-muted-foreground">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-medium text-foreground [&::-webkit-details-marker]:hidden">
                <ChevronDownIcon
                  aria-hidden="true"
                  className="size-5 transition-transform group-open:rotate-180"
                />
                {asideTitle}
              </summary>
              <div className="flex max-w-2xl flex-col gap-2 pb-2 pl-7 leading-7">
                {aside}
              </div>
            </details>
          ) : null}
        </CardContent>
      </Card>
      <div className="sticky bottom-0 z-10 mt-4 flex flex-wrap items-center gap-3 border-t border-border/70 bg-background/95 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
        {backHref ? (
          <Link
            className={cn(buttonVariants({ variant: "ghost", size: "touch" }))}
            href={backHref}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            {backLabel}
          </Link>
        ) : null}
        <div className="ml-auto flex flex-1 flex-wrap justify-end gap-2 sm:flex-none max-sm:[&>*]:w-full">
          {primary ?? <GettingStartedFooterActionsSlot />}
        </div>
      </div>
    </div>
  )
}
