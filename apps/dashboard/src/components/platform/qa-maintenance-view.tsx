"use client"

import { Button } from "@halaalvest/ui/components/button"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
import { Input } from "@halaalvest/ui/components/input"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { DashboardPageShell } from "@/components/dashboard"
import { RequestConfirmDialog } from "@/components/requests/request-confirm-dialog"
import { RequestFacts } from "@/components/requests/request-facts"
import { getQaRunWord, plural } from "@/lib/platform/platform-words"
import { useTRPC } from "@/trpc/client"
import { PlatformBadge } from "./platform-badge"
import { PlatformTabs } from "./platform-tabs"

// The API needs this exact phrase; people type the short word below.
const apiConfirmation = "PURGE ALL QA DATA"
const typedWord = "DELETE"

type Counts = {
  auditLogs: number
  files: number
  ledgerTransactions: number
  members: number
  users: number
  workspaces: number
}

function countFacts(counts: Counts) {
  return [
    { label: "Cooperatives", value: counts.workspaces.toLocaleString("en-NG") },
    {
      label: "People who sign in",
      value: counts.users.toLocaleString("en-NG"),
    },
    { label: "Members", value: counts.members.toLocaleString("en-NG") },
    {
      label: "Money records",
      value: counts.ledgerTransactions.toLocaleString("en-NG"),
    },
    {
      label: "Activity entries",
      value: counts.auditLogs.toLocaleString("en-NG"),
    },
    { label: "Files", value: counts.files.toLocaleString("en-NG") },
  ]
}

/**
 * Remove cooperatives made for testing. Only cooperatives marked as test data
 * (data classification "qa") can be removed; the server re-checks that and
 * refuses while any of them has a live web address.
 */
export function QaMaintenanceView() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [marking, setMarking] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [typed, setTyped] = useState("")
  const [runId, setRunId] = useState<string | null>(null)
  const candidates = useQuery(trpc.qaMaintenance.candidates.queryOptions())
  const preview = useQuery(trpc.qaMaintenance.preview.queryOptions())
  const run = useQuery(
    trpc.qaMaintenance.run.queryOptions(
      { runId: runId ?? "00000000-0000-4000-8000-000000000000" },
      {
        enabled: Boolean(runId),
        // Poll only while the removal job runs.
        refetchInterval: ({ state }) => {
          const status = state.data?.status
          return status === "queued" || status === "running" ? 2_000 : false
        },
      }
    )
  )

  const refreshLists = () =>
    Promise.all([
      queryClient.invalidateQueries(
        trpc.qaMaintenance.candidates.queryFilter()
      ),
      queryClient.invalidateQueries(trpc.qaMaintenance.preview.queryFilter()),
    ])

  const adopt = useMutation(
    trpc.qaMaintenance.adopt.mutationOptions({
      onSuccess: async () => {
        setMarking(false)
        setSelected(new Set())
        await refreshLists()
      },
      onError: () => void refreshLists(),
    })
  )
  const startPurge = useMutation(
    trpc.qaMaintenance.startPurge.mutationOptions({
      onSuccess: async (nextRun) => {
        setRemoving(false)
        setTyped("")
        setRunId(nextRun.id)
        await refreshLists()
      },
      // An old or changed list is refused by the server: show the new one.
      onError: () => void preview.refetch(),
    })
  )

  const marked = preview.data?.tenants ?? []
  const blockers = preview.data?.blockers ?? []
  const found = candidates.data ?? []
  const chosen = found.filter((candidate) => selected.has(candidate.id))
  const latestRun = run.data
  const canRemove =
    marked.length > 0 && blockers.length === 0 && !preview.isFetching

  return (
    <DashboardPageShell>
      <PlatformTabs />
      <p className="text-lg text-muted-foreground">
        Remove cooperatives made for testing. Real cooperatives are never
        touched.
      </p>

      {latestRun ? (
        <section className="grid gap-4 rounded-xl border border-border bg-background p-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold">Last removal</h2>
            <PlatformBadge word={getQaRunWord(latestRun.status)} />
          </div>
          {latestRun.deletedCounts &&
          typeof latestRun.deletedCounts === "object" ? (
            <RequestFacts
              items={countFacts(latestRun.deletedCounts as unknown as Counts)}
            />
          ) : (
            <p className="text-base text-muted-foreground" role="status">
              Removing test data. You can leave this page.
            </p>
          )}
        </section>
      ) : null}

      <section className="grid gap-5 rounded-xl border border-border bg-background p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-xl font-semibold">Marked as test data</h2>
          <Button
            size="touch"
            className="px-5 text-base"
            disabled={preview.isFetching}
            onClick={() => void preview.refetch()}
            variant="outline"
          >
            {preview.isFetching ? "Checking…" : "Check again"}
          </Button>
        </div>

        {preview.isPending ? (
          <p className="text-lg text-muted-foreground" role="status">
            Loading…
          </p>
        ) : preview.isError && !preview.data ? (
          <p className="text-lg" role="alert">
            Test data could not be checked. Try again.
          </p>
        ) : marked.length === 0 ? (
          <p className="text-lg text-muted-foreground">
            No cooperative is marked as test data.
          </p>
        ) : (
          <>
            {preview.data ? (
              <RequestFacts items={countFacts(preview.data.counts)} />
            ) : null}
            <details className="rounded-lg border border-border p-4">
              <summary className="min-h-11 cursor-pointer content-center text-base font-medium">
                See the {plural(marked.length, "cooperative")}
              </summary>
              <ul className="mt-2 divide-y divide-border">
                {marked.map((tenant) => (
                  <li className="grid gap-0.5 py-3" key={tenant.id}>
                    <span className="text-base font-medium">{tenant.name}</span>
                    <span className="text-sm [overflow-wrap:anywhere] text-muted-foreground">
                      {tenant.slug}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          </>
        )}

        {blockers.length ? (
          <div
            className="grid gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-900"
            role="alert"
          >
            <p className="text-base font-semibold">
              Removal is blocked until this is fixed:
            </p>
            <ul className="grid gap-1 text-base">
              {blockers.map((blocker) => (
                <li key={`${blocker.tenantId}:${blocker.category}`}>
                  {blocker.category === "live_custom_domain"
                    ? `${blocker.tenantName} has its own live web address.`
                    : `${blocker.tenantName}: the hosting key is missing.`}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {startPurge.isError ? (
          <p className="text-base text-destructive" role="alert">
            Nothing was removed.{" "}
            {startPurge.error.data?.code === "CONFLICT"
              ? "The list changed or was older than 10 minutes. Check it and try again."
              : startPurge.error.message}
          </p>
        ) : null}

        <Button
          className="h-12 justify-self-start px-6 text-base"
          disabled={!canRemove || startPurge.isPending}
          onClick={() => {
            setTyped("")
            setRemoving(true)
          }}
          variant="destructive"
        >
          Remove test data…
        </Button>
      </section>

      <section className="grid gap-4 rounded-xl border border-border bg-background p-5">
        <h2 className="text-xl font-semibold">Found, not marked yet</h2>
        <p className="text-base text-muted-foreground">
          Cooperatives run by a test email address. Mark only ones made for
          testing.
        </p>
        {candidates.isPending ? (
          <p className="text-base text-muted-foreground" role="status">
            Loading…
          </p>
        ) : candidates.isError ? (
          <p className="text-base" role="alert">
            These could not be loaded. Try again later.
          </p>
        ) : found.length === 0 ? (
          <p className="text-base">None found.</p>
        ) : (
          <>
            <ul className="divide-y divide-border border-y border-border">
              {found.map((candidate) => (
                <li key={candidate.id}>
                  <label className="flex min-h-14 cursor-pointer items-center gap-3 py-3">
                    <Checkbox
                      checked={selected.has(candidate.id)}
                      className="size-6"
                      onCheckedChange={(checked) => {
                        const next = new Set(selected)
                        if (checked) next.add(candidate.id)
                        else next.delete(candidate.id)
                        setSelected(next)
                      }}
                    />
                    <span className="grid min-w-0">
                      <span className="text-base font-medium">
                        {candidate.name}
                      </span>
                      <span className="text-sm [overflow-wrap:anywhere] text-muted-foreground">
                        {candidate.slug} · run by @{candidate.qaSourceDomain}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            {adopt.isError ? (
              <p className="text-base text-destructive" role="alert">
                Nothing was marked. {adopt.error.message}
              </p>
            ) : null}
            <Button
              className="h-12 justify-self-start px-6 text-base"
              disabled={chosen.length === 0 || adopt.isPending}
              onClick={() => setMarking(true)}
              variant="outline"
            >
              Mark as test data…
            </Button>
          </>
        )}
      </section>

      <RequestConfirmDialog
        confirmLabel="Mark as test data"
        description="They will be removed for good the next time someone removes test data. Only mark cooperatives made for testing."
        facts={chosen.map((candidate, index) => ({
          label: `Cooperative ${index + 1}`,
          value: candidate.name,
        }))}
        onConfirm={() =>
          adopt.mutate({ tenantIds: chosen.map((candidate) => candidate.id) })
        }
        onOpenChange={setMarking}
        open={marking}
        pending={adopt.isPending}
        title={`Mark ${plural(chosen.length, "cooperative")} as test data?`}
      />

      <RequestConfirmDialog
        confirmLabel="Remove test data"
        description={`This deletes ${plural(marked.length, "test cooperative")} and everything in them for good, files first. Real cooperatives are not touched. This cannot be undone.`}
        destructive
        disabled={typed.trim().toUpperCase() !== typedWord}
        facts={preview.data ? countFacts(preview.data.counts) : []}
        onConfirm={() => {
          if (!preview.data) return
          startPurge.mutate({
            confirmation: apiConfirmation,
            previewToken: preview.data.previewToken,
          })
        }}
        onOpenChange={setRemoving}
        open={removing}
        pending={startPurge.isPending}
        title="Remove all test data?"
      >
        <div className="grid gap-2">
          <label className="text-base font-medium" htmlFor="qa-remove-word">
            Type {typedWord} to confirm
          </label>
          <Input
            autoComplete="off"
            className="h-12 text-base"
            id="qa-remove-word"
            onChange={(event) => setTyped(event.target.value)}
            value={typed}
          />
        </div>
      </RequestConfirmDialog>
    </DashboardPageShell>
  )
}
