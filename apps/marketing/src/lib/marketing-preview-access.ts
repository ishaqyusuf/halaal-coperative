import { timingSafeEqual } from "node:crypto"

export function canAccessMarketingPreview({
  configuredToken,
  isProduction,
  providedToken,
}: {
  configuredToken: string | undefined
  isProduction: boolean
  providedToken: string | undefined
}): boolean {
  if (!isProduction) {
    return true
  }

  if (!configuredToken || !providedToken) {
    return false
  }

  const configuredBuffer = Buffer.from(configuredToken)
  const providedBuffer = Buffer.from(providedToken)

  return (
    configuredBuffer.length === providedBuffer.length &&
    timingSafeEqual(configuredBuffer, providedBuffer)
  )
}
