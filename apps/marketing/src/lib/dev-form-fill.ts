"use client"

import type { FieldValues, UseFormReturn } from "react-hook-form"
import {
  cooperativeCountryOptions,
  cooperativeSizeRanges,
} from "@halaalvest/domain"
import { buildQaEmail, normalizeCooperativeQaSlug } from "@halaalvest/utils"
import {
  earlyAccessLaunchTimelineOptions,
  earlyAccessRecordSystemOptions,
  earlyAccessSetupNeedOptions,
} from "@/lib/early-access"
import { createWorkspaceSlugSuggestion } from "@/lib/signup-flow"

type FakerInstance = typeof import("@faker-js/faker").faker

const cooperativeRegions = [
  "Kaduna",
  "Kano",
  "Ilorin",
  "Ikeja",
  "Abuja",
  "Ibadan",
  "Abeokuta",
  "Minna",
  "Jos",
  "Port Harcourt",
]
const cooperativeGroups = [
  "Teachers",
  "Market Traders",
  "Civil Servants",
  "Artisans",
  "Health Workers",
  "Small Business",
  "Transport Workers",
  "Professionals",
  "Community",
  "Staff",
]
const cooperativeQualifiers = [
  "Unity",
  "Heritage",
  "Prosperity",
  "Mutual",
  "Forward",
  "Trust",
  "Growth",
  "Solidarity",
  "Reliable",
  "Enterprise",
]
const cooperativeSuffixes = [
  "Cooperative Society",
  "Multipurpose Cooperative",
  "Savings Cooperative",
  "Thrift Cooperative",
  "Mutual Aid Cooperative",
]
const streets = [
  "Emir Road",
  "Ahmadu Bello Way",
  "Unity Close",
  "Independence Avenue",
  "Sultan Crescent",
  "Central Market Road",
  "Cooperative Avenue",
  "Liberty Road",
  "Station Road",
  "Secretariat Drive",
]
const cities = [
  "Kaduna North, Kaduna State",
  "Kano Municipal, Kano State",
  "Ilorin, Kwara State",
  "Ikeja, Lagos State",
  "Abuja Municipal, FCT",
  "Ibadan North, Oyo State",
  "Abeokuta South, Ogun State",
  "Minna, Niger State",
  "Jos North, Plateau State",
  "Port Harcourt, Rivers State",
]
const locationDefaults = [
  { city: "Lagos Island", state: "Lagos" },
  { city: "Kano Municipal", state: "Kano" },
  { city: "Ilorin", state: "Kwara" },
  { city: "Ikeja", state: "Lagos" },
  { city: "Abuja Municipal", state: "FCT" },
  { city: "Ibadan North", state: "Oyo" },
  { city: "Abeokuta South", state: "Ogun" },
  { city: "Minna", state: "Niger" },
  { city: "Jos North", state: "Plateau" },
  { city: "Port Harcourt", state: "Rivers" },
]
const memberNumberPrefixes = ["", "PC-", "MEM-", "COOP-", "HV-", "MS-"]

async function getFaker() {
  const { faker } = await import("@faker-js/faker")

  return faker
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/(^\.|\.$)/g, "")
}

function randomStartDate() {
  const year = Math.floor(Math.random() * (2023 - 2014 + 1)) + 2014
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, "0")
  const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function createRandomContact(
  faker: FakerInstance,
  emailDomain = "example.test",
) {
  const firstName = faker.person.firstName()
  const lastName = faker.person.lastName()
  const primaryContactFullName = `${firstName} ${lastName}`
  const emailHandle = slugify(primaryContactFullName)
  const emailSuffix = faker.number.int({ max: 9999, min: 100 })
  const memberNumberPrefix = faker.helpers.arrayElement(memberNumberPrefixes)

  return {
    primaryContactEmail: buildQaEmail(
      `${emailHandle}-${emailSuffix}`,
      emailDomain,
    ),
    primaryContactFullName,
    memberNumberPrefix,
    primaryContactMemberNumber: String(
      faker.number.int({ max: 999999, min: 1000 }),
    ),
  }
}

function createRandomCooperativeName(faker: FakerInstance) {
  const region = faker.helpers.arrayElement(cooperativeRegions)
  const group = faker.helpers.arrayElement(cooperativeGroups)
  const qualifier = faker.helpers.arrayElement(cooperativeQualifiers)
  const suffix = faker.helpers.arrayElement(cooperativeSuffixes)

  return `${region} ${qualifier} ${group} ${suffix}`
}

function createRandomOfficeAddress(faker: FakerInstance) {
  const suite = faker.helpers.arrayElement([
    `Suite ${faker.number.int({ max: 40, min: 1 })}`,
    `Block ${faker.number.int({ max: 9, min: 1 })}`,
    `Unit ${faker.number.int({ max: 24, min: 1 })}`,
    "Main office",
  ])

  const streetAddress = `${faker.number.int({
    max: 188,
    min: 4,
  })} ${faker.helpers.arrayElement(streets)}`

  return `${suite}, ${streetAddress}, ${faker.helpers.arrayElement(cities)}`
}

function createEarlyAccessDefaults(faker: FakerInstance, emailDomain: string) {
  const cooperativeName = `${createRandomCooperativeName(faker)} ${faker.number.int({
    max: 9999,
    min: 100,
  })}`
  const contact = createRandomContact(faker)

  return {
    cooperativeName,
    currentSize: String(
      faker.helpers.arrayElement(cooperativeSizeRanges).value,
    ),
    launchTimeline: faker.helpers.arrayElement(
      earlyAccessLaunchTimelineOptions,
    ).value,
    message: "We want guided setup for our existing member records.",
    phone: `+23480${faker.number.int({ max: 99999999, min: 10000000 })}`,
    primaryContactEmail: buildQaEmail(
      normalizeCooperativeQaSlug(cooperativeName),
      emailDomain,
    ),
    primaryContactFullName: contact.primaryContactFullName,
    recordSystem: faker.helpers.arrayElement(
      earlyAccessRecordSystemOptions,
    ).value,
    setupNeeds: faker.helpers
      .arrayElements(earlyAccessSetupNeedOptions, { max: 4, min: 2 })
      .map((option) => option.value),
  }
}

const devFormDefaults = {
  onboarding: (faker: FakerInstance, emailDomain = "example.test") => {
    const contact = createRandomContact(faker, emailDomain)
    const location = faker.helpers.arrayElement(locationDefaults)

    return {
      city: location.city,
      cooperativeName: createRandomCooperativeName(faker),
      confirmPassword: "password123",
      country: faker.helpers.arrayElement(cooperativeCountryOptions),
      currentSize: String(
        faker.helpers.arrayElement(cooperativeSizeRanges).value,
      ),
      officeAddress: createRandomOfficeAddress(faker),
      password: "password123",
      primaryContactEmail: contact.primaryContactEmail,
      primaryContactFullName: contact.primaryContactFullName,
      memberNumberPrefix: contact.memberNumberPrefix,
      primaryContactMemberNumber: contact.primaryContactMemberNumber,
      state: location.state,
      startDate: randomStartDate(),
      token: "",
    }
  },
  signup: (faker: FakerInstance, emailDomain = "example.test") => {
    const contact = createRandomContact(faker, emailDomain)
    const cooperativeName = createRandomCooperativeName(faker)
    const workspaceSlug = `${createWorkspaceSlugSuggestion(
      cooperativeName,
    )}-${faker.number.int({ max: 999, min: 100 })}`

    return {
      cooperativeName,
      memberNumberPrefix: contact.memberNumberPrefix,
      primaryContactEmail: buildQaEmail(workspaceSlug, emailDomain),
      primaryContactFullName: contact.primaryContactFullName,
      primaryContactMemberNumber: contact.primaryContactMemberNumber,
      workspaceSlug,
    }
  },
} as const

export type DevFormKind = keyof typeof devFormDefaults | "earlyAccess"

export function getDevFormDefaults(
  kind: "earlyAccess",
  options?: { emailDomain?: string },
): Promise<ReturnType<typeof createEarlyAccessDefaults>>
export function getDevFormDefaults(
  kind: "onboarding",
  options?: { emailDomain?: string },
): Promise<ReturnType<(typeof devFormDefaults)["onboarding"]>>
export function getDevFormDefaults(
  kind: "signup",
  options?: { emailDomain?: string },
): Promise<ReturnType<(typeof devFormDefaults)["signup"]>>
export function getDevFormDefaults(
  kind: DevFormKind,
  options?: { emailDomain?: string },
): Promise<
  | ReturnType<typeof createEarlyAccessDefaults>
  | ReturnType<(typeof devFormDefaults)["onboarding"]>
  | ReturnType<(typeof devFormDefaults)["signup"]>
>
export async function getDevFormDefaults(
  kind: DevFormKind,
  options?: { emailDomain?: string },
) {
  const faker = await getFaker()

  if (kind === "earlyAccess") {
    return createEarlyAccessDefaults(
      faker,
      options?.emailDomain ?? "example.test",
    )
  }

  if (kind === "onboarding") {
    return devFormDefaults.onboarding(faker, options?.emailDomain)
  }

  return devFormDefaults.signup(faker, options?.emailDomain)
}

export async function applyDevFormFill<TFieldValues extends FieldValues>(
  form: Pick<UseFormReturn<TFieldValues>, "reset">,
  kind: DevFormKind,
  overrides?: Partial<TFieldValues>,
  options?: { emailDomain?: string },
) {
  const defaults = await getDevFormDefaults(kind, options)

  form.reset(({
    ...defaults,
    ...overrides,
  } as unknown) as TFieldValues)
}
