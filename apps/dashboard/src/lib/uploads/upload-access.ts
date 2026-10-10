type UploadAccessContext = {
  tenant: { id: string } | null
  auth: {
    user: { id: string } | null
    membership: { tenantId: string; userId: string } | null
  }
}

export function hasActiveUploadMembership(context: UploadAccessContext) {
  return Boolean(
    context.tenant && context.auth.user && context.auth.membership &&
    context.auth.membership.tenantId === context.tenant.id &&
    context.auth.membership.userId === context.auth.user.id
  )
}
