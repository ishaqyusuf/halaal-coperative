"use client"

import {
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react"
import type {
  TenantOperationProfilePolicy,
  TenantServiceAccessMode,
  TenantServiceKey,
} from "@halaalvest/db"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@halaalvest/ui/components/field"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { useRouter } from "next/navigation"
import { LabeledSelectInput } from "@/components/labeled-select-input"
import { useOperationProfileSettingsParams } from "@/hooks/use-operation-profile-settings-params"
import { updateTenantOperationProfileAction } from "@/lib/dashboard-actions"
import {
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
  const formRef = useRef<HTMLFormElement>(null)
  const [nextAccessMode, setNextAccessMode] =
    useState<TenantServiceAccessMode>(currentAccessMode)
  const service = getOperationProfileService(serviceKey)
  const selectedMode = operationProfileAccessModeOptions.find(
    (option) => option.value === nextAccessMode
  )!
  const requiresChangeReason = isRestrictiveOperationProfileAccessChange({
    next: nextAccessMode,
    previous: currentAccessMode,
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    startTransition(async () => {
      try {
        await updateTenantOperationProfileAction(formData)
        showSuccess(
          "Service access saved",
          `${service.label} is now ${selectedMode.label.toLowerCase()}.`
        )
        await setParams(null)
        router.refresh()
      } catch (error) {
        showError(
          "Could not save service access",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <form
      className="grid gap-5 px-4 pb-1 sm:px-6"
      onSubmit={handleSubmit}
      ref={formRef}
    >
      <FieldSet>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={getOperationProfileServiceInputName(serviceKey)}>
              Access mode
            </FieldLabel>
            <FieldDescription>{service.body}</FieldDescription>
            <LabeledSelectInput
              disabled={isPending}
              id={getOperationProfileServiceInputName(serviceKey)}
              name={getOperationProfileServiceInputName(serviceKey)}
              onValueChange={(value) => {
                const option = operationProfileAccessModeOptions.find(
                  (candidate) => candidate.value === value
                )

                if (option) {
                  setNextAccessMode(option.value)
                  formRef.current?.dispatchEvent(
                    new Event("input", { bubbles: true })
                  )
                }
              }}
              options={operationProfileAccessModeOptions.map((option) => ({
                label: option.label,
                value: option.value,
              }))}
              triggerClassName="h-11 md:h-9"
              value={nextAccessMode}
            />
            <FieldDescription>{selectedMode.description}</FieldDescription>
          </Field>
        </FieldGroup>
      </FieldSet>

      <Field>
        <FieldLabel htmlFor="changeReason">
          Change reason{requiresChangeReason ? " (required)" : " (optional)"}
        </FieldLabel>
        <Textarea
          disabled={isPending}
          id="changeReason"
          name="changeReason"
          placeholder="Example: This service is paused while the new operating policy is approved."
          required={requiresChangeReason}
        />
        <FieldDescription>
          {requiresChangeReason
            ? "Reducing access requires an audit reason before this change can be saved."
            : "Any reason provided is saved to the audit log with the before and after access mode."}
        </FieldDescription>
      </Field>

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

      <div className="flex border-t border-border/70 pt-4 sm:justify-end">
        <Button
          className="h-11 w-full sm:h-9 sm:w-auto"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Saving..." : "Save access"}
        </Button>
      </div>
    </form>
  )
}
