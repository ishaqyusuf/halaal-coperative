import { beforeEach, describe, expect, test } from "bun:test"
import {
  createQaCooperative,
  createQaEmailForName,
  createQaPerson,
  createQaPhoneNumber,
  createQaReference,
  createQaCode,
  createQaDigits,
  qaFemaleGivenNames,
  qaMaleGivenNames,
  qaSurnames,
  resetQaFixtureMemory,
} from "./qa-fixtures"

// Common Christian and default English (faker) names that must never appear.
const forbiddenNames = [
  "john",
  "mary",
  "peter",
  "paul",
  "james",
  "joseph",
  "david",
  "daniel",
  "michael",
  "elizabeth",
  "esther",
  "ruth",
  "sarah",
  "rebecca",
  "deborah",
  "grace",
  "joy",
  "faith",
  "blessing",
  "mercy",
  "emmanuel",
  "samuel",
  "stephen",
  "matthew",
  "mark",
  "luke",
  "christopher",
  "christian",
  "christiana",
  "christina",
  "victoria",
  "williams",
  "johnson",
  "okafor",
  "chidi",
  "chinedu",
  "nwosu",
  "eze",
  "ada",
  "femi",
  "bola",
  "ese",
  "damilola",
  "joshua",
  "gabriel",
  "anthony",
  "patrick",
  "precious",
  "favour",
  "charity",
  "patience",
  "comfort",
  "jennifer",
  "jessica",
  "smith",
  "brown",
  "jones",
  "thomas",
  "robert",
  "george",
  "andrew",
]

beforeEach(() => resetQaFixtureMemory())

describe("Quick Fill name pools", () => {
  test("contain no Christian or default English names", () => {
    const pool = [
      ...qaFemaleGivenNames,
      ...qaMaleGivenNames,
      ...qaSurnames,
    ].map((name) => name.toLowerCase())
    for (const name of forbiddenNames) expect(pool).not.toContain(name)
  })

  test("generated people use only the curated pools", () => {
    const given = new Set<string>([...qaFemaleGivenNames, ...qaMaleGivenNames])
    const surnames = new Set<string>(qaSurnames)
    for (let index = 0; index < 300; index += 1) {
      const person = createQaPerson({ emailDomain: "ishaq.qa.test" })
      expect(given.has(person.firstName)).toBe(true)
      expect(surnames.has(person.lastName)).toBe(true)
      if (person.middleName) expect(given.has(person.middleName)).toBe(true)
      for (const word of person.fullName.toLowerCase().split(" ")) {
        expect(forbiddenNames).not.toContain(word)
      }
    }
  })
})

describe("createQaPerson", () => {
  test("never repeats a name or email across 1,000 fills", () => {
    const names = new Set<string>()
    const emails = new Set<string>()
    for (let index = 0; index < 1000; index += 1) {
      const person = createQaPerson({ emailDomain: "ishaq.qa.test" })
      expect(names.has(person.fullName)).toBe(false)
      expect(emails.has(person.email)).toBe(false)
      names.add(person.fullName)
      emails.add(person.email)
    }
  })

  test("builds the email only from the person's own name parts", () => {
    for (let index = 0; index < 500; index += 1) {
      const person = createQaPerson({ emailDomain: "mubarak.qa.test" })
      const [localPart, domain] = person.email.split("@")
      expect(domain).toBe("mubarak.qa.test")
      expect(localPart).toMatch(/^[a-z]+(\.[a-z]+)*$/)
      expect(localPart).not.toMatch(/\d/)
      const nameParts = [person.firstName, person.middleName, person.lastName]
        .filter((part): part is string => Boolean(part))
        .map((part) => part.toLowerCase())
      // Every letter run in the local part is a name (or an initial of one).
      const remaining = localPart!.replaceAll(".", "")
      const pattern = new RegExp(
        `^(${nameParts.join("|")}|${nameParts.map((part) => part[0]).join("|")})+$`
      )
      expect(remaining).toMatch(pattern)
    }
  })

  test("uses the given QA domain and falls back to example.test", () => {
    expect(createQaPerson({ emailDomain: "@Ishaq.QA.test." }).email).toEndWith(
      "@ishaq.qa.test"
    )
    expect(createQaPerson().email).toEndWith("@example.test")
  })

  test("adds a readable word, never digits, when a name's emails are used", () => {
    const emails = Array.from({ length: 12 }, () =>
      createQaEmailForName("Aisha Bello", "ishaq.qa.test")
    )
    expect(new Set(emails).size).toBe(emails.length)
    for (const email of emails) {
      expect(email.split("@")[0]).not.toMatch(/\d/)
      expect(email).toMatch(/^(aisha|bello)/)
    }
  })

  test("gives a valid Nigerian mobile number", () => {
    expect(createQaPerson().phoneNumber).toMatch(/^\+234[789]\d{9}$/)
  })
})

describe("unique codes", () => {
  test("phones, references, codes and digits never repeat in a burst", () => {
    const phones = new Set<string>()
    const references = new Set<string>()
    const codes = new Set<string>()
    const digits = new Set<string>()
    for (let index = 0; index < 200; index += 1) {
      phones.add(createQaPhoneNumber().slice(-7))
      references.add(createQaReference("TRX"))
      codes.add(createQaCode("LEVY"))
      digits.add(createQaDigits(6))
    }
    expect(phones.size).toBe(200)
    expect(references.size).toBe(200)
    expect(codes.size).toBe(200)
    expect(digits.size).toBe(200)
  })

  test("local phone format is 11 digits", () => {
    expect(createQaPhoneNumber({ format: "local" })).toMatch(/^0[789]\d{9}$/)
  })

  test("reference is readable and dated", () => {
    expect(createQaReference("trx")).toMatch(/^TRX-\d{8}-[0-9A-Z]{6}$/)
  })
})

describe("createQaCooperative", () => {
  test("is unique, halal-themed and has a name-based email", () => {
    const names = new Set<string>()
    for (let index = 0; index < 300; index += 1) {
      const cooperative = createQaCooperative({ emailDomain: "ishaq.qa.test" })
      expect(names.has(cooperative.name)).toBe(false)
      names.add(cooperative.name)
      expect(cooperative.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      expect(cooperative.codePrefix).toMatch(/^[A-Z]{5}$/)
      expect(cooperative.email).toEndWith("@ishaq.qa.test")
      expect(cooperative.email.split("@")[0]).not.toMatch(/\d/)
    }
  })
})
