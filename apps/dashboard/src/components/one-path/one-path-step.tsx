import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import type { ReactNode } from "react"
import {
  formatJourneyStepCounter,
  getOnboardingJourneyStep,
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
import { ArrowLeftIcon } from "lucide-react"

// One Path step frame for the dashboard (steps 5–11): eyebrow from the shared
// journey map, one serif heading, one sentence of lede, the fields, a "Why we
// ask" aside (beside the fields from xl, below them otherwise) and a sticky
// footer with Back, "Step N of 11" and one primary action.
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
  lede: ReactNode
  primary?: ReactNode
  stepKey: OnboardingJourneyStepKey
  title: ReactNode
}) {
  const step = getOnboardingJourneyStep(stepKey)

  return (
    <div className="flex flex-col">
      <Card className="@container">
        <CardHeader>
          {action ? <CardAction>{action}</CardAction> : null}
          <p className="text-xs font-semibold tracking-[0.08em] text-primary uppercase">
            {eyebrow ?? `Step ${step.number} · ${step.label}`}
          </p>
          <CardTitle
            aria-level={2}
            className="font-serif text-2xl leading-tight font-normal tracking-[-0.01em] text-balance sm:text-3xl"
            role="heading"
          >
            {title}
          </CardTitle>
          <CardDescription className="max-w-2xl text-sm">
            {lede}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={
              aside
                ? "grid gap-6 @4xl:grid-cols-[minmax(0,1fr)_16rem] @4xl:gap-8"
                : undefined
            }
          >
            <div className="min-w-0">{children}</div>
            {aside ? (
              <aside className="h-fit border border-border/70 bg-muted/30 p-4 text-sm leading-6 text-muted-foreground @4xl:sticky @4xl:top-24">
                <h3 className="mb-1 font-semibold text-foreground">
                  {asideTitle}
                </h3>
                {aside}
              </aside>
            ) : null}
          </div>
        </CardContent>
      </Card>
      <div className="sticky bottom-0 z-10 mt-4 flex flex-wrap items-center gap-3 border-t border-border/70 bg-background/95 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
        {backHref ? (
          <Link
            className={cn(buttonVariants({ variant: "ghost" }), "h-11 sm:h-10")}
            href={backHref}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            {backLabel}
          </Link>
        ) : null}
        <span className="text-xs text-muted-foreground max-sm:hidden">
          {formatJourneyStepCounter(stepKey)}
        </span>
        <div className="ml-auto flex flex-1 flex-wrap justify-end gap-2 sm:flex-none max-sm:[&>*]:w-full">
          {primary ?? <GettingStartedFooterActionsSlot />}
        </div>
      </div>
    </div>
  )
}
