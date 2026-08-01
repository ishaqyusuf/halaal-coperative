"use client"

import { usePathname } from "next/navigation"
import { type RefObject, useEffect, useRef } from "react"

export const HEADER_OFFSET_VAR = "--header-offset"
export const HEADER_TRANSITION_VAR = "--header-transition"

const HEADER_HEIGHT = 70
const HEADER_SETTLE_DURATION = 240

interface UseScrollHeaderOptions {
  extraOffset?: number
  lockBodyScroll?: boolean
  revealOnScrollUp?: boolean
}

export function getNextHeaderHiddenState({
  currentlyHidden,
  currentScrollTop,
  previousScrollTop,
  revealOnScrollUp,
}: {
  currentlyHidden: boolean
  currentScrollTop: number
  previousScrollTop: number
  revealOnScrollUp: boolean
}) {
  if (currentScrollTop <= 0) {
    return false
  }

  if (!revealOnScrollUp) {
    return true
  }

  if (currentScrollTop > previousScrollTop) {
    return true
  }

  if (currentScrollTop < previousScrollTop) {
    return false
  }

  return currentlyHidden
}

export function shouldPreserveHeaderDuringLayoutClamp({
  clientHeight,
  currentScrollTop,
  currentlyHidden,
  guardActive,
  previousScrollTop,
  revealOnScrollUp,
  scrollHeight,
}: {
  clientHeight: number
  currentScrollTop: number
  currentlyHidden: boolean
  guardActive: boolean
  previousScrollTop: number
  revealOnScrollUp: boolean
  scrollHeight: number
}) {
  return (
    revealOnScrollUp &&
    currentlyHidden &&
    guardActive &&
    currentScrollTop < previousScrollTop &&
    scrollHeight > clientHeight + 1
  )
}

export function useScrollHeader(
  scrollRef?: RefObject<HTMLElement | null>,
  options?: UseScrollHeaderOptions
) {
  const {
    extraOffset = 0,
    lockBodyScroll = true,
    revealOnScrollUp = false,
  } = options ?? {}
  const prevHiddenRef = useRef(false)
  const previousScrollTopRef = useRef(0)
  const directionGuardUntilRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const hasScrolledRef = useRef(false)
  const pathname = usePathname()
  const prevPathnameRef = useRef(pathname)

  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname
      prevHiddenRef.current = false
      previousScrollTopRef.current = 0
      directionGuardUntilRef.current = 0
      hasScrolledRef.current = false
      document.documentElement.style.setProperty(HEADER_OFFSET_VAR, "0px")
      document.body.style.overflow = ""
    }
  }, [pathname])

  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }

      rafRef.current = requestAnimationFrame(() => {
        if (!hasScrolledRef.current) {
          hasScrolledRef.current = true
          document.documentElement.style.setProperty(
            HEADER_TRANSITION_VAR,
            "200ms"
          )
        }

        const scrollTop = scrollRef?.current
          ? scrollRef.current.scrollTop
          : window.scrollY || document.documentElement.scrollTop
        const scrollHeight =
          scrollRef?.current?.scrollHeight ??
          document.documentElement.scrollHeight
        const clientHeight =
          scrollRef?.current?.clientHeight ?? window.innerHeight

        const isLayoutClamp = shouldPreserveHeaderDuringLayoutClamp({
          clientHeight,
          currentScrollTop: scrollTop,
          currentlyHidden: prevHiddenRef.current,
          guardActive: Date.now() < directionGuardUntilRef.current,
          previousScrollTop: previousScrollTopRef.current,
          revealOnScrollUp,
          scrollHeight,
        })
        const shouldHide = isLayoutClamp
          ? true
          : getNextHeaderHiddenState({
              currentlyHidden: prevHiddenRef.current,
              currentScrollTop: scrollTop,
              previousScrollTop: previousScrollTopRef.current,
              revealOnScrollUp,
            })
        previousScrollTopRef.current = scrollTop

        if (shouldHide !== prevHiddenRef.current) {
          prevHiddenRef.current = shouldHide
          directionGuardUntilRef.current = Date.now() + HEADER_SETTLE_DURATION
          const totalOffset = HEADER_HEIGHT + extraOffset
          document.documentElement.style.setProperty(
            HEADER_OFFSET_VAR,
            shouldHide ? `${totalOffset}px` : "0px"
          )
          document.body.style.overflow =
            lockBodyScroll && shouldHide ? "hidden" : ""
        }

        rafRef.current = null
      })
    }

    const scrollElement = scrollRef?.current ?? window

    scrollElement.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      scrollElement.removeEventListener("scroll", handleScroll)

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }

      hasScrolledRef.current = false
      previousScrollTopRef.current = 0
      directionGuardUntilRef.current = 0

      document.documentElement.style.setProperty(HEADER_TRANSITION_VAR, "0s")
      document.documentElement.style.setProperty(HEADER_OFFSET_VAR, "0px")
      document.body.style.overflow = ""
    }
  }, [scrollRef, extraOffset, lockBodyScroll, revealOnScrollUp])
}
