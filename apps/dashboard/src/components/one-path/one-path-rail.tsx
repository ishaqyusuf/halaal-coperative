"use client"

import { useState } from "react"
import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import {
  formatJourneyStepCounter,
  getOnboardingJourneyPartSteps,
  getOnboardingJourneyStep,
  onboardingJourneyParts,
  onboardingJourneySteps,
  type OnboardingJourneyStepKey,
} from "@halaalvest/domain"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@halaalvest/ui/components/sheet"
import { Button } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import { CheckIcon } from "lucide-react"

export type OnePathRailStepState = "complete" | "current" | "upcoming"

export type OnePathRailStep = {
  href: string | null
  key: OnboardingJourneyStepKey
  state: OnePathRailStepState
}

function RailSteps({
  onNavigate,
  steps,
}: {
  onNavigate?: () => void
  steps: OnePathRailStep[]
}) {
  const byKey = new Map(steps.map((step) => [step.key, step]))

  return (
    <nav aria-label="Setup steps" className="flex flex-col gap-5">
      {onboardingJourneyParts.map((part) => {
        const partSteps = getOnboardingJourneyPartSteps(part.key)
        const active = partSteps.some(
          (step) => byKey.get(step.key)?.state === "current"
        )
        // A finished part with no links (creating the workspace) is one line.
        const partDone = partSteps.every((step) => {
          const railStep = byKey.get(step.key)

          return railStep?.state === "complete" && !railStep.href
        })

        if (partDone) {
          return (
            <div
              className="flex min-h-11 items-center gap-3 px-2 text-sm text-foreground"
              key={part.key}
            >
              <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full border border-primary bg-primary text-primary-foreground">
                <CheckIcon aria-hidden="true" className="size-4" />
              </span>
              <span>
                {part.title}
                <span className="sr-only"> (done)</span>
              </span>
            </div>
          )
        }

        return (
          <div className="flex flex-col gap-1" key={part.key}>
            <h2
              className={cn(
                "px-2 pb-1 text-sm font-semibold",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              {part.title}
            </h2>
            <ol className="flex flex-col gap-0.5">
              {partSteps.map((journeyStep) => {
                const step = byKey.get(journeyStep.key)
                const state = step?.state ?? "upcoming"
                const content = (
                  <>
                    <span
                      className={cn(
                        "flex size-[26px] shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                        state === "complete" &&
                          "border-primary bg-primary text-primary-foreground",
                        state === "current" &&
                          "border-foreground bg-foreground text-background",
                        state === "upcoming" &&
                          "border-border text-muted-foreground"
                      )}
                    >
                      {state === "complete" ? (
                        <CheckIcon aria-hidden="true" className="size-4" />
                      ) : (
                        journeyStep.number
                      )}
                    </span>
                    <span>{journeyStep.label}</span>
                    {state === "complete" ? (
                      <span className="sr-only">(done)</span>
                    ) : null}
                  </>
                )
                const className = cn(
                  "flex min-h-11 w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors",
                  state === "current" && "bg-muted font-medium text-foreground",
                  state === "complete" && "text-foreground",
                  state === "upcoming" && "text-muted-foreground"
                )

                return (
                  <li key={journeyStep.key}>
                    {step?.href && state !== "current" ? (
                      <Link
                        className={cn(className, "hover:bg-muted/60")}
                        href={step.href}
                        onClick={onNavigate}
                      >
                        {content}
                      </Link>
                    ) : (
                      <span
                        aria-current={state === "current" ? "step" : undefined}
                        aria-disabled={state === "current" ? undefined : true}
                        className={className}
                      >
                        {content}
                      </span>
                    )}
                  </li>
                )
              })}
            </ol>
          </div>
        )
      })}
    </nav>
  )
}

// Desktop: vertical rail with all three parts; a finished part with no links
// (creating the workspace) is one line. Below lg: a segmented progress bar
// and an "All steps" sheet; the step card already says "Step N of 11". Both read the shared journey map from @halaalvest/domain.
export function OnePathRail({
  currentStepKey,
  steps,
}: {
  currentStepKey: OnboardingJourneyStepKey
  steps: OnePathRailStep[]
}) {
  const [open, setOpen] = useState(false)
  const current = getOnboardingJourneyStep(currentStepKey)
  const byKey = new Map(steps.map((step) => [step.key, step]))

  return (
    <>
      <aside className="hidden rounded-xl border border-border/70 bg-card p-3 lg:sticky lg:top-24 lg:block lg:self-start">
        <RailSteps steps={steps} />
      </aside>

      <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card py-2 pr-2 pl-4 lg:hidden">
        <div
          aria-label={formatJourneyStepCounter(currentStepKey)}
          className="flex flex-1 gap-1"
          role="img"
        >
          {onboardingJourneySteps.map((journeyStep) => {
            const state = byKey.get(journeyStep.key)?.state ?? "upcoming"

            return (
              <i
                className={cn(
                  "h-2 flex-1 rounded-full",
                  state === "complete" && "bg-primary",
                  state === "current" && "bg-foreground",
                  state === "upcoming" && "bg-muted"
                )}
                key={journeyStep.key}
              />
            )
          })}
        </div>
        <Sheet onOpenChange={setOpen} open={open}>
          <SheetTrigger
            render={<Button className="shrink-0" variant="outline" />}
          >
            All steps
          </SheetTrigger>
          <SheetContent
            className="max-h-[85svh] gap-4 overflow-y-auto p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
            side="bottom"
          >
            <SheetHeader className="p-0">
              <SheetTitle>All steps</SheetTitle>
              <SheetDescription>
                Step {current.number} of {onboardingJourneySteps.length}
              </SheetDescription>
            </SheetHeader>
            <RailSteps onNavigate={() => setOpen(false)} steps={steps} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
