"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type RefObject,
  type ReactNode,
} from "react"
import {
  formatJourneyPartCounter,
  getJourneyPosition,
  getJourneyStepState,
  getOnboardingJourneyPartSteps,
  isJourneyStepSelectable,
  onboardingJourneyParts,
  onboardingJourneySteps,
  type OnboardingJourneyStepKey,
} from "@halaalvest/domain"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@halaalvest/ui/components/sheet"
import { CheckIcon } from "lucide-react"

// The marketing shell only ever shows steps 1–4 as live; after the workspace is
// created the rail moves to step 5 while the browser hands off to the dashboard.
export type SignupJourneyStage = OnboardingJourneyStepKey

type SignupJourneyRegistration = {
  onSelect?: (stepKey: OnboardingJourneyStepKey) => void
  selectable?: OnboardingJourneyStepKey[]
  workspaceCreated?: boolean
}

type SignupJourneyRegistrationState = {
  selectable: OnboardingJourneyStepKey[]
  selectHandler: boolean
  workspaceCreated: boolean
}

type SignupJourneyContextValue = {
  register: (registration: SignupJourneyRegistrationState) => void
  registration: SignupJourneyRegistrationState
  selectRef: RefObject<SignupJourneyRegistration["onSelect"]>
  setSelectHandler: (handler: SignupJourneyRegistration["onSelect"]) => void
  setStage: (stage: SignupJourneyStage) => void
  stage: SignupJourneyStage
}

const SignupJourneyContext = createContext<SignupJourneyContextValue | null>(
  null
)

export function SignupJourneyProvider({
  children,
  initialStage,
}: {
  children: ReactNode
  initialStage: SignupJourneyStage
}) {
  const [stage, setStage] = useState(initialStage)
  const [registration, register] = useState<SignupJourneyRegistrationState>({
    selectable: [],
    selectHandler: false,
    workspaceCreated: false,
  })
  const selectRef = useRef<SignupJourneyRegistration["onSelect"]>(undefined)
  const setSelectHandler = useCallback(
    (handler: SignupJourneyRegistration["onSelect"]) => {
      selectRef.current = handler
    },
    []
  )

  return (
    <SignupJourneyContext.Provider
      value={{
        register,
        registration,
        selectRef,
        setSelectHandler,
        setStage,
        stage,
      }}
    >
      {children}
    </SignupJourneyContext.Provider>
  )
}

// True inside the One Path page shell; false when a form is embedded elsewhere
// (the Passbook homepage section renders SignupForm without the shell).
export function useInSignupJourneyShell() {
  return useContext(SignupJourneyContext) !== null
}

export function useSignupJourneyStage(
  stage: SignupJourneyStage,
  registration: SignupJourneyRegistration = {}
) {
  const journey = useContext(SignupJourneyContext)
  const setStage = journey?.setStage
  const register = journey?.register
  const setSelectHandler = journey?.setSelectHandler
  const { onSelect } = registration
  const selectHandler = Boolean(onSelect)
  const workspaceCreated = Boolean(registration.workspaceCreated)
  const selectableKey = registration.selectable?.join(",") ?? ""

  useEffect(() => {
    setStage?.(stage)
  }, [setStage, stage])

  // The handler lives in a ref so a new closure each render never re-registers.
  useEffect(() => {
    setSelectHandler?.(onSelect)
  })

  useEffect(() => {
    register?.({
      selectable: selectableKey
        ? (selectableKey.split(",") as OnboardingJourneyStepKey[])
        : [],
      selectHandler,
      workspaceCreated,
    })
  }, [register, selectHandler, selectableKey, workspaceCreated])
}

function JourneySteps({ onNavigate }: { onNavigate?: () => void }) {
  const journey = useContext(SignupJourneyContext)
  const stage = journey?.stage ?? "sign-up"
  const registration = journey?.registration

  return (
    <nav aria-label="Setup steps" className="flex flex-col gap-6">
      {onboardingJourneyParts.map((part) => {
        const steps = getOnboardingJourneyPartSteps(part.key)
        const active = steps.some((step) => step.key === stage)

        return (
          <div className="flex flex-col gap-1" key={part.key}>
            <div className="flex items-baseline justify-between gap-2 px-2 pb-1.5">
              <h2
                className={`text-[11px] font-semibold tracking-[0.1em] uppercase ${
                  active ? "text-[#71D98B]" : "text-white/55"
                }`}
              >
                {part.title}
              </h2>
              <span className="text-[11.5px] whitespace-nowrap text-white/45">
                {part.estimate}
              </span>
            </div>
            <ol className="flex flex-col gap-1">
              {steps.map((step) => {
                const state = getJourneyStepState({
                  currentStepKey: stage,
                  stepKey: step.key,
                })
                const selectable =
                  Boolean(registration?.selectHandler) &&
                  isJourneyStepSelectable({
                    completedStepKeys: registration?.selectable ?? [],
                    currentStepKey: stage,
                    stepKey: step.key,
                    workspaceCreated: Boolean(registration?.workspaceCreated),
                  })

                return (
                  <li key={step.key}>
                    <button
                      aria-current={state === "current" ? "step" : undefined}
                      className={`flex w-full items-center gap-3 rounded-[10px] p-2 text-left text-sm transition-colors ${
                        state === "current"
                          ? "bg-white/10 text-white"
                          : state === "complete"
                            ? "text-white/80"
                            : "text-white/50"
                      } ${selectable ? "cursor-pointer hover:bg-white/6" : "cursor-default"}`}
                      disabled={!selectable}
                      onClick={() => {
                        journey?.selectRef.current?.(step.key)
                        onNavigate?.()
                      }}
                      type="button"
                    >
                      <span
                        className={`flex size-[22px] shrink-0 items-center justify-center rounded-full border text-[10.5px] font-semibold ${
                          state === "complete"
                            ? "border-[#71D98B] bg-[#71D98B] text-[#071B2C]"
                            : state === "current"
                              ? "border-white bg-white text-[#071B2C]"
                              : "border-white/25"
                        }`}
                      >
                        {state === "complete" ? (
                          <CheckIcon aria-hidden="true" className="size-3" />
                        ) : (
                          step.number
                        )}
                      </span>
                      <span>{step.label}</span>
                      {state === "complete" ? (
                        <span className="sr-only">(done)</span>
                      ) : null}
                    </button>
                  </li>
                )
              })}
            </ol>
          </div>
        )
      })}
    </nav>
  )
}

export function SignupJourneyProgress() {
  return <JourneySteps />
}

export function SignupJourneyMobileBar() {
  const journey = useContext(SignupJourneyContext)
  const stage = journey?.stage ?? "sign-up"
  const position = getJourneyPosition(stage)
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col gap-2.5 bg-[#071B2C] px-4 py-3.5 text-white md:hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-white/65">
            {formatJourneyPartCounter(stage)}
          </p>
          <p className="truncate font-semibold">{position.step.label}</p>
        </div>
        <Sheet onOpenChange={setOpen} open={open}>
          <SheetTrigger
            render={
              <button
                className="min-h-9 shrink-0 rounded-lg border border-white/25 px-2.5 text-[12.5px] text-white"
                type="button"
              />
            }
          >
            All steps
          </SheetTrigger>
          <SheetContent
            className="max-h-[85svh] gap-5 overflow-y-auto rounded-t-2xl border-0 bg-[#071B2C] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-white"
            side="bottom"
          >
            <SheetHeader className="p-0">
              <SheetTitle className="text-white">All steps</SheetTitle>
              <SheetDescription className="text-white/60">
                Step {position.step.number} of {position.totalSteps}
              </SheetDescription>
            </SheetHeader>
            <JourneySteps onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
      <div aria-hidden="true" className="flex gap-1">
        {onboardingJourneySteps.map((step) => {
          const state = getJourneyStepState({
            currentStepKey: stage,
            stepKey: step.key,
          })

          return (
            <i
              className={`h-1 flex-1 rounded ${
                state === "complete"
                  ? "bg-[#71D98B]"
                  : state === "current"
                    ? "bg-white"
                    : "bg-white/18"
              }`}
              key={step.key}
            />
          )
        })}
      </div>
    </div>
  )
}
