import type {
  AssistantActionResult,
  AssistantMessage,
  AssistantProposal,
  AssistantProposalFields,
} from "@halaalvest/assistant/contracts"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useRef, useState } from "react"
import {
  type AssistantApi,
  type AssistantConversationDetail,
  assistantKeys,
  newAssistantKey,
} from "../api/assistant-api"

type Choice = { proposalId: string | null; value: string }

/** A send that failed before a reply arrived: retried with the same key. */
type FailedSend = {
  conversationId: string
  requestId: string
  text: string
  choice?: Choice
}

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message && !/fetch|network/i.test(error.message)
    ? error.message
    : fallback

/**
 * The native assistant's state (ported from the website VM): bootstrap, saved chats, the open chat, the
 * composer draft, and proposal review. Sends are non-streaming; a failed send
 * is only retried when the person taps "Try again", with the same
 * `requestId`, so the server returns the saved reply instead of answering
 * twice. Confirmations reuse one key per proposal revision for the same
 * reason, and never run on their own.
 */
export function useGeneralAssistant({
  api,
  scope,
  blocked,
  initialConversationId = null,
}: {
  api: AssistantApi
  /** The signed membership this screen opened under; part of every key. */
  scope: string
  /** Offline, locked, or the session changed: nothing is sent or confirmed. */
  blocked: boolean
  initialConversationId?: string | null
}) {
  const queryClient = useQueryClient()
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId
  )
  // The chat a blank page's first message created; the URL follows it.
  const [startedConversationId, setStartedConversationId] = useState<
    string | null
  >(null)
  const [draft, setDraft] = useState("")
  const [busy, setBusy] = useState(false)
  const [pendingText, setPendingText] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [failed, setFailed] = useState<FailedSend | null>(null)
  const [working, setWorking] = useState<ReadonlySet<string>>(new Set())
  const [results, setResults] = useState<Record<string, AssistantActionResult>>(
    {}
  )
  const confirmationKeys = useRef(new Map<string, string>())
  const sending = useRef(false)

  const bootstrap = useQuery({
    queryKey: [...assistantKeys.bootstrap(), scope],
    queryFn: () => api.bootstrap(),
    retry: false,
    staleTime: 5 * 60_000,
  })
  const enabled = bootstrap.isSuccess
  const conversations = useQuery({
    queryKey: [...assistantKeys.conversations(), scope],
    queryFn: () => api.listConversations(),
    enabled,
    retry: false,
  })
  const state = useQuery({
    queryKey: [...assistantKeys.conversation(conversationId ?? "none"), scope],
    queryFn: () => api.getConversation(conversationId!),
    enabled: enabled && !!conversationId,
    retry: false,
    // A chat this page just wrote (first message, reply) is not re-read at once.
    staleTime: 30_000,
  })

  const writeDetail = useCallback(
    (
      id: string,
      update: (
        current: AssistantConversationDetail | undefined
      ) => AssistantConversationDetail | undefined
    ) =>
      queryClient.setQueryData<AssistantConversationDetail>(
        [...assistantKeys.conversation(id), scope],
        update
      ),
    [queryClient, scope]
  )

  const putProposal = useCallback(
    (id: string, proposal: AssistantProposal) =>
      writeDetail(id, (current) =>
        current
          ? {
              ...current,
              proposals: current.proposals.some((p) => p.id === proposal.id)
                ? current.proposals.map((p) =>
                    p.id === proposal.id ? proposal : p
                  )
                : [...current.proposals, proposal],
            }
          : current
      ),
    [writeDetail]
  )

  const run = useCallback(
    async (attempt: FailedSend) => {
      sending.current = true
      setBusy(true)
      setNotice(null)
      setPendingText(attempt.text)
      try {
        const output = await api.send({
          conversationId: attempt.conversationId,
          requestId: attempt.requestId,
          text: attempt.text,
          ...(attempt.choice ? { choice: attempt.choice } : {}),
        })
        writeDetail(attempt.conversationId, (current) => {
          const base = current ?? {
            conversation: {
              id: attempt.conversationId,
              title: attempt.text.slice(0, 60),
              channel: "native" as const,
              updatedAt: output.reply.createdAt,
              lastMessagePreview: null,
            },
            messages: [],
            proposals: [],
          }
          const seen = new Set(base.messages.map((message) => message.id))
          const added = [output.userMessage, output.reply].filter(
            (message) => !seen.has(message.id)
          )
          const fresh = new Map(output.proposals.map((p) => [p.id, p]))
          return {
            ...base,
            messages: [...base.messages, ...added],
            proposals: [
              ...base.proposals.map((p) => fresh.get(p.id) ?? p),
              ...output.proposals.filter(
                (p) => !base.proposals.some((known) => known.id === p.id)
              ),
            ],
          }
        })
        setFailed(null)
        void queryClient.invalidateQueries({
          queryKey: [...assistantKeys.conversations(), scope],
        })
        return true
      } catch (error) {
        setFailed(attempt)
        setNotice(
          errorText(
            error,
            "Your message didn't go through. Check your connection, then try again."
          )
        )
        return false
      } finally {
        sending.current = false
        setBusy(false)
        setPendingText(null)
      }
    },
    [api, queryClient, scope, writeDetail]
  )

  const send = useCallback(
    async (text?: string, choice?: Choice) => {
      const value = (text ?? draft).trim()
      if (!value || sending.current || !enabled || blocked) return false
      sending.current = true
      let id = conversationId
      if (!id) {
        setBusy(true)
        setPendingText(value)
        try {
          id = (await api.createConversation()).id
        } catch (error) {
          sending.current = false
          setBusy(false)
          setPendingText(null)
          setNotice(errorText(error, "Couldn't start a chat. Try again."))
          return false
        }
        writeDetail(id, () => ({
          conversation: {
            id: id!,
            title: value.slice(0, 60),
            channel: "native",
            updatedAt: new Date().toISOString(),
            lastMessagePreview: null,
          },
          messages: [],
          proposals: [],
        }))
        setStartedConversationId(id)
        setConversationId(id)
      }
      if (text === undefined) setDraft("")
      return run({
        conversationId: id,
        requestId: newAssistantKey("req"),
        text: value,
        choice,
      })
    },
    [api, blocked, conversationId, draft, enabled, run, writeDetail]
  )

  /** Same request again: the server returns the saved reply if it has one. */
  const retry = useCallback(() => {
    if (!failed || sending.current || blocked) return
    void run(failed)
  }, [blocked, failed, run])

  const track = (id: string, on: boolean) =>
    setWorking((current) => {
      const next = new Set(current)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })

  const confirm = useCallback(
    async (proposal: AssistantProposal) => {
      if (!conversationId || working.has(proposal.id) || blocked) return
      const slot = `${proposal.id}:${proposal.revision}`
      const confirmationKey =
        confirmationKeys.current.get(slot) ?? newAssistantKey("confirm")
      confirmationKeys.current.set(slot, confirmationKey)
      track(proposal.id, true)
      setNotice(null)
      try {
        const result = await api.confirmProposal({
          proposalId: proposal.id,
          revision: proposal.revision,
          confirmationKey,
        })
        setResults((current) => ({ ...current, [proposal.id]: result }))
        // Nothing was saved: say why, and let a later confirm use a fresh
        // key (the same key would only replay this answer). "checking"
        // keeps its key so a retry returns the same, settled result.
        if (result.outcome === "not_saved") {
          confirmationKeys.current.delete(slot)
          setNotice(result.message)
        }
        await queryClient.invalidateQueries({
          queryKey: [...assistantKeys.conversation(conversationId), scope],
        })
      } catch (error) {
        setNotice(
          errorText(
            error,
            "We couldn't confirm. Nothing changed on your side; check the result before trying again."
          )
        )
      } finally {
        track(proposal.id, false)
      }
    },
    [api, blocked, conversationId, queryClient, scope, working]
  )

  const cancel = useCallback(
    async (proposal: AssistantProposal) => {
      if (!conversationId || working.has(proposal.id) || blocked) return
      track(proposal.id, true)
      setNotice(null)
      try {
        putProposal(conversationId, await api.cancelProposal(proposal.id))
      } catch (error) {
        setNotice(errorText(error, "Couldn't cancel this draft. Try again."))
      } finally {
        track(proposal.id, false)
      }
    },
    [api, blocked, conversationId, putProposal, working]
  )

  const save = useCallback(
    async (proposal: AssistantProposal, fields: AssistantProposalFields) => {
      if (!conversationId || working.has(proposal.id) || blocked) return false
      track(proposal.id, true)
      setNotice(null)
      try {
        putProposal(
          conversationId,
          await api.editProposal({
            proposalId: proposal.id,
            revision: proposal.revision,
            fields,
          })
        )
        return true
      } catch (error) {
        setNotice(errorText(error, "Couldn't save your changes. Try again."))
        return false
      } finally {
        track(proposal.id, false)
      }
    },
    [api, blocked, conversationId, putProposal, working]
  )

  const choose = useCallback((id: string) => {
    setConversationId(id)
    setNotice(null)
    setFailed(null)
  }, [])

  const clearThread = useCallback(() => {
    setConversationId(null)
    setStartedConversationId(null)
    setNotice(null)
    setFailed(null)
  }, [])

  const archive = useCallback(
    async (id: string) => {
      try {
        await api.archiveConversation(id)
        if (id === conversationId) clearThread()
        await queryClient.invalidateQueries({
          queryKey: [...assistantKeys.conversations(), scope],
        })
      } catch (error) {
        setNotice(errorText(error, "Couldn't remove this chat. Try again."))
      }
    },
    [api, clearThread, conversationId, queryClient, scope]
  )

  const messages: AssistantMessage[] = state.data?.messages ?? []

  return {
    bootstrap,
    conversations,
    state,
    data: state.data,
    messages,
    conversationId,
    startedConversationId,
    blank: !conversationId,
    draft,
    setDraft,
    busy,
    pendingText,
    notice,
    failed: !!failed,
    failedText: failed && !busy ? failed.text : null,
    working,
    results,
    send,
    retry,
    confirm,
    cancel,
    save,
    choose,
    clearThread,
    archive,
  }
}

export type GeneralAssistantVM = ReturnType<typeof useGeneralAssistant>
