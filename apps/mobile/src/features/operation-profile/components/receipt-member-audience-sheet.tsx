import { AppSheet } from "@/components/app/app-sheet"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { ListCard } from "@/components/ui/list-card"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import { appQueryKey, useAppQuery } from "@/hooks/use-app-query"
import { useAuthContext } from "@/hooks/use-auth"
import { useDebounce } from "@/hooks/use-debounce"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { useQueryClient, type QueryKey } from "@tanstack/react-query"
import { useRef, useState } from "react"
import { ActivityIndicator, Keyboard, View } from "react-native"
import Toast from "react-native-toast-message"
import {
  getMobileReceiptMemberAudience,
  searchMobileReceiptMembers,
  updateMobileReceiptMemberAudience,
} from "../api/operation-profile-api"

type Settings = Awaited<ReturnType<typeof getMobileReceiptMemberAudience>>

const audiences = [
  {
    value: "disabled",
    label: "Disabled",
    detail: "Members cannot send new receipts.",
  },
  {
    value: "enabled",
    label: "Enabled",
    detail: "All eligible members can send receipts.",
  },
  {
    value: "selected_members",
    label: "Selected members",
    detail: "Only the members you choose can send receipts.",
  },
] as const

export function ReceiptMemberAudienceSheet({
  onClose,
  readOnly,
}: {
  onClose: () => void
  readOnly: boolean
}) {
  const { profile } = useAuthContext()
  const scope = [
    profile?.tenant.id,
    profile?.user.id,
    profile?.activeMembershipId,
  ]
  const queryKey = appQueryKey("receipt-member-audience", ...scope)
  const settings = useAppQuery({
    enabled: !readOnly && Boolean(profile),
    queryKey,
    staleTime: 0,
    queryFn: ({ signal }) => getMobileReceiptMemberAudience(signal),
  })

  if (settings.data) {
    return (
      <ReceiptMemberAudienceEditor
        key={[...scope, settings.data.revision].join(":")}
        onClose={onClose}
        readOnly={readOnly || settings.isFetching || settings.isRefetchError}
        queryKey={queryKey}
        searchKey={appQueryKey("receipt-member-audience-members", ...scope)}
        settings={settings.data}
      />
    )
  }

  return (
    <AppSheet
      onClose={onClose}
      title="Member receipt access"
      variant="form"
      visible
    >
      {settings.isFetching ? (
        <ActivityIndicator accessibilityLabel="Loading member receipt access" />
      ) : (
        <View className="gap-3">
          <Text>Member receipt access is unavailable.</Text>
          {!readOnly ? (
            <Button onPress={() => void settings.refetch()}>
              <Text>Try again</Text>
            </Button>
          ) : null}
        </View>
      )}
    </AppSheet>
  )
}

function ReceiptMemberAudienceEditor({
  onClose,
  queryKey,
  readOnly,
  searchKey,
  settings,
}: {
  onClose: () => void
  queryKey: QueryKey
  readOnly: boolean
  searchKey: QueryKey
  settings: Settings
}) {
  const runtime = useMobileRuntime()
  const queryClient = useQueryClient()
  const saving = useRef(false)
  const [audience, setAudience] = useState(settings.audience)
  const [members, setMembers] = useState(settings.members)
  const [search, setSearch] = useState("")
  const [reason, setReason] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const selectedMemberIds = new Set(members.map(({ id }) => id))
  const isSelection = audience === "selected_members"
  const removedMember = settings.members.some(
    ({ id }) => !selectedMemberIds.has(id)
  )
  const changed =
    audience !== settings.audience ||
    removedMember ||
    members.length !== settings.members.length
  const searchTerm = useDebounce(search.trim().slice(0, 100), 300)
  const matches = useAppQuery({
    enabled: isSelection && !readOnly && searchTerm.length > 1,
    queryKey: [...searchKey, searchTerm],
    queryFn: ({ signal }) => searchMobileReceiptMembers(searchTerm, signal),
  })
  const suggestions = (matches.data ?? []).filter(
    ({ id }) => !selectedMemberIds.has(id)
  )

  async function save() {
    if (!changed || readOnly || saving.current) return
    saving.current = true
    setIsSaving(true)
    setError(null)
    try {
      const updated = await runtime.runOnlineOperation("command", () =>
        updateMobileReceiptMemberAudience({
          audience,
          changeReason: reason.trim() || undefined,
          expectedRevision: settings.revision,
          memberIds: isSelection ? Array.from(selectedMemberIds) : [],
        })
      )
      queryClient.setQueryData(queryKey, updated)
      Toast.show({ text1: "Member receipt access saved" })
      onClose()
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not save member receipt access."
      )
    } finally {
      saving.current = false
      setIsSaving(false)
    }
  }

  return (
    <AppSheet
      contentClassName="gap-4"
      dirty={changed || Boolean(reason.trim())}
      footer={
        <Button
          disabled={readOnly || !changed}
          loading={isSaving}
          onPress={() => void save()}
        >
          <Text>Save member access</Text>
        </Button>
      }
      isSubmitting={isSaving}
      onClose={onClose}
      title="Member receipt access"
      variant="form"
      visible
    >
      <ListCard>
        {audiences.map((option) => (
          <Pressable
            key={option.value}
            accessibilityHint={option.detail}
            accessibilityLabel={option.label}
            accessibilityRole="radio"
            accessibilityState={{ checked: option.value === audience }}
            disabled={readOnly || isSaving}
            className="min-h-11 flex-row items-center justify-between gap-3 p-3"
            onPress={() => setAudience(option.value)}
          >
            <View className="min-w-0 flex-1 gap-1">
              <Text className="font-semibold">{option.label}</Text>
              <Text className="text-muted-foreground" variant="small">
                {option.detail}
              </Text>
            </View>
            {option.value === audience ? (
              <Icon className="size-base text-primary" name="Check" />
            ) : null}
          </Pressable>
        ))}
      </ListCard>
      {isSelection ? (
        <View className="gap-3">
          <Input
            accessibilityLabel="Search members"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!readOnly && !isSaving}
            onChangeText={setSearch}
            onSubmitEditing={Keyboard.dismiss}
            placeholder="Search by name or member code"
            returnKeyType="search"
            value={search}
          />
          {searchTerm.length > 1 ? (
            matches.isFetching ? (
              <ActivityIndicator accessibilityLabel="Searching members" />
            ) : (
              <ListCard>
                {suggestions.map((member) => (
                  <Pressable
                    key={member.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${member.fullName}`}
                    className="min-h-11 justify-center px-3 py-2"
                    disabled={readOnly || isSaving}
                    onPress={() => {
                      setMembers([...members, member])
                      setSearch("")
                      Keyboard.dismiss()
                    }}
                  >
                    <Text>
                      {member.fullName} · {member.memberNumber}
                    </Text>
                  </Pressable>
                ))}
                {matches.isError ? (
                  <Text className="p-3">
                    Member search unavailable. Change the search to retry.
                  </Text>
                ) : !suggestions.length ? (
                  <Text className="p-3 text-muted-foreground">
                    No matching members.
                  </Text>
                ) : null}
              </ListCard>
            )
          ) : null}
          <Text className="font-semibold">
            Selected members ({members.length})
          </Text>
          {members.map((member) => (
            <View
              key={member.id}
              className="min-h-11 flex-row items-center justify-between gap-2"
            >
              <Text className="min-w-0 flex-1">
                {member.fullName} · {member.memberNumber}
              </Text>
              <Button
                accessibilityLabel={`Remove ${member.fullName}`}
                disabled={readOnly || isSaving}
                onPress={() =>
                  setMembers(members.filter(({ id }) => id !== member.id))
                }
                variant="ghost"
              >
                <Text>Remove</Text>
              </Button>
            </View>
          ))}
        </View>
      ) : null}
      <Textarea
        accessibilityLabel="Reason for changing receipt access"
        editable={!readOnly && !isSaving}
        maxLength={1000}
        onChangeText={setReason}
        placeholder="Reason for removing access"
        value={reason}
      />
      <Text className="text-muted-foreground" variant="small">
        Receipt history stays visible and Finance can finish pending reviews.
      </Text>
      {error ? (
        <Text accessibilityRole="alert" className="text-destructive">
          {error}
        </Text>
      ) : null}
    </AppSheet>
  )
}
