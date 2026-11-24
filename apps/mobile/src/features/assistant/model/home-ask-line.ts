/**
 * The member home Ask line (T31, workshop 31-home-ask · 04 Quiet line): one
 * question at a time, typed out, held, erased and rotated. Pure helpers so
 * the component stays a thin timer.
 */

/** A question sent from home is capped like the HomeAskBar chips. */
export const HOME_ASK_MAX_LENGTH = 160

/** Financing still owed: worth asking about first. */
export const HOME_ASK_FINANCING_QUESTION = "What's left on my financing?"

/**
 * The rotation: a context question first, only when the home read already
 * carries the fact behind it (financing owed), then the role's registry
 * suggestions (assistantSuggestions), without duplicates.
 */
export function buildHomeAskQuestions(input: {
  financingOutstanding: number
  suggestions: readonly string[]
}) {
  const list: string[] = []
  if (Number.isFinite(input.financingOutstanding) && input.financingOutstanding > 0) {
    list.push(HOME_ASK_FINANCING_QUESTION)
  }
  for (const suggestion of input.suggestions) {
    const question = suggestion.trim().slice(0, HOME_ASK_MAX_LENGTH)
    if (question && !list.includes(question)) list.push(question)
  }
  return list
}

export type HomeAskTypewriter = {
  /** Characters of the current question on screen. */
  chars: number
  index: number
  phase: "type" | "hold" | "erase"
}

/** Milliseconds before the next frame of each phase. */
export const HOME_ASK_TIMING = { erase: 16, hold: 2600, next: 260, type: 42 } as const

/**
 * One typewriter step: type a character, hold the full question, erase two
 * characters at a time, then move to the next question. Returns the next
 * state and the delay before it.
 */
export function stepHomeAskTypewriter(
  state: HomeAskTypewriter,
  questions: readonly string[]
): { delay: number; state: HomeAskTypewriter } {
  const count = questions.length
  if (!count) return { delay: HOME_ASK_TIMING.hold, state }
  const index = state.index % count
  const length = questions[index]?.length ?? 0
  if (state.phase === "type") {
    const chars = Math.min(length, state.chars + 1)
    return chars >= length
      ? { delay: HOME_ASK_TIMING.hold, state: { chars, index, phase: "hold" } }
      : { delay: HOME_ASK_TIMING.type, state: { chars, index, phase: "type" } }
  }
  if (state.phase === "hold") {
    return { delay: HOME_ASK_TIMING.erase, state: { chars: length, index, phase: "erase" } }
  }
  const chars = Math.max(0, state.chars - 2)
  return chars === 0
    ? { delay: HOME_ASK_TIMING.next, state: { chars: 0, index: (index + 1) % count, phase: "type" } }
    : { delay: HOME_ASK_TIMING.erase, state: { chars, index, phase: "erase" } }
}
