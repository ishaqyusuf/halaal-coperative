import { createPrismaClient } from "@halaalvest/db"
import {
  AppUpdateConflict,
  getMobileBuild,
  publishMobileBuild,
  withdrawMobileBuild,
} from "@halaalvest/db/app-update"
import { HTTPException } from "hono/http-exception"
import type { AppUpdateDependencies } from "./routes"

async function conflicts<T>(operation: () => Promise<T>) {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof AppUpdateConflict)
      throw new HTTPException(409, { message: error.message })
    throw error
  }
}
export const appUpdateDependencies: AppUpdateDependencies = {
  token: () => process.env.APP_UPDATE_PUBLISH_TOKEN,
  backend: () =>
    process.env.VERCEL_ENV === "production" ||
    process.env.HALAALVEST_ENV === "production" ||
    process.env.DEPLOYMENT_ENVIRONMENT === "production"
      ? undefined
      : process.env.APP_UPDATE_BACKEND,
  read: () => getMobileBuild(database()),
  publish: (build, revision) =>
    conflicts(() => publishMobileBuild(database(), build, revision)),
  withdraw: (revision) =>
    conflicts(() => withdrawMobileBuild(database(), revision)),
}

function database() {
  const db = createPrismaClient()
  if (!db)
    throw new HTTPException(503, { message: "Build registry unavailable" })
  return db
}
