import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../generated/prisma/client"

const globalForPrisma = globalThis as typeof globalThis & {
  __halaalVestPrisma?: PrismaClient
}

export function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    return null
  }

  if (!globalForPrisma.__halaalVestPrisma) {
    globalForPrisma.__halaalVestPrisma = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
      }),
    })
  }

  return globalForPrisma.__halaalVestPrisma
}
