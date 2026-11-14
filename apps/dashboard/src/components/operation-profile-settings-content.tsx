"use client"

import { DashboardNativeQuickFill } from "@/components/dashboard-quick-fill"
import { useRef, useState, useTransition, type FormEvent } from "react"
import type {
  TenantOperationProfilePolicy,
  TenantServiceAccessMode,
  TenantServiceKey,
} from "@halaalvest/db"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import {
  RadioGroup,
  RadioGroupItem,
} from "@halaalvest/ui/components/radio-group"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { cn } from "@halaalvest/ui/lib/utils"
import { useRouter } from "next/navigation"
import { ConfirmActionDialog } from "@/components/confirm-action-dialog"
import { useOperationProfileSettingsParams } from "@/hooks/use-operation-profile-settings-params"
import { updateTenantOperationProfileAction } from "@/lib/dashboard-actions"
import {
  getOperationProfileAccessEffect,
  getOperationProfileService,
  getOperationProfileServiceInputName,
  isRestrictiveOperationProfileAccessChange,
  operationProfileAccessModeOptions,
} from "@/lib/settings/operation-profile-settings"

export function OperationProfileSettingsContent({
  currentAccessMode,
  policy,
  serviceKey,
}: {
  currentAccessMode: TenantServiceAccessMode
  policy: TenantOperationProfilePolicy
  serviceKey: TenantServiceKey
}) {
  const router = useRouter()
  const { setParams } = useOperationProfileSettingsParams()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const [nextAccessMode, setNextAccessMode] =
    useState<TenantServiceAccessMode>(currentAccessMode)
  const [reason, setReason] = useState("")
  const service = getOperationProfileService(serviceKey)
  const selectedMode = operationProfileAccessModeOptions.find(
    (option) => option.value === nextAccessMode
  )!
  const reducesAccess = isRestrictiveOperationProfileAccessChange({
    next: nextAccessMode,
    previous: currentAccessMode,
  })
  const inputName = getOperationProfileServiceInputName(serviceKey)

  function save() {
    if (!formRef.current) return
    const formData = new FormData(formRef.current)

    startTransition(async () => {
      try {
        await updateTenantOperationProfileAction(formData)
        showSuccess(
          "Saved",
          `${service.label}: ${selectedMode.label.toLowerCase()}.`
        )
        setConfirming(false)
        await setParams(null)
        router.refresh()
      } catch (error) {
        setConfirming(false)
        showError(
          "Could not save",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (nextAccessMode === currentAccessMode) {
      void setParams(null)
      return
    }

    if (reducesAccess) {
      setConfirming(true)
      return
    }

    save()
  }

  return (
    <form
      className="grid gap-5 px-4 pb-1 sm:px-6"
      onSubmit={handleSubmit}
      ref={formRef}
    >
      <DashboardNativeQuickFill
        values={() => ({
          changeReason: "Agreed at the monthly executive meeting.",
        })}
      />
      <p className="text-base text-muted-foreground">{service.body}</p>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-base font-medium text-foreground">
          Who can start a new one?
        </legend>
        <input name={inputName} type="hidden" value={nextAccessMode} />
        <RadioGroup
          className="grid gap-2"
          disabled={isPending}
          onValueChange={(value) =>
            setNextAccessMode(value as TenantServiceAccessMode)
          }
          value={nextAccessMode}
        >
          {operationProfileAccessModeOptions.map((option) => (
            <label
              className={cn(
                "flex min-h-11 cursor-pointer items-start gap-3 rounded-(--ui-radius-control) border px-4 py-3",
                option.value === nextAccessMode
                  ? "border-primary bg-primary/5"
                  : "border-border"
              )}
              htmlFor={`access-${option.value}`}
              key={option.value}
            >
              <RadioGroupItem
                className="mt-1"
                id={`access-${option.value}`}
                value={option.value}
              />
              <span>
                <span className="block text-base font-semibold text-foreground">
                  {option.label}
                  {option.value === currentAccessMode ? (
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      (now)
                    </span>
                  ) : null}
                </span>
                <span className="block text-base text-muted-foreground">
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </RadioGroup>
      </fieldset>

      {reducesAccess ? (
        <div className="grid gap-2">
          <label
            className="text-base font-medium text-foreground"
            htmlFor="changeReason"
          >
            Why are you changing this?
          </label>
          <Textarea
            className="text-base"
            disabled={isPending}
            id="changeReason"
            name="changeReason"
            onChange={(event) => setReason(event.target.value)}
            required
            value={reason}
          />
          <p className="text-base text-muted-foreground">
            Kept in the activity log.
          </p>
        </div>
      ) : null}

      <input
        name="procurementMaximumActiveObligationsPerMember"
        type="hidden"
        value={policy.procurementMaximumActiveObligationsPerMember}
      />
      <input
        name="foodPurchaseMaximumActiveObligationsPerMember"
        type="hidden"
        value={policy.foodPurchaseMaximumActiveObligationsPerMember}
      />
      <input
        name="foodPurchaseRequiresOpenCycle"
        type="hidden"
        value={policy.foodPurchaseRequiresOpenCycle ? "true" : "false"}
      />

      <div className="flex border-t border-border pt-4 sm:justify-end">
        <Button
          className="h-11 w-full text-base sm:w-auto"
          disabled={isPending || (reducesAccess && !reason.trim())}
          type="submit"
        >
          {isPending ? "Saving…" : "Save"}
        </Button>
      </div>

      <ConfirmActionDialog
        actionLabel={nextAccessMode === "disabled" ? "Turn off" : "Save"}
        description={getOperationProfileAccessEffect({
          label: service.label,
          next: nextAccessMode,
          previous: currentAccessMode,
        })}
        destructive
        onCancel={() => setConfirming(false)}
        onConfirm={save}
        open={confirming}
        pending={isPending}
        title={
          nextAccessMode === "disabled"
            ? `Turn off ${service.label.toLowerCase()}?`
            : `Change ${service.label.toLowerCase()}?`
        }
      />
    </form>
  )
}
