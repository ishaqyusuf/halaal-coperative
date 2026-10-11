import { mock } from "bun:test"
import assert from "node:assert/strict"
let stored: string | null = null
mock.module("expo-secure-store", () => ({
  getItemAsync: async () => stored,
  setItemAsync: async (_key: string, value: string) => {
    stored = value
  },
  deleteItemAsync: async () => {
    stored = null
  },
}))
const store = await import("../mobile-qa-authorization-store")
const authorization = {
  authorizationToken: "synthetic-token",
  qaDomain: "safa.qa.test",
  expiresAt: new Date(Date.now() + 60000).toISOString(),
}
await store.saveMobileQaAuthorization(authorization)
assert.deepEqual(await store.loadMobileQaAuthorization(), authorization)
assert.deepEqual(await store.loadMobileQaAuthorization(), authorization)
for (const value of [
  "{",
  "null",
  "{}",
  JSON.stringify({ ...authorization, expiresAt: "invalid" }),
  JSON.stringify({ ...authorization, expiresAt: "2020-01-01" }),
]) {
  stored = value
  assert.equal(await store.loadMobileQaAuthorization(), null)
  assert.equal(stored, null)
}
console.log("QA secure authorization persistence and expiry: passed")
