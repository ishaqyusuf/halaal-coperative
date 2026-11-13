/**
 * Synthetic Quick Fill values shared by the marketing site, dashboard and
 * mobile app (dev and preview only; callers own the visibility gate).
 *
 * Rules (owner requirements, 13 November 2026):
 * - Names fit a Nigerian Muslim cooperative: Hausa, Yoruba Muslim and Arabic
 *   given names with Nigerian surnames. No Christian or default English names.
 * - Emails are built only from the person's own name parts on the QA domain,
 *   e.g. aisha.bello@ or musabello@. Never digits or random strings in the
 *   local part. If every combination is used up, a readable place word is
 *   added (aisha.bello.kano@), never a number.
 * - Every fill is unique: phones, references and codes come from a
 *   monotonically increasing clock, and names/emails are remembered (in memory
 *   and, on the web, in localStorage) so they are not reused between runs.
 */

export const qaFemaleGivenNames = [
  "Aisha",
  "Fatima",
  "Zainab",
  "Maryam",
  "Khadija",
  "Hauwa",
  "Amina",
  "Hafsat",
  "Rukayya",
  "Asmau",
  "Halima",
  "Safiya",
  "Sumayya",
  "Hadiza",
  "Jamila",
  "Nafisa",
  "Bilkisu",
  "Zulaihat",
  "Firdausi",
  "Habiba",
  "Rahma",
  "Saudat",
  "Aminat",
  "Kafayat",
  "Mujidat",
  "Rofiat",
  "Basirat",
  "Shakirat",
  "Latifat",
  "Barakat",
  "Hassana",
  "Husaina",
  "Ummi",
  "Zahra",
  "Salma",
  "Nusaiba",
  "Hajara",
  "Sadiya",
  "Aliyah",
  "Maimuna",
] as const

export const qaMaleGivenNames = [
  "Musa",
  "Ibrahim",
  "Yusuf",
  "Abdullahi",
  "Abubakar",
  "Umar",
  "Usman",
  "Aliyu",
  "Muhammad",
  "Ahmad",
  "Sani",
  "Bashir",
  "Kabiru",
  "Nasiru",
  "Sulaiman",
  "Haruna",
  "Idris",
  "Yakubu",
  "Lawal",
  "Mustapha",
  "Abdulrahman",
  "Abdulkadir",
  "Hamza",
  "Bilal",
  "Tijani",
  "Jamiu",
  "Ridwan",
  "Lukman",
  "Kamaldeen",
  "Rasheed",
  "Mubarak",
  "Saheed",
  "Ismail",
  "Zakariyya",
  "Salihu",
  "Nuhu",
  "Adamu",
  "Tanimu",
  "Shehu",
  "Murtala",
  "Faruk",
  "Anas",
] as const

export const qaSurnames = [
  "Bello",
  "Abdullahi",
  "Lawal",
  "Danjuma",
  "Garba",
  "Sani",
  "Usman",
  "Aliyu",
  "Suleiman",
  "Abubakar",
  "Haruna",
  "Shehu",
  "Adamu",
  "Bala",
  "Dikko",
  "Gwarzo",
  "Jibril",
  "Tanko",
  "Yakubu",
  "Idris",
  "Mustapha",
  "Abdulsalam",
  "Bakare",
  "Lasisi",
  "Alabi",
  "Ishola",
  "Raji",
  "Oyelade",
  "Ajibade",
  "Balogun",
  "Salami",
  "Akanbi",
  "Kazeem",
  "Yusuf",
  "Ibrahim",
  "Musa",
  "Umar",
  "Mohammed",
  "Abdulkadir",
  "Sambo",
  "Maikano",
  "Inuwa",
  "Kabir",
  "Waziri",
  "Galadima",
  "Ladan",
  "Zubair",
  "Hassan",
  "Bashir",
  "Nuhu",
  "Tijani",
  "Jimoh",
  "Lamidi",
  "Abdulwahab",
] as const

/** Readable words used only when every name combination is taken. */
const qaEmailFallbackWords = [
  "kano",
  "kaduna",
  "ilorin",
  "sokoto",
  "zaria",
  "katsina",
  "bauchi",
  "minna",
  "ibadan",
  "abuja",
  "gombe",
  "yola",
  "lokoja",
  "osogbo",
  "iwo",
  "ede",
] as const

export const qaLocations = [
  { city: "Kaduna North", state: "Kaduna" },
  { city: "Zaria", state: "Kaduna" },
  { city: "Kano Municipal", state: "Kano" },
  { city: "Nassarawa", state: "Kano" },
  { city: "Ilorin West", state: "Kwara" },
  { city: "Sokoto North", state: "Sokoto" },
  { city: "Katsina", state: "Katsina" },
  { city: "Bauchi", state: "Bauchi" },
  { city: "Minna", state: "Niger" },
  { city: "Ibadan North", state: "Oyo" },
  { city: "Abuja Municipal", state: "FCT" },
  { city: "Gombe", state: "Gombe" },
  { city: "Iwo", state: "Osun" },
  { city: "Lokoja", state: "Kogi" },
] as const

const qaStreets = [
  "Ahmadu Bello Way",
  "Emir Road",
  "Sultan Crescent",
  "Central Market Road",
  "Sardauna Crescent",
  "Murtala Mohammed Way",
  "Waziri Road",
  "Unity Close",
  "Masallaci Street",
  "Gidan Dan Hausa Road",
  "Independence Way",
  "Secretariat Road",
] as const

const qaCooperativeQualifiers = [
  "Barakah",
  "Amana",
  "Ihsan",
  "Falah",
  "Nur",
  "Ikhlas",
  "Sabr",
  "Salam",
  "Hikmah",
  "Rahma",
  "Ummah",
  "Ittihad",
  "Yaqeen",
  "Taawun",
  "Huda",
  "Sakina",
  "Tawakkul",
  "Nasara",
  "Albarka",
  "Hadin Kai",
] as const

const qaCooperativeGroups = [
  "Traders",
  "Teachers",
  "Civil Servants",
  "Artisans",
  "Health Workers",
  "Farmers",
  "Market Women",
  "Transporters",
  "Tailors",
  "Staff",
  "Community",
  "Professionals",
] as const

const qaCooperativeSuffixes = [
  "Cooperative Society",
  "Multipurpose Cooperative",
  "Savings Cooperative",
  "Thrift Cooperative",
  "Halal Cooperative",
] as const

const qaOccupations = [
  "Trader",
  "Teacher",
  "Civil servant",
  "Tailor",
  "Farmer",
  "Pharmacist",
  "Nurse",
  "Business owner",
  "Accountant",
  "Engineer",
] as const

/** Mobile network prefixes after +234 (MTN, Airtel, Glo, 9mobile). */
const qaPhonePrefixes = [
  "803",
  "806",
  "813",
  "816",
  "703",
  "706",
  "802",
  "808",
  "812",
  "701",
  "902",
  "907",
  "805",
  "807",
  "815",
  "809",
  "817",
  "818",
] as const

// ---------------------------------------------------------------------------
// Randomness, clock and memory

function randomIndex(length: number) {
  const cryptoSource = (
    globalThis as {
      crypto?: { getRandomValues?: (array: Uint32Array) => Uint32Array }
    }
  ).crypto
  if (cryptoSource?.getRandomValues) {
    const values = new Uint32Array(1)
    cryptoSource.getRandomValues(values)
    return values[0]! % length
  }
  return Math.floor(Math.random() * length)
}

export function pickQaValue<TValue>(values: readonly TValue[]): TValue {
  return values[randomIndex(values.length)]!
}

function shuffle<TValue>(values: readonly TValue[]) {
  const copy = [...values]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = randomIndex(index + 1)
    ;[copy[index], copy[swap]] = [copy[swap]!, copy[index]!]
  }
  return copy
}

let lastTick = 0

/** Strictly increasing milliseconds, so two calls never share a tick. */
function nextTick() {
  lastTick = Math.max(Date.now(), lastTick + 1)
  return lastTick
}

let lastSecond = 0
let secondSequence = 0

/**
 * A number that is unique for about 11.5 days: the current second (mod one
 * million) and a per-second sequence digit. Up to ten values per second.
 */
function uniqueSevenDigits() {
  const second = Math.floor(Date.now() / 1000)
  if (second > lastSecond) {
    lastSecond = second
    secondSequence = 0
  } else {
    secondSequence += 1
  }
  if (secondSequence > 9) {
    lastSecond += 1
    secondSequence = 0
  }
  return String((lastSecond % 1_000_000) * 10 + secondSequence).padStart(7, "0")
}

const memoryStorageKey = "halaalvest.qa-fixtures.used.v1"
const memoryLimit = 3000

type QaFixtureMemory = {
  cooperatives: Set<string>
  emails: Set<string>
  names: Set<string>
}

let memory: QaFixtureMemory | null = null

function browserStorage() {
  try {
    const storage = (globalThis as { localStorage?: Storage }).localStorage
    return storage ?? null
  } catch {
    return null
  }
}

function loadMemory(): QaFixtureMemory {
  if (memory) return memory
  memory = { cooperatives: new Set(), emails: new Set(), names: new Set() }
  try {
    const raw = browserStorage()?.getItem(memoryStorageKey)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<
        Record<keyof QaFixtureMemory, string[]>
      >
      for (const key of ["cooperatives", "emails", "names"] as const) {
        for (const value of parsed[key] ?? []) memory[key].add(value)
      }
    }
  } catch {
    // Storage can be blocked or corrupt; memory still works for this session.
  }
  return memory
}

function remember(kind: keyof QaFixtureMemory, value: string) {
  const current = loadMemory()
  current[kind].add(value)
  try {
    const storage = browserStorage()
    if (!storage) return
    const snapshot = Object.fromEntries(
      (Object.keys(current) as (keyof QaFixtureMemory)[]).map((key) => [
        key,
        [...current[key]].slice(-memoryLimit),
      ])
    )
    storage.setItem(memoryStorageKey, JSON.stringify(snapshot))
  } catch {
    // Ignore quota or privacy-mode failures.
  }
}

/** Test helper: forget every remembered name, email and cooperative. */
export function resetQaFixtureMemory() {
  memory = { cooperatives: new Set(), emails: new Set(), names: new Set() }
  try {
    browserStorage()?.removeItem(memoryStorageKey)
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// People and emails

function normalizeDomain(value: string | null | undefined) {
  const domain = (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/\.$/, "")
  return domain || "example.test"
}

function emailPart(value: string) {
  return value.toLowerCase().replace(/[^a-z]/g, "")
}

/**
 * Candidate local parts built only from the name. A middle (father's) name
 * gives the three-part forms first because they are far less likely to exist
 * already; the short forms follow.
 */
export function qaEmailLocalPartsForName(name: {
  firstName: string
  lastName: string
  middleName?: string | null
}) {
  const first = emailPart(name.firstName)
  const last = emailPart(name.lastName)
  const middle = name.middleName ? emailPart(name.middleName) : ""
  const parts = middle
    ? [
        `${first}.${middle}.${last}`,
        `${first}${middle}.${last}`,
        `${first}.${middle}${last}`,
        `${first}.${last}`,
        `${first}${last}`,
        `${last}.${first}`,
      ]
    : [
        `${first}.${last}`,
        `${first}${last}`,
        `${last}.${first}`,
        `${first}.${last[0]}`,
      ]
  return [...new Set(parts.filter(Boolean))]
}

export type QaGender = "female" | "male"

export type QaPerson = {
  email: string
  firstName: string
  fullName: string
  gender: QaGender
  lastName: string
  middleName: string | null
  phoneNumber: string
}

function pickName(gender: QaGender, includeMiddleName: boolean) {
  const firstName = pickQaValue(
    gender === "female" ? qaFemaleGivenNames : qaMaleGivenNames
  )
  // Hausa naming commonly carries the father's name in the middle.
  let middleName: string | null = includeMiddleName
    ? pickQaValue(qaMaleGivenNames)
    : null
  let lastName: string = pickQaValue(qaSurnames)
  for (
    let attempt = 0;
    attempt < 6 && (lastName === firstName || lastName === middleName);
    attempt += 1
  ) {
    lastName = pickQaValue(qaSurnames)
  }
  if (middleName === firstName || middleName === lastName) middleName = null
  return { firstName, lastName, middleName }
}

/**
 * A unique synthetic person whose email is made only from their name on the
 * given QA domain. Unique across calls in this runtime and, on the web,
 * across page loads.
 */
export function createQaPerson(options?: {
  emailDomain?: string | null
  gender?: QaGender
  /** Probability (0-1) of a middle name. Defaults to 0.65. */
  middleNameRate?: number
}): QaPerson {
  const domain = normalizeDomain(options?.emailDomain)
  const used = loadMemory()
  const middleNameRate = options?.middleNameRate ?? 0.65

  for (let attempt = 0; attempt < 400; attempt += 1) {
    const gender: QaGender =
      options?.gender ?? (randomIndex(2) === 0 ? "female" : "male")
    const includeMiddle =
      attempt > 200 || randomIndex(1000) < middleNameRate * 1000
    const name = pickName(gender, includeMiddle)
    const fullName = [name.firstName, name.middleName, name.lastName]
      .filter(Boolean)
      .join(" ")
    if (used.names.has(fullName)) continue
    const localPart = qaEmailLocalPartsForName(name).find(
      (candidate) => !used.emails.has(`${candidate}@${domain}`)
    )
    if (!localPart) continue
    const email = `${localPart}@${domain}`
    remember("names", fullName)
    remember("emails", email)
    return {
      ...name,
      email,
      fullName,
      gender,
      phoneNumber: createQaPhoneNumber(),
    }
  }

  // Practically unreachable: add a readable place word, never a number.
  const name = pickName(options?.gender ?? "female", true)
  const fullName = [name.firstName, name.middleName, name.lastName]
    .filter(Boolean)
    .join(" ")
  const base = qaEmailLocalPartsForName(name)[0]!
  let email = `${base}@${domain}`
  for (const word of shuffle(qaEmailFallbackWords)) {
    email = `${base}.${word}@${domain}`
    if (!used.emails.has(email)) break
  }
  remember("names", fullName)
  remember("emails", email)
  return {
    ...name,
    email,
    fullName,
    gender: options?.gender ?? "female",
    phoneNumber: createQaPhoneNumber(),
  }
}

/** An email for an existing name (for forms where the name is already set). */
export function createQaEmailForName(
  fullName: string,
  emailDomain?: string | null
) {
  const domain = normalizeDomain(emailDomain)
  const words = fullName.split(/\s+/).map(emailPart).filter(Boolean)
  if (words.length === 0) return createQaPerson({ emailDomain }).email
  const firstName = words[0]!
  const lastName = words.length > 1 ? words[words.length - 1]! : firstName
  const middleName = words.length > 2 ? words[1]! : null
  const used = loadMemory()
  const candidates =
    words.length > 1
      ? qaEmailLocalPartsForName({ firstName, lastName, middleName })
      : [firstName]
  let email = candidates
    .map((part) => `${part}@${domain}`)
    .find((value) => !used.emails.has(value))
  if (!email) {
    for (const word of shuffle(qaEmailFallbackWords)) {
      const candidate = `${candidates[0]}.${word}@${domain}`
      if (!used.emails.has(candidate)) {
        email = candidate
        break
      }
    }
  }
  email ??= `${candidates[0]}.${pickQaValue(qaEmailFallbackWords)}@${domain}`
  remember("emails", email)
  return email
}

/** An email for an organisation name, e.g. barakah.traders@domain. */
export function createQaEmailForOrganisation(
  name: string,
  emailDomain?: string | null
) {
  const domain = normalizeDomain(emailDomain)
  const words = name
    .split(/\s+/)
    .map(emailPart)
    .filter(
      (word) =>
        word &&
        !["cooperative", "society", "multipurpose", "the", "of"].includes(word)
    )
  const used = loadMemory()
  const candidates = [
    words.slice(0, 2).join("."),
    words.slice(0, 3).join("."),
    words.join("."),
  ]
    .filter(Boolean)
    .map((part) => `${part}@${domain}`)
  const email =
    candidates.find((value) => !used.emails.has(value)) ?? candidates.at(-1)!
  remember("emails", email)
  return email
}

// ---------------------------------------------------------------------------
// Numbers, references and places

/** A unique Nigerian mobile number, e.g. +2348031234567 (or 08031234567). */
export function createQaPhoneNumber(options?: {
  format?: "international" | "local"
}) {
  const subscriber = uniqueSevenDigits()
  const prefix = pickQaValue(qaPhonePrefixes)
  return options?.format === "local"
    ? `0${prefix}${subscriber}`
    : `+234${prefix}${subscriber}`
}

function base36Tick(length: number) {
  return nextTick()
    .toString(36)
    .toUpperCase()
    .slice(-length)
    .padStart(length, "0")
}

function compactDate(date = new Date()) {
  return date.toISOString().slice(0, 10).replaceAll("-", "")
}

/** A unique, readable reference such as TRX-20261113-KX7Q2A. */
export function createQaReference(prefix = "QA") {
  return `${prefix.toUpperCase()}-${compactDate()}-${base36Tick(6)}`
}

/** A short unique code such as LEVY-KX7Q2A (letters and digits). */
export function createQaCode(prefix: string, maxLength = 20) {
  const value = `${prefix.toUpperCase()}-${base36Tick(6)}`
  return value.slice(0, maxLength)
}

/** A unique digit string (6 digits by default), e.g. for member numbers. */
export function createQaDigits(length = 6) {
  const digits = uniqueSevenDigits()
  return digits.slice(-Math.min(Math.max(length, 4), 7))
}

/** A random upper-case letter code (24^length values), e.g. a code prefix. */
export function createQaLetters(length = 5) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ"
  let value = ""
  for (let index = 0; index < length; index += 1) {
    value += alphabet[randomIndex(alphabet.length)]
  }
  return value
}

export function createQaLocation() {
  return pickQaValue(qaLocations)
}

export function createQaAddress(location = createQaLocation()) {
  const number = 2 + randomIndex(180)
  return `${number} ${pickQaValue(qaStreets)}, ${location.city}, ${location.state} State`
}

export function createQaOccupation() {
  return pickQaValue(qaOccupations)
}

function slugify(value: string, maxLength = 48) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "")
}

export type QaCooperative = {
  city: string
  codePrefix: string
  email: string
  name: string
  officeAddress: string
  slug: string
  state: string
}

/**
 * A unique cooperative such as "Kano Barakah Traders Cooperative Society",
 * with a matching slug and a name-based contact email.
 */
export function createQaCooperative(options?: {
  emailDomain?: string | null
}): QaCooperative {
  const used = loadMemory()
  let name = ""
  let location = createQaLocation()
  for (let attempt = 0; attempt < 200; attempt += 1) {
    location = createQaLocation()
    const place = location.city.split(" ")[0]!
    name = `${place} ${pickQaValue(qaCooperativeQualifiers)} ${pickQaValue(qaCooperativeGroups)} ${pickQaValue(qaCooperativeSuffixes)}`
    if (!used.cooperatives.has(name)) break
  }
  remember("cooperatives", name)
  const slug = slugify(
    name.replace(/\b(Cooperative|Society|Multipurpose)\b/g, "")
  )
  const codePrefix = createQaLetters(5)
  return {
    city: location.city,
    codePrefix,
    email: createQaEmailForOrganisation(name, options?.emailDomain),
    name,
    officeAddress: createQaAddress(location),
    slug,
    state: location.state,
  }
}

// ---------------------------------------------------------------------------
// Dates and amounts

export function qaToday() {
  return new Date().toISOString().slice(0, 10)
}

export function qaDateOffset(days: number) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function qaMonthLabel(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(date)
}

/** A whole-naira amount between min and max, rounded to `step`. */
export function createQaAmount(min = 5_000, max = 50_000, step = 500) {
  const steps = Math.max(0, Math.floor((max - min) / step))
  return String(min + randomIndex(steps + 1) * step)
}
