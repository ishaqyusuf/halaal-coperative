"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import type { QaQuickFillContext } from "@halaalvest/utils"
import { Button } from "@halaalvest/ui/components/button"
import { useNotifications } from "@halaalvest/notifications-react"
import {
  getGenericQuickFillValue,
  isSearchOnlyForm,
} from "@/lib/universal-form-quick-fill"

type FormHost = {
  form: HTMLFormElement
  host: HTMLDivElement
}

function dispatchValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value")

  descriptor?.set?.call(element, value)
  element.dispatchEvent(new Event("input", { bubbles: true }))
  element.dispatchEvent(new Event("change", { bubbles: true }))
}

function quickFillForm(form: HTMLFormElement, emailDomain: string) {
  const passwordValue = "password123"
  const radioNames = new Set<string>()

  for (const element of Array.from(form.elements)) {
    if (element instanceof HTMLInputElement) {
      if (
        element.disabled ||
        element.readOnly ||
        ["button", "file", "hidden", "submit"].includes(element.type)
      ) {
        continue
      }

      if (element.type === "checkbox") {
        if (element.required && !element.checked) {
          element.click()
        }
        continue
      }

      if (element.type === "radio") {
        if (!radioNames.has(element.name)) {
          radioNames.add(element.name)
          if (!element.checked) element.click()
        }
        continue
      }

      const value =
        element.name.toLowerCase().includes("confirmpassword")
          ? passwordValue
          : getGenericQuickFillValue({
              emailDomain,
              max: element.max,
              min: element.min,
              name: element.name || element.id,
              type: element.type,
            })
      dispatchValue(element, value)
      continue
    }

    if (element instanceof HTMLTextAreaElement) {
      if (!element.disabled && !element.readOnly) {
        dispatchValue(
          element,
          getGenericQuickFillValue({
            emailDomain,
            name: element.name || element.id,
            type: "textarea",
          }),
        )
      }
      continue
    }

    if (element instanceof HTMLSelectElement && !element.disabled) {
      const option = Array.from(element.options).find(
        (candidate) => !candidate.disabled && candidate.value,
      )
      if (option) {
        element.value = option.value
        element.dispatchEvent(new Event("change", { bubbles: true }))
      }
    }
  }
}

export function UniversalQaQuickFill({
  quickFill,
}: {
  quickFill: QaQuickFillContext
}) {
  const { showInfo } = useNotifications()
  const [hosts, setHosts] = useState<FormHost[]>([])

  useEffect(() => {
    if (!quickFill.enabled) return

    let frame = 0

    function scan() {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const nextHosts: FormHost[] = []

        for (const form of Array.from(document.forms)) {
          if (
            form.dataset.quickFillExempt === "true" ||
            isSearchOnlyForm(form) ||
            Array.from(form.querySelectorAll("button")).some(
              (button) =>
                button.dataset.universalQuickFill !== "true" &&
                /quick fill|autofill dev data/i.test(button.textContent ?? ""),
            )
          ) {
            continue
          }

          let host = form.querySelector<HTMLDivElement>(
            ":scope > [data-qa-quick-fill-host]",
          )
          if (!host) {
            host = document.createElement("div")
            host.dataset.qaQuickFillHost = "true"
            host.className = "col-span-full flex justify-end"
            form.prepend(host)
          }
          nextHosts.push({ form, host })
        }

        setHosts(nextHosts)
      })
    }

    const observer = new MutationObserver(scan)
    observer.observe(document.body, { childList: true, subtree: true })
    scan()

    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
      for (const host of document.querySelectorAll(
        "[data-qa-quick-fill-host]",
      )) {
        host.remove()
      }
    }
  }, [quickFill.enabled])

  if (!quickFill.enabled) return null

  return hosts.map(({ form, host }, index) =>
    createPortal(
      <Button
        data-universal-quick-fill="true"
        size="sm"
        type="button"
        variant="outline"
        onClick={() => {
          quickFillForm(form, quickFill.emailDomain)
          showInfo(
            "Form quick filled",
            `Synthetic values use @${quickFill.emailDomain}.`,
          )
        }}
      >
        Quick fill
      </Button>,
      host,
      `${form.id || form.getAttribute("name") || "form"}-${index}`,
    ),
  )
}
