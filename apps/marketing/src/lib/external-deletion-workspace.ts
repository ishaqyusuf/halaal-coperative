export const externalDeletionWorkspacePattern =
  /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/

export function normalizeExternalDeletionWorkspace(value: string) {
  return value.trim().toLowerCase()
}
