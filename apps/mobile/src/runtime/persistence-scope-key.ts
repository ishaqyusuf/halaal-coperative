export type MobilePersistenceIdentity = {
  activeMembershipId: string
  cooperativeRole?: string
  role: string
  tenant: { id: string }
  user: { id: string }
}

export type MobilePersistenceScope = {
  key: string
  membershipId: string
  role: string
  tenantId: string
  userId: string
}

export function createMobilePersistenceScope(
  profile: MobilePersistenceIdentity
): MobilePersistenceScope {
  const scope = {
    membershipId: profile.activeMembershipId,
    role: profile.cooperativeRole ?? profile.role,
    tenantId: profile.tenant.id,
    userId: profile.user.id,
  }

  return {
    ...scope,
    key: [scope.tenantId, scope.userId, scope.membershipId, scope.role].join(
      ":"
    ),
  }
}
