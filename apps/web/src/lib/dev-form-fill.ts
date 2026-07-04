"use client"

import type { FieldValues, UseFormReturn } from "react-hook-form"
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

function createRandomContact(faker: FakerInstance) {
  const firstName = faker.person.firstName()
  const lastName = faker.person.lastName()
  const primaryContactFullName = `${firstName} ${lastName}`
  const emailHandle = slugify(primaryContactFullName)
  const emailSuffix = faker.number.int({ max: 9999, min: 100 })
  const memberNumberPrefix = faker.helpers.arrayElement(memberNumberPrefixes)

  return {
    primaryContactEmail: `${emailHandle}.${emailSuffix}@example.test`,
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

const devFormDefaults = {
  onboarding: (faker: FakerInstance) => {
    const contact = createRandomContact(faker)

    return {
      cooperativeName: createRandomCooperativeName(faker),
      confirmPassword: "password123",
      currentSize: faker.number.int({ max: 850, min: 25 }),
      officeAddress: createRandomOfficeAddress(faker),
      password: "password123",
      primaryContactEmail: contact.primaryContactEmail,
      primaryContactFullName: contact.primaryContactFullName,
      memberNumberPrefix: contact.memberNumberPrefix,
      primaryContactMemberNumber: contact.primaryContactMemberNumber,
      startDate: randomStartDate(),
      token: "",
    }
  },
  signup: (faker: FakerInstance) => {
    const contact = createRandomContact(faker)
    const cooperativeName = createRandomCooperativeName(faker)
    const workspaceSlug = `${createWorkspaceSlugSuggestion(
      cooperativeName,
    )}-${faker.number.int({ max: 999, min: 100 })}`

    return {
      cooperativeName,
      memberNumberPrefix: contact.memberNumberPrefix,
      primaryContactEmail: contact.primaryContactEmail,
      primaryContactFullName: contact.primaryContactFullName,
      primaryContactMemberNumber: contact.primaryContactMemberNumber,
      workspaceSlug,
    }
  },
} as const

export type DevFormKind = keyof typeof devFormDefaults

export async function getDevFormDefaults<TKind extends DevFormKind>(
  kind: TKind,
) {
  const faker = await getFaker()

  return devFormDefaults[kind](faker)
}

export async function applyDevFormFill<TFieldValues extends FieldValues>(
  form: Pick<UseFormReturn<TFieldValues>, "reset">,
  kind: DevFormKind,
  overrides?: Partial<TFieldValues>,
) {
  const defaults = await getDevFormDefaults(kind)

  form.reset(({
    ...defaults,
    ...overrides,
  } as unknown) as TFieldValues)
}
