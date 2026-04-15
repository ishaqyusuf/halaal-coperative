import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto"

const keyLength = 64

export function hashPassword(password: string) {
  const normalized = password.trim()

  if (!normalized) {
    throw new Error("Password is required.")
  }

  const salt = randomBytes(16).toString("hex")
  const hash = scryptSync(normalized, salt, keyLength).toString("hex")

  return `${salt}:${hash}`
}

export function verifyPassword(password: string, storedHash: string | null | undefined) {
  if (!storedHash) {
    return false
  }

  const [salt, hash] = storedHash.split(":")

  if (!salt || !hash) {
    return false
  }

  const derived = scryptSync(password.trim(), salt, keyLength)
  const expected = Buffer.from(hash, "hex")

  return derived.length === expected.length && timingSafeEqual(derived, expected)
}
