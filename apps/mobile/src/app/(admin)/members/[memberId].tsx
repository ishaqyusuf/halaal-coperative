import { AdminMemberDetailScreen } from "@/screens/admin-member-detail-screen"
import { useLocalSearchParams } from "expo-router"

export default function AdminMemberDetailRoute() {
  const { memberId } = useLocalSearchParams<{ memberId?: string }>()

  return <AdminMemberDetailScreen memberId={memberId ?? ""} />
}
