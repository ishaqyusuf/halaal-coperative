"use client"

import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import { toast } from "@halaalvest/ui/components/use-toast"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { type FormEvent, useId, useState } from "react"
import { useTRPC } from "@/trpc/client"

type Workplace = { id: string; memberCount: number; name: string }

function memberCountLabel(count: number) {
  return count === 1 ? "1 member" : `${count} members`
}

// Add and rename the workplaces (employers or offices) that pay members'
// monthly amounts. Members are linked to a workplace on their profile.
export function WorkplacesContent() {
  const trpc = useTRPC()
  const router = useRouter()
  const queryClient = useQueryClient()
  const workplaces = useQuery(trpc.workplaces.list.queryOptions())
  const [name, setName] = useState("")
  const nameId = useId()

  async function refresh() {
    await queryClient.invalidateQueries({
      queryKey: trpc.workplaces.list.queryKey(),
    })
    router.refresh()
  }

  const create = useMutation(
    trpc.workplaces.create.mutationOptions({
      onError: (error) =>
        toast({ description: error.message, title: "Not added", variant: "destructive" }),
      onSuccess: async (workplace) => {
        setName("")
        await refresh()
        toast({ title: `${workplace.name} added` })
      },
    })
  )

  function handleAdd(event: FormEvent) {
    event.preventDefault()
    if (name.trim().length >= 2) create.mutate({ name })
  }

  return (
    <div className="flex flex-col gap-6">
      <form className="flex flex-col gap-2" onSubmit={handleAdd}>
        <label className="font-medium" htmlFor={nameId}>
          New workplace
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            autoComplete="off"
            className="flex-1"
            id={nameId}
            maxLength={120}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Ministry of Health"
            value={name}
          />
          <Button
            disabled={name.trim().length < 2 || create.isPending}
            type="submit"
          >
            Add
          </Button>
        </div>
      </form>

      <div>
        <h3 className="border-b border-border pb-2 font-medium">Workplaces</h3>
        {workplaces.isPending ? (
          <p className="py-4 text-muted-foreground">Loading…</p>
        ) : workplaces.data?.length ? (
          <ul>
            {workplaces.data.map((workplace) => (
              <WorkplaceRow
                key={workplace.id}
                onSaved={refresh}
                workplace={workplace}
              />
            ))}
          </ul>
        ) : (
          <p className="py-4 text-muted-foreground">No workplaces yet.</p>
        )}
      </div>
    </div>
  )
}

function WorkplaceRow({
  onSaved,
  workplace,
}: {
  onSaved: () => Promise<void>
  workplace: Workplace
}) {
  const trpc = useTRPC()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(workplace.name)
  const rename = useMutation(
    trpc.workplaces.rename.mutationOptions({
      onError: (error) =>
        toast({ description: error.message, title: "Not renamed", variant: "destructive" }),
      onSuccess: async () => {
        setEditing(false)
        await onSaved()
      },
    })
  )

  if (editing) {
    return (
      <li className="border-b border-border py-3">
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault()
            if (name.trim().length >= 2) {
              rename.mutate({ id: workplace.id, name })
            }
          }}
        >
          <Input
            aria-label={`New name for ${workplace.name}`}
            autoFocus
            className="flex-1"
            maxLength={120}
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
          <div className="flex gap-3">
            <Button
              className="flex-1 sm:flex-none"
              disabled={name.trim().length < 2 || rename.isPending}
              type="submit"
            >
              Save
            </Button>
            <Button
              className="flex-1 sm:flex-none"
              onClick={() => {
                setName(workplace.name)
                setEditing(false)
              }}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li className="flex min-h-16 items-center justify-between gap-3 border-b border-border py-3">
      <div className="min-w-0">
        <p className="truncate font-medium">{workplace.name}</p>
        <p className="text-muted-foreground">
          {memberCountLabel(workplace.memberCount)}
        </p>
      </div>
      <Button onClick={() => setEditing(true)} type="button" variant="outline">
        Rename
      </Button>
    </li>
  )
}
