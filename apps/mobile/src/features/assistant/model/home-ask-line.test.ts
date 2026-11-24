import { describe, expect, test } from "bun:test"
import {
  buildHomeAskQuestions,
  HOME_ASK_FINANCING_QUESTION,
  HOME_ASK_TIMING,
  stepHomeAskTypewriter,
} from "./home-ask-line"

const suggestions = [
  "What's my loan status?",
  "What are my total investments?",
  "Has my receipt been approved?",
]

describe("home Ask line questions", () => {
  test("leads with financing only when the home read shows money owed", () => {
    expect(buildHomeAskQuestions({ financingOutstanding: 180000, suggestions })).toEqual([
      HOME_ASK_FINANCING_QUESTION,
      ...suggestions,
    ])
    expect(buildHomeAskQuestions({ financingOutstanding: 0, suggestions })).toEqual(suggestions)
    expect(buildHomeAskQuestions({ financingOutstanding: Number.NaN, suggestions })).toEqual(
      suggestions
    )
  })

  test("drops blanks and duplicates and caps the length", () => {
    const long = "x".repeat(400)
    expect(
      buildHomeAskQuestions({ financingOutstanding: 0, suggestions: [" ", "A?", "A?", long] })
    ).toEqual(["A?", "x".repeat(160)])
  })
})

describe("home Ask line typewriter", () => {
  test("types, holds, erases two at a time and moves on", () => {
    const questions = ["Hey", "Next"]
    let step = stepHomeAskTypewriter({ chars: 0, index: 0, phase: "type" }, questions)
    expect(step).toEqual({ delay: HOME_ASK_TIMING.type, state: { chars: 1, index: 0, phase: "type" } })
    step = stepHomeAskTypewriter({ chars: 2, index: 0, phase: "type" }, questions)
    expect(step).toEqual({ delay: HOME_ASK_TIMING.hold, state: { chars: 3, index: 0, phase: "hold" } })
    step = stepHomeAskTypewriter(step.state, questions)
    expect(step.state).toEqual({ chars: 3, index: 0, phase: "erase" })
    step = stepHomeAskTypewriter(step.state, questions)
    expect(step.state).toEqual({ chars: 1, index: 0, phase: "erase" })
    step = stepHomeAskTypewriter(step.state, questions)
    expect(step).toEqual({ delay: HOME_ASK_TIMING.next, state: { chars: 0, index: 1, phase: "type" } })
  })

  test("wraps to the first question and survives an empty list", () => {
    expect(
      stepHomeAskTypewriter({ chars: 1, index: 1, phase: "erase" }, ["A", "B"]).state.index
    ).toBe(0)
    expect(stepHomeAskTypewriter({ chars: 0, index: 0, phase: "type" }, []).delay).toBe(
      HOME_ASK_TIMING.hold
    )
  })
})
