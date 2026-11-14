"use client"

import { useState, type ComponentProps } from "react"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@halaalvest/ui/components/input-group"

type PasswordInputProps = Omit<ComponentProps<"input">, "type"> & {
  groupClassName?: string
}

// A password field with a visible Show/Hide button. Every input prop (id,
// aria-*, name, value) reaches the real <input>, so it works inside
// FormControl and in plain posted forms alike.
export function PasswordInput({
  groupClassName,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <InputGroup className={groupClassName}>
      <InputGroupInput {...props} type={visible ? "text" : "password"} />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="h-10 min-w-16 px-3 text-base font-medium text-primary"
          onClick={() => setVisible((current) => !current)}
          size="sm"
        >
          {visible ? "Hide" : "Show"}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}
