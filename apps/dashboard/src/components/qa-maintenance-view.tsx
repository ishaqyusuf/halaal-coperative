"use client"

import { useState } from "react"
import { useNotifications } from "@halaalvest/notifications-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@halaalvest/ui/components/alert-dialog"
import { Badge } from "@halaalvest/ui/components/badge"
import { Button } from "@halaalvest/ui/components/button"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
import { Input } from "@halaalvest/ui/components/input"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import { useTRPC } from "@/trpc/client"

const purgeConfirmation = "PURGE ALL QA DATA"

function CountCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border/70 bg-background px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-medium tabular-nums">{value}</p>
    </div>
  )
}

export function QaMaintenanceView() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { showError, showSuccess } = useNotifications()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmation, setConfirmation] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [runId, setRunId] = useState<string | null>(null)
  const candidates = useQuery(trpc.qaMaintenance.candidates.queryOptions())
  const preview = useQuery(trpc.qaMaintenance.preview.queryOptions())
  const run = useQuery(
    trpc.qaMaintenance.run.queryOptions(
      { runId: runId ?? "00000000-0000-4000-8000-000000000000" },
      {
        enabled: Boolean(runId),
        refetchInterval: ({ state }) => {
          const status = state.data?.status
          return status === "queued" || status === "running" ? 1_500 : false
        },
      },
    ),
  )
  const adopt = useMutation(
    trpc.qaMaintenance.adopt.mutationOptions({
      onError: (error) =>
        showError("Could not mark QA workspaces", error.message),
      onSuccess: async ({ adoptedCount }) => {
        setSelected(new Set())
        await Promise.all([
          queryClient.invalidateQueries(
            trpc.qaMaintenance.candidates.queryFilter(),
          ),
          queryClient.invalidateQueries(
            trpc.qaMaintenance.preview.queryFilter(),
          ),
        ])
        showSuccess(
          "QA workspaces marked",
          `${adoptedCount} workspace${adoptedCount === 1 ? "" : "s"} adopted.`,
        )
      },
    }),
  )
  const startPurge = useMutation(
    trpc.qaMaintenance.startPurge.mutationOptions({
      onError: (error) => showError("Could not start QA purge", error.message),
      onSuccess: (nextRun) => {
        setConfirmOpen(false)
        setConfirmation("")
        setRunId(nextRun.id)
        showSuccess("QA purge started", "The background cleanup is running.")
      },
    }),
  )
  const counts = preview.data?.counts
  const finalRun = run.data

  return (
    <WorkspacePageShell
      description="Discover, classify, preview, and permanently purge isolated QA workspaces. Live provider resources always block deletion."
      eyebrow="Platform maintenance"
      title="QA data cleanup"
    >
      <section className="space-y-3 border border-border/70 bg-card p-4">
        <div>
          <h2 className="text-sm font-medium">Candidate adoption</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Candidates are discovered from configured QA-domain owners. Marking
            is explicit and cannot be inferred during deletion.
          </p>
        </div>
        {candidates.data?.length ? (
          <div className="divide-y divide-border/70 border border-border/70">
            {candidates.data.map((candidate) => (
              <label
                className="flex items-center gap-3 px-3 py-3 text-sm"
                key={candidate.id}
              >
                <Checkbox
                  checked={selected.has(candidate.id)}
                  onCheckedChange={(checked) => {
                    const next = new Set(selected)
                    if (checked) next.add(candidate.id)
                    else next.delete(candidate.id)
                    setSelected(next)
                  }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{candidate.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {candidate.slug} · QA domain verified
                  </span>
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No unmarked QA candidates found.
          </p>
        )}
        <Button
          disabled={selected.size === 0 || adopt.isPending}
          onClick={() => adopt.mutate({ tenantIds: [...selected] })}
          variant="outline"
        >
          {adopt.isPending ? "Marking…" : "Mark selected as QA"}
        </Button>
      </section>

      <section className="space-y-4 border border-border/70 bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium">Purge preview</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              The signed preview expires after ten minutes and is revalidated
              before any workspace is locked.
            </p>
          </div>
          <Button
            onClick={() => preview.refetch()}
            variant="outline"
          >
            Refresh preview
          </Button>
        </div>

        {counts ? (
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <CountCard label="Workspaces" value={counts.workspaces} />
            <CountCard label="Users" value={counts.users} />
            <CountCard label="Members" value={counts.members} />
            <CountCard label="Ledger records" value={counts.ledgerTransactions} />
            <CountCard label="Audit records" value={counts.auditLogs} />
            <CountCard label="Files" value={counts.files} />
          </div>
        ) : null}

        {preview.data?.blockers.length ? (
          <div className="border border-destructive/40 bg-destructive/5 p-3">
            <p className="text-sm font-medium text-destructive">
              Purge blocked by live provider resources
            </p>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {preview.data.blockers.map((blocker) => (
                <li key={`${blocker.tenantId}:${blocker.category}`}>
                  {blocker.tenantName}:{" "}
                  {blocker.category === "live_custom_domain"
                    ? "verified custom domain"
                    : "required provider credential is unavailable"}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {preview.data?.tenants.length ? (
          <div className="divide-y divide-border/70 border border-border/70">
            {preview.data.tenants.map((tenant) => (
              <div
                className="flex items-center justify-between gap-3 px-3 py-3"
                key={tenant.id}
              >
                <div>
                  <p className="text-sm font-medium">{tenant.name}</p>
                  <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                </div>
                <Badge variant="outline">QA</Badge>
              </div>
            ))}
          </div>
        ) : (
          <WorkspaceEmptyState
            body="Adopt a discovered candidate before previewing a purge."
            title="No marked QA workspaces"
          />
        )}

        <Button
          disabled={
            !preview.data?.tenants.length ||
            Boolean(preview.data?.blockers.length) ||
            startPurge.isPending
          }
          onClick={() => setConfirmOpen(true)}
          variant="destructive"
        >
          Purge all QA data
        </Button>
      </section>

      {finalRun ? (
        <section className="border border-border/70 bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium">Latest purge run</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Receipt {finalRun.id}
              </p>
            </div>
            <Badge variant="outline">{finalRun.status.replaceAll("_", " ")}</Badge>
          </div>
          {finalRun.deletedCounts ? (
            <pre className="mt-3 overflow-auto border border-border/70 bg-background p-3 text-xs">
              {JSON.stringify(finalRun.deletedCounts, null, 2)}
            </pre>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Cleanup is in progress…
            </p>
          )}
        </section>
      ) : null}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently purge all QA data?</AlertDialogTitle>
            <AlertDialogDescription>
              Files are removed first, then each marked aggregate is deleted.
              This cannot be undone. Type {purgeConfirmation} to continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            autoComplete="off"
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={purgeConfirmation}
            value={confirmation}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={
                confirmation !== purgeConfirmation || startPurge.isPending
              }
              onClick={() => {
                if (!preview.data) return
                startPurge.mutate({
                  confirmation: purgeConfirmation,
                  previewToken: preview.data.previewToken,
                })
              }}
              variant="destructive"
            >
              {startPurge.isPending ? "Starting…" : "Purge QA data"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </WorkspacePageShell>
  )
}
