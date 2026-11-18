import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import { useAuthContext } from "@/hooks/use-auth"
import {
  appQueryKey,
  useAppInfiniteQuery,
  useAppQuery,
} from "@/hooks/use-app-query"
import { useMobileFormDraft } from "@/hooks/use-mobile-form-draft"
import { useIsOnline } from "@/lib/online-status"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { getMobilePersistenceScope } from "@/runtime/persistence-scope"
import { useFocusEffect, useIsFocused } from "@react-navigation/native"
import {
  type InfiniteData,
  type QueryKey,
  useQueryClient,
} from "@tanstack/react-query"
import { getNotificationEntityIdParam } from "@/features/notifications/public/notification-destination-param"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { BackHandler, Keyboard } from "react-native"
import {
  createMemberSupportCase,
  getMemberSupport,
  getMemberSupportDetail,
  replyMemberSupportCase,
} from "../api/member-support-api"
import {
  emptySupportForm,
  hasSupportFormDraft,
  MemberSupportCreate,
  type SupportFormDraft,
} from "../components/member-support-create"
import { MemberSupportList } from "../screens/member-support-screen"
import {
  MemberSupportThread,
  type PendingSupportReply,
} from "../components/member-support-thread"
import type {
  MobileMemberSupport,
  MobileSupportCase,
  MobileSupportCreateInput,
} from "../model/member-support-types"

type PersistedSupportDraft = SupportFormDraft & {
  replies?: Record<string, string>
  replyCaseId?: string | null
  replyMessage?: string
}

export function MemberSupportRouteController() {
  const { notificationEntityId } = useLocalSearchParams<{
    notificationEntityId?: string | string[]
  }>()
  const initialEntityId = getNotificationEntityIdParam(notificationEntityId)
  const { profile } = useAuthContext()
  const scope = getMobilePersistenceScope()?.key ?? "signed-out"
  return (
    <SupportWorkspace
      initialEntityId={initialEntityId}
      key={scope}
      profile={profile}
      scope={scope}
    />
  )
}

function SupportWorkspace({
  initialEntityId,
  profile,
  scope,
}: {
  initialEntityId: string | null
  profile: ReturnType<typeof useAuthContext>["profile"]
  scope: string
}) {
  const router = useRouter()
  const isFocused = useIsFocused()
  const client = useQueryClient()
  const online = useIsOnline()
  const canUseSupport = canUseMobileFeatureData(profile, "member")
  const cooperative = profile?.tenant.name ?? "Your cooperative"
  const cooperativeShort = cooperative.replace(/\s+Cooperative$/i, "")
  const timezone = profile?.tenant.timezone ?? "Africa/Lagos"
  const [caseId, setCaseId] = useState(initialEntityId)
  const [lane, setLane] = useState<0 | 1>(0)
  const [form, setForm] = useState(emptySupportForm)
  const [creating, setCreating] = useState(false)
  const [replies, setReplies] = useState<Record<string, string>>({})
  const draftValue = useMemo(() => ({ ...form, replies }), [form, replies])
  const [pendingReplies, setPendingReplies] = useState<
    Record<string, PendingSupportReply>
  >({})
  const sending = useRef(new Set<string>())
  const lastDestination = useRef(initialEntityId)

  useEffect(() => {
    if (lastDestination.current === initialEntityId) return
    lastDestination.current = initialEntityId
    if (initialEntityId) setCaseId(initialEntityId)
  }, [initialEntityId])

  useMobileFormDraft<PersistedSupportDraft>({
    enabled: canUseSupport,
    key: "member.support.forms",
    onHydrate: (draft) => {
      const {
        category,
        description,
        moneyImpactRequested,
        subject,
        replies,
        replyCaseId,
        replyMessage,
      } = draft
      setForm({
        category:
          subject || description || moneyImpactRequested || replies
            ? category
            : null,
        description,
        moneyImpactRequested,
        subject,
      })
      setReplies(
        replies ??
          (replyCaseId && replyMessage ? { [replyCaseId]: replyMessage } : {})
      )
    },
    value: draftValue,
  })

  const listKey = appQueryKey("member.support.list", scope)
  const detailKeyFor = (id: string | null) =>
    appQueryKey("member.support.case", scope, id)
  const list = useAppInfiniteQuery<
    MobileMemberSupport,
    MobileSupportCase,
    Error,
    QueryKey,
    string | null
  >({
    enabled: canUseSupport,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    initialPageParam: null,
    networkMode: "offlineFirst",
    placeholderData: undefined,
    queryFn: ({ pageParam }) => getMemberSupport(pageParam),
    queryKey: listKey,
    selectItems: (page) => page.cases,
  })
  const detail = useAppQuery({
    enabled: canUseSupport && Boolean(caseId) && online,
    placeholderData: undefined,
    queryFn: () => getMemberSupportDetail(caseId!),
    queryKey: detailKeyFor(caseId),
  })
  const snapshot = list.data?.pages[0]
  const stale = isMobileReadCacheStale(snapshot?.cache)
  const cases = Array.from(
    new Map(list.items.map((item) => [item.id, item])).values()
  )
  const preview = cases.find((item) => item.id === caseId)
  const canCreate = snapshot?.state === "available" && snapshot.canCreateCase
  const draft = caseId ? (replies[caseId] ?? "") : ""
  const pending = caseId ? (pendingReplies[caseId] ?? null) : null

  const goBack = useCallback(() => {
    Keyboard.dismiss()
    if (caseId && !creating) {
      setCaseId(null)
    } else if (router.canGoBack()) {
      router.back()
    } else {
      router.replace("/(member)/(tabs)")
    }
  }, [caseId, creating, router])
  useFocusEffect(
    useCallback(() => {
      if (!caseId || creating) return
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          goBack()
          return true
        }
      )
      return () => subscription.remove()
    }, [caseId, creating, goBack])
  )

  async function applyCase(item: MobileSupportCase, created: boolean) {
    if (getMobilePersistenceScope()?.key !== scope) return
    const detailKey = detailKeyFor(item.id)
    await Promise.all([
      client.cancelQueries({ exact: true, queryKey: listKey }),
      client.cancelQueries({ exact: true, queryKey: detailKey }),
    ])
    if (getMobilePersistenceScope()?.key !== scope) return
    client.setQueryData(detailKey, item)
    client.setQueryData<InfiniteData<MobileMemberSupport, string | null>>(
      listKey,
      (current) => {
        if (!current?.pages.length) return current
        const alreadyListed = current.pages.some((page) =>
          page.cases.some((row) => row.id === item.id)
        )
        const addCounts = created && !alreadyListed ? 1 : 0
        const preview = {
          ...item,
          recentMessages: item.recentMessages.slice(-5),
        }
        return {
          ...current,
          pages: current.pages.map((page, index) => {
            const cases = page.cases.filter((row) => row.id !== item.id)
            if (index !== 0) return { ...page, cases }
            return {
              ...page,
              cases: [preview, ...cases],
              summary: {
                ...page.summary,
                openCases: page.summary.openCases + addCounts,
                totalCases: page.summary.totalCases + addCounts,
              },
            }
          }),
        }
      }
    )
    // Reconcile the list on its next regular refresh. Keep current page cursors
    // and use the mutation response for the open conversation immediately.
    void client.invalidateQueries({
      exact: true,
      queryKey: listKey,
      refetchType: "none",
    })
  }

  async function create(input: MobileSupportCreateInput) {
    const item = await createMemberSupportCase(input)
    await applyCase(item, true)
    setLane(0)
    return item
  }

  function updateReply(id: string, next: string) {
    setReplies((current) => {
      const replies = { ...current }
      if (next) replies[id] = next
      else delete replies[id]
      return replies
    })
  }

  function clearPending(id: string) {
    setPendingReplies((current) => {
      if (!current[id]) return current
      const next = { ...current }
      delete next[id]
      return next
    })
  }

  async function sendReply() {
    if (
      !caseId ||
      !online ||
      !detail.data ||
      detail.data.status === "closed" ||
      sending.current.has(caseId)
    )
      return
    const message = draft.trim()
    if (message.length < 2) return
    const id = caseId
    sending.current.add(id)
    const optimistic = {
      attachmentUrl: null,
      authorName: profile?.user.name ?? null,
      authorType: "member",
      createdAt: new Date().toISOString(),
      id: `pending-${id}`,
      message,
    }
    setPendingReplies((current) => ({
      ...current,
      [id]: { state: "sending", message: optimistic },
    }))
    try {
      const item = await replyMemberSupportCase({ message, supportCaseId: id })
      await applyCase(item, false)
      updateReply(id, "")
      clearPending(id)
    } catch (error) {
      setPendingReplies((current) => ({
        ...current,
        [id]: { state: "failed", message: optimistic },
      }))
      if ((error as { data?: { code?: string } }).data?.code === "CONFLICT") {
        void client.invalidateQueries({
          exact: true,
          queryKey: detailKeyFor(id),
        })
      }
    } finally {
      sending.current.delete(id)
    }
  }

  return (
    <>
      {caseId && canUseSupport ? (
        <MemberSupportThread
          back={goBack}
          canCreate={canCreate}
          cooperative={cooperative}
          cooperativeShort={cooperativeShort}
          create={() => setCreating(true)}
          draft={draft}
          editReply={(next) => {
            clearPending(caseId)
            updateReply(caseId, next)
          }}
          error={detail.isError}
          item={detail.data}
          key={caseId}
          loading={detail.isPending}
          online={online}
          pending={pending}
          preview={preview}
          refresh={() => void detail.refetch()}
          refreshing={detail.isRefetching}
          send={() => void sendReply()}
          timezone={timezone}
        />
      ) : (
        <MemberSupportList
          back={goBack}
          canUseSupport={canUseSupport}
          cases={cases}
          cooperative={cooperative}
          create={() => setCreating(true)}
          data={snapshot}
          draft={hasSupportFormDraft(form)}
          error={list.isError}
          hasNext={list.hasNextPage}
          lane={lane}
          loading={canUseSupport && list.isPending}
          next={list.onEndReached}
          online={online}
          open={setCaseId}
          paging={list.isFetchingNextPage}
          refresh={() => void list.refetch()}
          refreshing={list.isRefetching}
          setLane={setLane}
          stale={stale}
          timezone={timezone}
        />
      )}
      <MemberSupportCreate
        change={setForm}
        close={() => setCreating(false)}
        cooperative={cooperative}
        create={create}
        form={form}
        online={online}
        viewCase={(id) => {
          setCreating(false)
          setCaseId(id)
        }}
        visible={creating && isFocused}
      />
    </>
  )
}
