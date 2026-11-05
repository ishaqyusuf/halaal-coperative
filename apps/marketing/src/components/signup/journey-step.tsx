"use client"

import type { ReactNode } from "react"
import {
  formatJourneyStepCounter,
  type OnboardingJourneyStepKey,
} from "@halaalvest/domain"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@halaalvest/ui/components/card"
import { useInSignupJourneyShell } from "./signup-journey-state"

// One Path step frame: eyebrow, one serif heading, one sentence of lede, the
// fields, a "Why we ask" aside (beside the fields when the card is wide, below
// them otherwise) and a footer with Back, "Step N of 11" and one primary action.
// Self-contained so SignupForm still renders inside the Passbook homepage.
export function JourneyStep({
  action,
  aside,
  asideTitle = "Why we ask",
  back,
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
  back?: ReactNode
  children: ReactNode
  eyebrow?: string
  lede: ReactNode
  primary?: ReactNode
  stepKey: OnboardingJourneyStepKey
  title: ReactNode
}) {
  const inShell = useInSignupJourneyShell()
  const footer =
    back || primary ? (
      <div className="flex w-full flex-wrap items-center gap-3">
        {back}
        <span className="text-xs text-muted-foreground max-sm:hidden">
          {formatJourneyStepCounter(stepKey)}
        </span>
        <div className="ml-auto flex flex-1 justify-end sm:flex-none [&>*]:max-sm:w-full">
          {primary}
        </div>
      </div>
    ) : null

  return (
    <>
      <Card className="@container">
        <CardHeader>
          {action ? <CardAction>{action}</CardAction> : null}
          {eyebrow ? (
            <p className="text-xs font-semibold tracking-[0.08em] text-[#1F7A3D] uppercase">
              {eyebrow}
            </p>
          ) : null}
          <CardTitle
            className="marketing-serif text-[1.75rem] leading-[1.12] tracking-[-0.02em] text-balance sm:text-[2.125rem]"
            aria-level={2}
            role="heading"
          >
            {title}
          </CardTitle>
          <CardDescription className="text-[15px] leading-6">
            {lede}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={
              aside
                ? "grid gap-6 @3xl:grid-cols-[minmax(0,1fr)_15rem] @3xl:gap-8"
                : undefined
            }
          >
            <div className="min-w-0">{children}</div>
            {aside ? (
              <aside className="h-fit rounded-xl bg-[#EEF4EF] p-4 text-sm leading-6 text-[#33475B]">
                <h3 className="mb-1 font-semibold text-[#0B1F36]">
                  {asideTitle}
                </h3>
                {aside}
              </aside>
            ) : null}
          </div>
        </CardContent>
        {footer && !inShell ? <CardFooter>{footer}</CardFooter> : null}
      </Card>
      {footer && inShell ? (
        <div className="sticky bottom-0 z-10 -mx-4 mt-4 border-t border-[#0B1F36]/9 bg-white/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
          {footer}
        </div>
      ) : null}
    </>
  )
}
