"use client"

import type { FieldValues, UseFormReturn } from "react-hook-form"
import { cooperativeSizeRanges } from "@halaalvest/domain"
import {
  createQaAddress,
  createQaCooperative,
  createQaDigits,
  createQaLocation,
  createQaPerson,
  pickQaValue,
  qaLocations,
} from "@halaalvest/utils"
import {
  earlyAccessLaunchTimelineOptions,
  earlyAccessRecordSystemOptions,
  earlyAccessSetupNeedOptions,
} from "@/lib/early-access"

/*
 * Marketing Quick Fill recipes. Values come from the shared generator in
 * @halaalvest/utils (Nigerian Muslim names, emails made only from the
 * contact's name on the active QA Domain, unique cooperatives and numbers).
 * Passwords, OTPs and verification tokens are never filled.
 */

function randomStartDate() {
  const year = 2012 + Math.floor(Math.random() * 12)
  const month = String(1 + Math.floor(Math.random() * 12)).padStart(2, "0")
  const day = String(1 + Math.floor(Math.random() * 28)).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function pickSome<TValue>(values: readonly TValue[], min: number, max: number) {
  const count = min + Math.floor(Math.random() * (max - min + 1))
  return [...values].sort(() => Math.random() - 0.5).slice(0, count)
}

function createEarlyAccessDefaults(emailDomain: string) {
  const cooperative = createQaCooperative({ emailDomain })
  const contact = createQaPerson({ emailDomain })

  return {
    cooperativeName: cooperative.name,
    currentSize: String(pickQaValue(cooperativeSizeRanges).value),
    launchTimeline: pickQaValue(earlyAccessLaunchTimelineOptions).value,
    message: `${cooperative.name} wants guided setup for its existing member records.`,
    phone: contact.phoneNumber,
    primaryContactEmail: contact.email,
    primaryContactFullName: contact.fullName,
    recordSystem: pickQaValue(earlyAccessRecordSystemOptions).value,
    setupNeeds: pickSome(earlyAccessSetupNeedOptions, 2, 4).map(
      (option) => option.value
    ),
  }
}

function createSignupDefaults(emailDomain: string) {
  const cooperative = createQaCooperative({ emailDomain })
  const contact = createQaPerson({ emailDomain })

  return {
    cooperativeCodePrefix: cooperative.codePrefix,
    cooperativeName: cooperative.name,
    primaryContactEmail: contact.email,
    primaryContactFullName: contact.fullName,
    primaryContactMemberNumber: createQaDigits(6),
    workspaceSlug: cooperative.slug,
  }
}

/**
 * The office location that matches the cooperative's name ("Kano Barakah …"
 * is in Kano); otherwise one location drives address, city and state.
 */
function locationForCooperative(cooperativeName?: string) {
  const name = cooperativeName?.toLowerCase() ?? ""
  return (
    qaLocations.find((location) =>
      name.startsWith(location.city.split(" ")[0]!.toLowerCase())
    ) ?? createQaLocation()
  )
}

function createOnboardingDefaults(
  emailDomain: string,
  cooperativeName?: string
) {
  const signup = createSignupDefaults(emailDomain)
  const location = locationForCooperative(
    cooperativeName ?? signup.cooperativeName
  )

  return {
    ...signup,
    city: location.city,
    // QA cooperatives use Nigerian names, cities and phone numbers.
    country: "Nigeria",
    currentSize: String(pickQaValue(cooperativeSizeRanges).value),
    officeAddress: createQaAddress(location),
    startDate: randomStartDate(),
    state: location.state,
    token: "",
  }
}

function createDeletionRequestDefaults(emailDomain: string) {
  return {
    email: createQaPerson({ emailDomain }).email,
    workspaceSlug: createQaCooperative({ emailDomain }).slug,
  }
}

export type DevFormKind =
  | "deletionRequest"
  | "earlyAccess"
  | "onboarding"
  | "signup"

type DevFormValues = {
  deletionRequest: ReturnType<typeof createDeletionRequestDefaults>
  earlyAccess: ReturnType<typeof createEarlyAccessDefaults>
  onboarding: ReturnType<typeof createOnboardingDefaults>
  signup: ReturnType<typeof createSignupDefaults>
}

export async function getDevFormDefaults<TKind extends DevFormKind>(
  kind: TKind,
  options?: { cooperativeName?: string; emailDomain?: string }
): Promise<DevFormValues[TKind]> {
  const emailDomain = options?.emailDomain || "example.test"
  const builders: { [Kind in DevFormKind]: () => DevFormValues[Kind] } = {
    deletionRequest: () => createDeletionRequestDefaults(emailDomain),
    earlyAccess: () => createEarlyAccessDefaults(emailDomain),
    onboarding: () =>
      createOnboardingDefaults(emailDomain, options?.cooperativeName),
    signup: () => createSignupDefaults(emailDomain),
  }
  return builders[kind]()
}

export async function applyDevFormFill<TFieldValues extends FieldValues>(
  form: Pick<UseFormReturn<TFieldValues>, "reset">,
  kind: DevFormKind,
  overrides?: Partial<TFieldValues>,
  options?: { cooperativeName?: string; emailDomain?: string }
) {
  const defaults = await getDevFormDefaults(kind, options)

  form.reset({
    ...defaults,
    ...overrides,
  } as unknown as TFieldValues)
}
