"use client"

import { useState } from "react"
import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import {
  formatJourneyPartCounter,
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

        return (
          <div className="flex flex-col gap-1" key={part.key}>
            <div className="flex items-baseline justify-between gap-2 px-2 pb-1">
              <h2
                className={cn(
                  "text-xs font-semibold",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {part.title}
              </h2>
              <span className="text-xs whitespace-nowrap text-muted-foreground">
                {part.estimate}
              </span>
            </div>
            <ol className="flex flex-col gap-0.5">
              {partSteps.map((journeyStep) => {
                const step = byKey.get(journeyStep.key)
                const state = step?.state ?? "upcoming"
                const content = (
                  <>
                    <span
                      className={cn(
                        "flex size-[22px] shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                        state === "complete" &&
                          "border-primary bg-primary text-primary-foreground",
                        state === "current" &&
                          "border-foreground bg-foreground text-background",
                        state === "upcoming" &&
                          "border-border text-muted-foreground"
                      )}
                    >
                      {state === "complete" ? (
                        <CheckIcon aria-hidden="true" className="size-3" />
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
                  "flex min-h-10 w-full items-center gap-3 px-2 py-2 text-left text-sm transition-colors",
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

// Desktop: vertical rail with all three parts. Below lg: a compact bar with
// "Part X of 3 · {part}", the step label, a segmented bar and an "All steps"
// sheet. Both read the shared journey map from @halaalvest/domain.
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
      <aside className="hidden border border-border/70 bg-card p-4 lg:sticky lg:top-24 lg:block lg:self-start">
        <RailSteps steps={steps} />
        <p className="mt-5 border-t border-border/70 pt-3 text-xs leading-5 text-muted-foreground">
          Progress is saved after each step. You can leave and pick up where you
          stopped.
        </p>
      </aside>

      <div className="flex flex-col gap-2.5 border border-border/70 bg-card px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              {formatJourneyPartCounter(currentStepKey)}
            </p>
            <p className="truncate font-semibold">{current.label}</p>
          </div>
          <Sheet onOpenChange={setOpen} open={open}>
            <SheetTrigger
              render={
                <Button className="shrink-0" size="sm" variant="outline" />
              }
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
        <div aria-hidden="true" className="flex gap-1">
          {onboardingJourneySteps.map((journeyStep) => {
            const state = byKey.get(journeyStep.key)?.state ?? "upcoming"

            return (
              <i
                className={cn(
                  "h-1 flex-1",
                  state === "complete" && "bg-primary",
                  state === "current" && "bg-foreground",
                  state === "upcoming" && "bg-muted"
                )}
                key={journeyStep.key}
              />
            )
          })}
        </div>
      </div>
    </>
  )
}
