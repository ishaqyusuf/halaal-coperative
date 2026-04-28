"use client"

import { useEffect, useState } from "react"
import { Button } from "@halaal-vest/ui/components/button"
import { MemberCreateForm } from "@/components/forms/member-forms"

export function MemberCreateModal({ devMode }: { devMode: boolean }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    document.body.style.overflow = "hidden"

    return () => {
      window.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = ""
    }
  }, [open])

  return (
    <>
      <Button type="button" variant={open ? "default" : "outline"} className="rounded-full" onClick={() => setOpen(true)}>
        New member
      </Button>

      <div
        className={`fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 backdrop-blur-[2px] transition md:items-center ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
      >
        <div
          className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[32px] border border-border/70 bg-card shadow-[0_24px_80px_rgba(15,23,42,0.28)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border/70 px-6 py-5">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">Members</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground">Create member</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Midday-style quick capture for a new member, their current savings state, and any existing active loan.
              </p>
            </div>
            <Button type="button" variant="ghost" className="rounded-full" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>

          <div className="overflow-y-auto px-6 py-5">
            <MemberCreateForm devMode={devMode} inModal onSuccess={() => setOpen(false)} />
          </div>
        </div>
      </div>
    </>
  )
}
