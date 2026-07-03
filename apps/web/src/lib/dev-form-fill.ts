"use client"

import type { FieldValues, UseFormReturn } from "react-hook-form"
import { createWorkspaceSlugSuggestion } from "@/lib/signup-flow"

const firstNames = ["Amina", "Zainab", "Fatima", "Maryam", "Khadija", "Hauwa", "Yusuf", "Musa", "Ibrahim", "Sadiq"]
const lastNames = ["Yusuf", "Bello", "Garba", "Muhammad", "Sule", "Usman", "Abdullahi", "Ilyas", "Kabir", "Lawal"]
const cooperativePrefixes = ["Noor", "Amanah", "Barakah", "Safa", "Rahma", "Tijarah", "An-Nur", "Sidq"]
const cooperativeSuffixes = ["Cooperative Society", "Multipurpose Cooperative", "Savings Cooperative", "Thrift Cooperative"]
const streets = ["Emir Road", "Ahmadu Bello Way", "Unity Close", "Independence Avenue", "Sultan Crescent", "Central Market Road"]
const cities = ["Kaduna North, Kaduna State", "Kano Municipal, Kano State", "Ilorin, Kwara State", "Ikeja, Lagos State", "Abuja Municipal, FCT", "Ibadan North, Oyo State"]

function randomItem<TValue>(items: readonly TValue[]) {
  return items[Math.floor(Math.random() * items.length)]
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/(^\.|\.$)/g, "")
}

function randomStartDate() {
  const year = randomInt(2016, 2023)
  const month = String(randomInt(1, 12)).padStart(2, "0")
  const day = String(randomInt(1, 28)).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function createRandomContact() {
  const primaryContactFullName = `${randomItem(firstNames)} ${randomItem(lastNames)}`
  const emailHandle = slugify(primaryContactFullName)

  return {
    primaryContactEmail: `${emailHandle}${randomInt(10, 99)}@example.test`,
    primaryContactFullName,
    memberNumberPrefix: "PC-",
    primaryContactMemberNumber: String(randomInt(1000, 9999)),
  }
}

function createRandomCooperativeName() {
  return `${randomItem(cooperativePrefixes)} ${randomItem(cooperativeSuffixes)}`
}

function createRandomOfficeAddress() {
  return `${randomInt(4, 88)} ${randomItem(streets)}, ${randomItem(cities)}`
}

const devFormDefaults = {
  onboarding: () => {
    const contact = createRandomContact()

    return {
      cooperativeName: createRandomCooperativeName(),
      confirmPassword: "password123",
      currentSize: randomInt(45, 400),
      officeAddress: createRandomOfficeAddress(),
      password: "password123",
      primaryContactEmail: contact.primaryContactEmail,
      primaryContactFullName: contact.primaryContactFullName,
      memberNumberPrefix: contact.memberNumberPrefix,
      primaryContactMemberNumber: contact.primaryContactMemberNumber,
      startDate: randomStartDate(),
      token: "",
    }
  },
  signup: () => {
    const contact = createRandomContact()
    const cooperativeName = createRandomCooperativeName()

    return {
      cooperativeName,
      memberNumberPrefix: contact.memberNumberPrefix,
      primaryContactEmail: contact.primaryContactEmail,
      primaryContactFullName: contact.primaryContactFullName,
      primaryContactMemberNumber: contact.primaryContactMemberNumber,
      workspaceSlug: createWorkspaceSlugSuggestion(cooperativeName),
    }
  },
} as const

export type DevFormKind = keyof typeof devFormDefaults

export function getDevFormDefaults<TKind extends DevFormKind>(kind: TKind) {
  return devFormDefaults[kind]()
}

export function applyDevFormFill<TFieldValues extends FieldValues>(
  form: Pick<UseFormReturn<TFieldValues>, "reset">,
  kind: DevFormKind,
  overrides?: Partial<TFieldValues>,
) {
  form.reset(({
    ...getDevFormDefaults(kind),
    ...overrides,
  } as unknown) as TFieldValues)
}
