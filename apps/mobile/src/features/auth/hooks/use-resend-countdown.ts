import { RECOVERY_RESEND_SECONDS } from "@/features/auth/model/recovery-flow"
import { useCallback, useEffect, useState } from "react"

/**
 * Seconds left before "Resend code" unlocks. `restart()` after each send.
 * Counts from a deadline, so a backgrounded app catches up on return.
 */
export function useResendCountdown(seconds = RECOVERY_RESEND_SECONDS) {
  const [deadline, setDeadline] = useState(() => Date.now() + seconds * 1000)
  const [now, setNow] = useState(() => Date.now())
  const remaining = Math.max(0, Math.ceil((deadline - now) / 1000))

  useEffect(() => {
    if (remaining <= 0) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [remaining])

  const restart = useCallback(() => {
    const start = Date.now()
    setNow(start)
    setDeadline(start + seconds * 1000)
  }, [seconds])

  return { remaining, restart }
}
