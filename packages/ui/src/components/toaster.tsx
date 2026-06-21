"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  ArtificialIntelligence04Icon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
  MultiplicationSignCircleIcon,
} from "@hugeicons/core-free-icons"

import { Progress } from "@halaalvest/ui/components/progress"
import { Spinner } from "@halaalvest/ui/components/spinner"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@halaalvest/ui/components/toast"
import { useToast } from "@halaalvest/ui/components/use-toast"

function ToastIcon({ variant }: { variant?: string | null }) {
  if (!variant) {
    return null
  }

  if (variant === "progress" || variant === "spinner") {
    return <Spinner className="size-4" />
  }

  const icon =
    variant === "success"
      ? CheckmarkCircle02Icon
      : variant === "error"
        ? MultiplicationSignCircleIcon
        : variant === "warning"
          ? Alert02Icon
          : variant === "ai"
            ? ArtificialIntelligence04Icon
            : InformationCircleIcon

  return <HugeiconsIcon icon={icon} strokeWidth={2} className="size-4" />
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(
        ({
          id,
          title,
          description,
          progress = 0,
          action,
          footer,
          ...props
        }) => (
          <Toast key={id} {...props} className="flex flex-col">
            <div className="flex w-full">
              <div className="w-full justify-center space-y-2">
                <div className="flex justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    {props.variant ? (
                      <div className="flex size-5 shrink-0 items-center">
                        <ToastIcon variant={props.variant} />
                      </div>
                    ) : null}
                    {title ? <ToastTitle>{title}</ToastTitle> : null}
                  </div>

                  {props.variant === "progress" ? (
                    <span className="shrink-0 text-sm text-muted-foreground">
                      {progress}%
                    </span>
                  ) : null}
                </div>

                {props.variant === "progress" ? (
                  <Progress
                    value={progress}
                    className="w-full rounded-none [&_[data-slot=progress-track]]:h-[3px] [&_[data-slot=progress-track]]:rounded-none"
                  />
                ) : null}

                {description ? (
                  <ToastDescription>{description}</ToastDescription>
                ) : null}
              </div>
              {action}
              <ToastClose />
            </div>

            {footer ? (
              <div className="flex w-full justify-end">{footer}</div>
            ) : null}
          </Toast>
        )
      )}
      <ToastViewport />
    </ToastProvider>
  )
}
