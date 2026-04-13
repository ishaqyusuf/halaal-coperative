import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "./generated/prisma/client.js"

declare global {
  var __amanahPrisma: PrismaClient | undefined
}

export function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    return null
  }

  if (!globalThis.__amanahPrisma) {
    globalThis.__amanahPrisma = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
      }),
    })
  }

  return globalThis.__amanahPrisma
}
