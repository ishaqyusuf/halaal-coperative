"use client"

import type { FieldValues, UseFormReturn } from "react-hook-form"

const devFormDefaults = {
  onboarding: {
    cooperativeName: "Noor Cooperative Society",
    currentSize: 125,
    officeAddress: "12 Emir Road, Kaduna North, Kaduna State",
    primaryContactEmail: "admin@noor.local",
    primaryContactFullName: "Amina Yusuf",
    startDate: "2019-03-15",
    token: "",
  },
  signup: {
    cooperativeName: "Noor Cooperative Society",
    primaryContactEmail: "admin@noor.local",
    primaryContactFullName: "Amina Yusuf",
  },
} as const

export type DevFormKind = keyof typeof devFormDefaults

export function getDevFormDefaults<TKind extends DevFormKind>(kind: TKind) {
  return devFormDefaults[kind]
}

export function applyDevFormFill<TFieldValues extends FieldValues>(
  form: Pick<UseFormReturn<TFieldValues>, "reset">,
  kind: DevFormKind,
  overrides?: Partial<TFieldValues>,
) {
  form.reset(({
    ...devFormDefaults[kind],
    ...overrides,
  } as unknown) as TFieldValues)
}
