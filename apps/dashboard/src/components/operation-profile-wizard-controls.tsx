"use client"

import { type MouseEvent } from "react"
import { Button } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"

function submitFormById(formId: string) {
  const form = document.getElementById(formId)

  if (form instanceof HTMLFormElement) {
    form.requestSubmit()
  }
}

export function OperationProfileChoice({
  checked,
  description,
  name,
  title,
  value,
}: {
  checked: boolean
  description: string
  name: string
  title: string
  value: string
}) {
  function handleDoubleClick(event: MouseEvent<HTMLLabelElement>) {
    const input = event.currentTarget.querySelector<HTMLInputElement>(
      'input[type="radio"]'
    )

    if (input && !input.checked) {
      input.checked = true
      input.dispatchEvent(new Event("input", { bubbles: true }))
      input.dispatchEvent(new Event("change", { bubbles: true }))
    }

    event.currentTarget.closest("form")?.requestSubmit()
  }

  return (
    <label
      className={cn(
        "flex min-h-28 cursor-pointer gap-3 border border-border/70 bg-background p-4 text-sm transition-all duration-200",
        "hover:border-foreground/30 hover:bg-muted/20",
        "has-[input:checked]:border-primary has-[input:checked]:bg-primary/5 has-[input:checked]:shadow-sm"
      )}
      onDoubleClick={handleDoubleClick}
    >
      <input
        className="mt-1 size-4 shrink-0 accent-primary"
        defaultChecked={checked}
        name={name}
        type="radio"
        value={value}
      />
      <span>
        <span className="block text-base font-semibold text-foreground">
          {title}
        </span>
        <span className="mt-1 block leading-6 text-muted-foreground">
          {description}
        </span>
      </span>
    </label>
  )
}

export function OperationProfileSubmitButton({
  formId,
  label,
}: {
  formId: string
  label: string
}) {
  return (
    <Button onClick={() => submitFormById(formId)} type="button">
      {label}
    </Button>
  )
}
