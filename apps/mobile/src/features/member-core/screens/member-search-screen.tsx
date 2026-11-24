import { AppList } from "@/components/app/app-list"
import { EmptyState } from "@/components/app/empty-state"
import { RecordRow } from "@/components/ui/list-card"
import { AssistantAskRow } from "@/features/assistant/public/assistant-ask-row"
import { useRouter } from "expo-router"
import { useMemo, useState } from "react"
import { View } from "react-native"
import {
  filterMemberSearchDestinations,
  type MemberSearchDestination,
} from "../model/member-search"

/**
 * Member search (T31, workshop 31-home-ask · 04): pushed from the hero
 * search button with the field focused. It matches the member's screens and
 * services as they type and hands anything else to the assistant.
 */
export function MemberSearchScreen({
  destinations,
}: {
  destinations: MemberSearchDestination[]
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const results = useMemo(
    () => filterMemberSearchDestinations(destinations, query),
    [destinations, query]
  )
  const asking = query.trim()

  return (
    <AppList
      data={results}
      empty={
        <View className="gap-[12px] px-[18px]">
          <EmptyState
            description="No screens match. The assistant can still help."
            icon="Search"
            title="Nothing found"
          />
        </View>
      }
      // Re-render rows when filtering changes their group position (corners).
      extraData={results.length}
      keyExtractor={(item) => item.key}
      listFooter={
        asking ? (
          <View className="px-[18px] pt-[12px]">
            <AssistantAskRow question={asking} />
          </View>
        ) : null
      }
      renderItem={({ item, position }) => (
        <RecordRow
          accessibilityLabel={`${item.label}. ${item.meta}`}
          avatarIcon={item.icon}
          chevron
          meta={item.meta}
          onPress={() => router.push(item.href)}
          position={position}
          testID={`member-search-${item.key}`}
          title={item.label}
        />
      )}
      search={{
        accessibilityLabel: "Search screens and services",
        alwaysShow: true,
        autoFocus: true,
        localSearch: true,
        onChangeText: setQuery,
        placeholder: "Search screens and services",
        totalCount: destinations.length,
        value: query,
      }}
      testID="member-search"
      title="Search"
    />
  )
}
