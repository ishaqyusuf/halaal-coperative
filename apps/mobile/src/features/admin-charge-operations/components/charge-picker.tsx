import { AppList } from "@/components/app/app-list"
import { EmptyState } from "@/components/app/empty-state"
import { ScreenHeaderButton } from "@/components/app/screen-shell"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { RecordRow } from "@/components/ui/list-card"
import { Text } from "@/components/ui/text"
import { appQueryKey, useAppInfiniteQuery } from "@/hooks/use-app-query"
import { useDebounce } from "@/hooks/use-debounce"
import { useEffect, useState } from "react"
import { BackHandler, Keyboard, View } from "react-native"
import {
  getChargeMembers,
  getChargeRulesForApply,
} from "../api/admin-charge-operations-api"
import type {
  ChargeMemberOption,
  ChargePage,
  ChargeRuleOption,
} from "../model/admin-charge-operations-types"
import { chargeMoney, collectionLabel } from "../model/charge-display"

import { ChargeRuleTile } from "./charge-status"

type ChargeOption = ChargeMemberOption | ChargeRuleOption

export function ChargePicker({
  assessedAt,
  currencyCode,
  onClose,
  onPick,
  selectedId,
  type,
}: {
  assessedAt: string
  currencyCode: string
  onClose: () => void
  onPick: (value: ChargeOption) => void
  selectedId?: string
  type: "member" | "rule"
}) {
  const [search, setSearch] = useState("")
  const debounced = useDebounce(search.trim(), 350)
  const member = type === "member"
  const title = member ? "Choose member" : "Choose charge"
  const page = useAppInfiniteQuery<
    ChargePage<ChargeOption>,
    ChargeOption,
    Error,
    ReturnType<typeof appQueryKey>,
    string | null
  >({
    initialPageParam: null as string | null,
    getNextPageParam: (result) => result.nextCursor ?? undefined,
    placeholderData: undefined,
    queryFn: async ({ pageParam }): Promise<ChargePage<ChargeOption>> => {
      const input = { cursor: pageParam, search: debounced || undefined }
      return member
        ? getChargeMembers(input)
        : getChargeRulesForApply({ ...input, assessedAt })
    },
    queryKey: appQueryKey(
      "admin-charges",
      type,
      debounced,
      member ? null : assessedAt
    ),
    selectItems: (result) => result.data,
  })

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        onClose()
        return true
      }
    )
    return () => subscription.remove()
  }, [onClose])

  return (
    <View
      accessibilityViewIsModal
      className="absolute inset-0 z-[5] bg-background"
    >
      <AppList
        back={false}
        data={page.items}
        empty={
          <EmptyState
            icon="Search"
            title={member ? "No member found" : "No applicable charge found"}
            description={
              member
                ? "Try another name or member number."
                : "Try another name, code or assessment date."
            }
          />
        }
        error={page.isError ? "Check your connection and try again." : null}
        fixedHeader={
          <View className="h-[56px] flex-row items-center gap-[8px] px-[14px]">
            <ScreenHeaderButton
              accessibilityLabel={`Close ${title.toLowerCase()}`}
              icon="X"
              onPress={onClose}
            />
            <Text
              accessibilityRole="header"
              className="flex-1 text-center"
              variant="section"
            >
              {title}
            </Text>
            <View className="w-[44px]" />
          </View>
        }
        header={
          <Input
            accessibilityLabel={member ? "Search member" : "Search charge"}
            autoCorrect={false}
            leading={
              <Icon className="size-base text-muted-foreground" name="Search" />
            }
            maxLength={120}
            onChangeText={setSearch}
            placeholder={
              member ? "Search name or member number" : "Search charge or code"
            }
            returnKeyType="search"
            testID="charge-picker-search"
            value={search}
          />
        }
        isFetchingNextPage={page.isFetchingNextPage}
        isLoading={page.isPending}
        keyExtractor={(item) => item.id}
        onEndReached={page.onEndReached}
        onRetry={() => {
          void page.refetch()
        }}
        renderItem={({ item, position }) => {
          const option = "fullName" in item
          return (
            <RecordRow
              amount={
                !option && selectedId !== item.id
                  ? item.chargeValueType === "percentage"
                    ? `${item.rate}%`
                    : chargeMoney(item.rate, currencyCode)
                  : undefined
              }
              leading={
                !option ? (
                  <ChargeRuleTile
                    percentage={item.chargeValueType === "percentage"}
                  />
                ) : undefined
              }
              meta={
                option
                  ? item.memberNumber
                  : `${item.code} · ${collectionLabel(item.collectionMode)}`
              }
              onPress={() => {
                Keyboard.dismiss()
                onPick(item)
              }}
              position={position}
              testID={`charge-${option ? "member" : "definition"}-option-${item.id}`}
              title={option ? item.fullName : item.name}
              trailing={
                selectedId === item.id ? (
                  <Icon className="size-base text-primary" name="CircleCheck" />
                ) : undefined
              }
            />
          )
        }}
      />
    </View>
  )
}
