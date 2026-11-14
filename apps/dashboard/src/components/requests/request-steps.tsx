import { cn } from "@halaalvest/ui/lib/utils"
import { Check } from "lucide-react"
import {
  getRequestState,
  getRequestSteps,
  type RequestStateInput,
} from "@/lib/requests/request-status-words"

/** "Where it is": the request's steps, done ones ticked, the current one bold. */
export function RequestSteps(props: RequestStateInput) {
  const state = getRequestState(props)
  const steps = getRequestSteps(props.kind, props.repayable ?? true)

  if (state.step < 0) {
    return (
      <p className="rounded-(--ui-radius-surface) border border-border bg-muted px-4 py-3 text-base font-medium text-foreground">
        {state.label}
      </p>
    )
  }

  return (
    <ol
      aria-label="Where it is"
      className="grid gap-2 sm:flex sm:flex-wrap sm:gap-x-2"
    >
      {steps.map((step, index) => {
        const reached =
          index < state.step || (index === state.step && state.tone === "good")
        const current = index === state.step

        return (
          <li
            aria-current={current ? "step" : undefined}
            className={cn(
              "flex items-center gap-2 text-base",
              current
                ? "font-semibold text-foreground"
                : reached
                  ? "text-foreground"
                  : "text-muted-foreground"
            )}
            key={step}
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full border text-sm",
                reached
                  ? "border-emerald-700 bg-emerald-700 text-white dark:border-emerald-500 dark:bg-emerald-600"
                  : current
                    ? "border-2 border-amber-600 bg-amber-50 text-amber-900"
                    : "border-border bg-background"
              )}
            >
              {reached ? <Check className="size-4" /> : index + 1}
            </span>
            {step}
            {index < steps.length - 1 ? (
              <span
                aria-hidden="true"
                className="hidden text-muted-foreground sm:inline"
              >
                →
              </span>
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
