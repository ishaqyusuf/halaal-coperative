export function canStartMemberProcurementRequest({
  canCreateRequest,
  isOffline,
  isStale,
}: {
  canCreateRequest: boolean
  isOffline: boolean
  isStale: boolean
}) {
  return canCreateRequest && !isOffline && !isStale
}

export async function runOfflineSafeProcurementRecovery({
  isQaOffline,
  retry,
}: {
  isQaOffline: boolean
  retry: () => Promise<void>
}) {
  if (isQaOffline) return
  await retry()
}
