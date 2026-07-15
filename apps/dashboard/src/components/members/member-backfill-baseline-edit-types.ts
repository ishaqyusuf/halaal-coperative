export type MemberBackfillBaselineMember = {
  address: string | null
  deductionSourceId: string | null
  email: string | null
  fullName: string
  id: string
  memberType: "individual" | "civil_servant" | "business"
  occupation: string | null
  phoneNumber: string | null
}
