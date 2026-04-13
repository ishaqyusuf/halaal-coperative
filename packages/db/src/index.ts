export interface TenantRecord {
  id: string
  name: string
  region: string
  memberCount: number
}

export interface MemberRecord {
  id: string
  tenantId: string
  fullName: string
  memberType: "civil-servant" | "individual" | "business"
  monthlyContribution: number
}

const seedTenants: TenantRecord[] = [
  {
    id: "tenant-amanah-demo",
    name: "Amanah Staff Thrift Cooperative",
    region: "Lagos",
    memberCount: 428,
  },
]

export function listSeedTenants() {
  return seedTenants
}
