import type { AdminAccess } from "@/features/admin-reports-access/public/admin-access-types"
import { WorkspaceAccessRow } from "@/features/settings-access/components/workspace-access-row"
import {
  buildWorkspaceAccessItems,
  type WorkspaceAccessItem,
} from "@/features/settings-access/presentation/workspace-access-list"
import { LegendList, type LegendListRef } from "@legendapp/list"
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  type ReactNode,
} from "react"
import { ScrollView, View } from "react-native"

export type MoreContentListHandle = {
  scrollTo: (options: { y: number; animated: boolean }) => void
}

const keyExtractor = (item: WorkspaceAccessItem) => item.id
const getItemType = (item: WorkspaceAccessItem) => item.type

/** The access directory and the surrounding More content share one scroll owner. */
export const MoreContentList = forwardRef<MoreContentListHandle, {
  access: AdminAccess | null
  children: ReactNode
  footer: ReactNode
  onOpenDeviceAccess: (userId: string) => void
}>(function MoreContentList({ access, children, footer, onOpenDeviceAccess }, ref) {
  const listRef = useRef<LegendListRef>(null)
  const scrollRef = useRef<ScrollView>(null)
  const data = useMemo(() => buildWorkspaceAccessItems(access), [access])
  useImperativeHandle(
    ref,
    () => ({
      scrollTo: ({ y, animated }) => {
        if (access) listRef.current?.scrollToOffset({ offset: y, animated })
        else scrollRef.current?.scrollTo({ y, animated })
      },
    }),
    [access]
  )
  const renderItem = useCallback(
    ({ item }: { item: WorkspaceAccessItem }) => (
      <View className="px-5">
        <WorkspaceAccessRow
          item={item}
          onOpenDeviceAccess={onOpenDeviceAccess}
        />
      </View>
    ),
    [onOpenDeviceAccess]
  )

  if (!access) {
    return (
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>
        <View className="gap-6 px-5 pt-5">{children}</View>
        <View className="gap-6 px-5 pb-8 pt-6">{footer}</View>
      </ScrollView>
    )
  }
  return (
    <LegendList
      data={data}
      estimatedItemSize={112}
      getItemType={getItemType}
      keyExtractor={keyExtractor}
      ListHeaderComponent={<View className="gap-6 px-5 pt-5">{children}</View>}
      ListFooterComponent={<View className="gap-6 px-5 pb-8 pt-6">{footer}</View>}
      recycleItems
      ref={listRef}
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
    />
  )
})
