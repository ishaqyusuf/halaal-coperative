import {
  createSignedSessionToken,
  platformSessionScope,
} from "@halaalvest/auth"
import { findProductionQaHarnessOperatorId } from "@halaalvest/db"

import { buildRequestContext } from "../context"
import { createCallerFactory } from "../lib.trpc"
import { appRouter } from "../routers/_app"

const createCaller = createCallerFactory(appRouter)

function platformOwnerHeaders(authorization: string) {
  return new Headers({
    authorization: `Bearer ${authorization}`,
    host: "api.halaalvest.localhost",
  })
}

export type ProductionQaTesterCredentialCleanup = {
  testerCredentialRevoked: boolean
}

export async function runWithProductionQaTesterCredential<T>(input: {
  execute: (context: { credential: string }) => Promise<T>
  qaDomain: string
  testerLabel: string
}): Promise<{
  cleanup: ProductionQaTesterCredentialCleanup
  result: T
}> {
  const operatorId = await findProductionQaHarnessOperatorId()
  const operatorToken = await createSignedSessionToken({
    scope: platformSessionScope,
    userId: operatorId,
  })
  const operatorCaller = createCaller(
    await buildRequestContext(platformOwnerHeaders(operatorToken))
  )
  const cleanup: ProductionQaTesterCredentialCleanup = {
    testerCredentialRevoked: false,
  }
  let credentialId: string | null = null

  try {
    const issued = await operatorCaller.qaAccelerator.issueCredential({
      expiresInHours: 1,
      qaDomain: input.qaDomain,
      testerLabel: input.testerLabel,
    })
    credentialId = issued.credentialId

    return {
      cleanup,
      result: await input.execute({ credential: issued.credential }),
    }
  } finally {
    if (credentialId) {
      try {
        await operatorCaller.qaAccelerator.revokeCredential({ credentialId })
        cleanup.testerCredentialRevoked = true
      } catch {
        cleanup.testerCredentialRevoked = false
      }
    }
  }
}
