import { randomBytes, scryptSync } from "node:crypto"

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
