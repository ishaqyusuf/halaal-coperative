"use client"

import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import type {
  ServiceGate,
  ServiceGateIcon,
  ServiceGateTint,
} from "@halaalvest/utils/service-request-gate"
import {
  CalendarDays,
  Check,
  CircleAlert,
  CirclePause,
  Landmark,
  type LucideIcon,
  Sparkles,
  Wallet,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { memberPayHref } from "@/lib/requests/member-service-state"

const icons: Record<Exclude<ServiceGateIcon, "service">, LucideIcon> = {
  CalendarDays,
  CircleAlert,
  CirclePause,
  Landmark,
  Sparkles,
}

const tints: Record<ServiceGateTint, string> = {
  brand:
    "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  danger: "bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
  neutral: "bg-muted text-foreground",
  sky: "bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  warm: "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
}

/**
 * One centred card for a service state (T30 direction 01): icon, plain
 * explanation, the "Not yet" checklist with an inline Pay, and one action.
 */
export function ServiceStateCard({
  gate,
  serviceIcon,
}: {
  gate: ServiceGate
  /** The service's own icon for the "isn't offered" state. */
  serviceIcon: LucideIcon
}) {
  const router = useRouter()
  const Icon = gate.icon === "service" ? serviceIcon : icons[gate.icon]
  const outline = Boolean(gate.steps?.length)

  return (
    <section
      aria-labelledby="service-state-title"
      className="rounded-(--ui-radius-surface) border border-border bg-card px-4 py-10 sm:px-8"
    >
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
        <div
          className={cn(
            "flex size-14 items-center justify-center rounded-full",
            tints[gate.tint]
          )}
        >
          <Icon aria-hidden className="size-7" />
        </div>
        <div className="grid gap-2">
          <h2
            className="text-xl font-semibold text-foreground"
            id="service-state-title"
          >
            {gate.title}
          </h2>
          <p className="text-base text-muted-foreground">{gate.description}</p>
        </div>

        {gate.steps?.length ? (
          <ul className="w-full divide-y divide-border rounded-(--ui-radius-surface) border border-border text-left">
            {gate.steps.map((step) => (
              <li className="flex items-center gap-3 px-4 py-3" key={step.key}>
                <span
                  aria-label={step.done ? "Done" : "Not done"}
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border",
                    step.done
                      ? "border-emerald-700 bg-emerald-700 text-white dark:border-emerald-400 dark:bg-emerald-400 dark:text-emerald-950"
                      : "border-border"
                  )}
                  role="img"
                >
                  {step.done ? <Check aria-hidden className="size-4" /> : null}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-medium text-foreground">
                    {step.title}
                  </p>
                  <p className="text-sm text-muted-foreground">{step.detail}</p>
                </div>
                {step.payable ? (
                  <Link
                    className={cn(
                      buttonVariants({ size: "touch" }),
                      "shrink-0"
                    )}
                    href={memberPayHref(step.payable)}
                  >
                    <Wallet aria-hidden />
                    Pay
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        {gate.action.kind === "retry" ? (
          <Button
            onClick={() => router.refresh()}
            size="touch"
            type="button"
            variant={outline ? "outline" : "default"}
          >
            {gate.action.label}
          </Button>
        ) : (
          <Link
            className={buttonVariants({
              size: "touch",
              variant: outline ? "outline" : "default",
            })}
            href="/support"
          >
            {gate.action.label}
          </Link>
        )}
      </div>
    </section>
  )
}
