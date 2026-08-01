"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { CheckIcon } from "lucide-react"

export type SignupJourneyStage =
  | "request"
  | "workspace"
  | "verify"
  | "profile"
  | "ready"

const journeySteps: { key: SignupJourneyStage; label: string }[] = [
  { key: "request", label: "Request" },
  { key: "workspace", label: "Workspace" },
  { key: "verify", label: "Verify" },
  { key: "profile", label: "Profile" },
  { key: "ready", label: "Ready" },
]

const SignupJourneyContext = createContext<{
  stage: SignupJourneyStage
  setStage: (stage: SignupJourneyStage) => void
} | null>(null)

export function SignupJourneyProvider({
  children,
  initialStage,
}: {
  children: ReactNode
  initialStage: SignupJourneyStage
}) {
  const [stage, setStage] = useState(initialStage)

  return (
    <SignupJourneyContext.Provider value={{ stage, setStage }}>
      {children}
    </SignupJourneyContext.Provider>
  )
}

export function useSignupJourneyStage(stage: SignupJourneyStage) {
  const journey = useContext(SignupJourneyContext)
  const setStage = journey?.setStage

  useEffect(() => {
    setStage?.(stage)
  }, [setStage, stage])
}

export function SignupJourneyProgress() {
  const journey = useContext(SignupJourneyContext)
  const currentIndex = journeySteps.findIndex(
    (step) => step.key === journey?.stage
  )

  return (
    <div className="relative mt-10 grid grid-cols-5 gap-1.5 lg:mt-auto lg:grid-cols-1 lg:gap-2 lg:pt-12">
      {journeySteps.map((step, index) => {
        const complete = index < currentIndex
        const current = index === currentIndex

        return (
          <div
            aria-current={current ? "step" : undefined}
            className={`flex min-w-0 items-center gap-3 rounded-xl px-2 py-2.5 transition-colors lg:px-3 ${
              current ? "bg-white/10" : "bg-transparent"
            }`}
            key={step.key}
          >
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold ${
                complete
                  ? "border-[#71D98B] bg-[#71D98B] text-[#071B2C]"
                  : current
                    ? "border-white bg-white text-[#071B2C]"
                    : "border-white/18 text-white/38"
              }`}
            >
              {complete ? (
                <CheckIcon aria-hidden="true" className="size-3" />
              ) : (
                index + 1
              )}
            </span>
            <span
              className={`hidden text-sm lg:block ${current ? "text-white" : "text-white/45"}`}
            >
              {step.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
