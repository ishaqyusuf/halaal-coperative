"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useHotkeys } from "react-hotkeys-hook"

interface UseTableScrollOptions {
  scrollAmount?: number
  useColumnWidths?: boolean
  startFromColumn?: number
}

export function useTableScroll(options: UseTableScrollOptions = {}) {
  const {
    scrollAmount = 120,
    useColumnWidths = false,
    startFromColumn = 0,
  } = options
  const containerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [isScrollable, setIsScrollable] = useState(false)
  const currentColumnIndex = useRef(startFromColumn)
  const isScrollingProgrammatically = useRef(false)
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const getColumnPositions = useCallback(() => {
    const container = containerRef.current
    if (!container) return []

    const table = container.querySelector("table")
    if (!table) return []

    const headerRow = table.querySelector("thead tr")
    if (!headerRow) return []

    const columns = Array.from(headerRow.querySelectorAll("th"))
    const positions: number[] = []
    let currentPosition = 0

    for (const column of columns) {
      positions.push(currentPosition)
      currentPosition += (column as HTMLElement).offsetWidth
    }

    return positions
  }, [])

  const syncColumnIndex = useCallback(() => {
    const container = containerRef.current
    if (!container || !useColumnWidths || isScrollingProgrammatically.current) {
      return
    }

    const allColumnPositions = getColumnPositions()
    if (allColumnPositions.length === 0) return

    const currentScrollLeft = container.scrollLeft
    const maxScrollLeft = container.scrollWidth - container.clientWidth

    if (currentScrollLeft <= 10) {
      currentColumnIndex.current = startFromColumn
      return
    }

    if (currentScrollLeft >= maxScrollLeft - 10) {
      currentColumnIndex.current = allColumnPositions.length - 1
      return
    }

    let accumulatedDistance = 0
    let detectedColumn = startFromColumn

    for (let i = startFromColumn; i < allColumnPositions.length - 1; i++) {
      const columnStart = allColumnPositions[i] ?? 0
      const columnEnd = allColumnPositions[i + 1] ?? 0
      const columnWidth = columnEnd - columnStart
      const nextDistance = accumulatedDistance + columnWidth

      if (
        Math.abs(currentScrollLeft - accumulatedDistance) <=
        Math.abs(currentScrollLeft - nextDistance)
      ) {
        detectedColumn = i
        break
      }

      accumulatedDistance = nextDistance
      detectedColumn = i + 1
    }

    currentColumnIndex.current = Math.max(
      startFromColumn,
      Math.min(detectedColumn, allColumnPositions.length - 1)
    )
  }, [useColumnWidths, startFromColumn, getColumnPositions])

  const checkScrollability = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const { scrollWidth, clientWidth } = container
    const isScrollableTable = scrollWidth > clientWidth

    if (useColumnWidths) {
      syncColumnIndex()

      const allColumnPositions = getColumnPositions()
      const maxColumnIndex = allColumnPositions.length - 1

      const newCanScrollLeft =
        currentColumnIndex.current > startFromColumn ||
        container.scrollLeft > 10
      const newCanScrollRight = currentColumnIndex.current < maxColumnIndex

      setIsScrollable(isScrollableTable)
      setCanScrollLeft(newCanScrollLeft)
      setCanScrollRight(newCanScrollRight)
    } else {
      const { scrollLeft } = container
      setIsScrollable(isScrollableTable)
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1)
    }
  }, [useColumnWidths, startFromColumn, getColumnPositions, syncColumnIndex])

  const scrollLeft = useCallback(
    (smooth = true) => {
      const container = containerRef.current
      if (!container) return

      if (useColumnWidths) {
        const allColumnPositions = getColumnPositions()
        if (allColumnPositions.length === 0) return

        if (
          currentColumnIndex.current <= startFromColumn &&
          container.scrollLeft <= 0
        ) {
          return
        }

        if (
          currentColumnIndex.current <= startFromColumn &&
          container.scrollLeft > 0
        ) {
          isScrollingProgrammatically.current = true
          container.scrollTo({
            left: 0,
            behavior: "smooth",
          })

          setTimeout(() => {
            isScrollingProgrammatically.current = false
            syncColumnIndex()
            checkScrollability()
          }, 500)
          return
        }

        const originalColumnIndex = currentColumnIndex.current
        currentColumnIndex.current -= 1

        const currentScrollLeft = container.scrollLeft
        const maxScrollLeft = container.scrollWidth - container.clientWidth

        let targetScrollLeft: number

        if (Math.abs(currentScrollLeft - maxScrollLeft) < 10) {
          const lastColumnStart = allColumnPositions[originalColumnIndex] ?? 0
          const lastColumnEnd =
            allColumnPositions[originalColumnIndex + 1] ??
            lastColumnStart + 150
          const lastColumnWidth = lastColumnEnd - lastColumnStart

          targetScrollLeft = Math.max(0, currentScrollLeft - lastColumnWidth)
        } else {
          targetScrollLeft = 0
          for (let i = startFromColumn; i < currentColumnIndex.current; i++) {
            const columnStart = allColumnPositions[i] ?? 0
            const columnEnd = allColumnPositions[i + 1] ?? 0
            targetScrollLeft += columnEnd - columnStart
          }
        }

        isScrollingProgrammatically.current = true

        container.scrollTo({
          left: targetScrollLeft,
          behavior: "smooth",
        })

        setTimeout(() => {
          isScrollingProgrammatically.current = false
          syncColumnIndex()
          checkScrollability()
        }, 500)
      } else {
        container.scrollBy({
          left: -scrollAmount,
          behavior: smooth ? "smooth" : "auto",
        })
      }
    },
    [
      scrollAmount,
      useColumnWidths,
      startFromColumn,
      getColumnPositions,
      syncColumnIndex,
      checkScrollability,
    ]
  )

  const scrollRight = useCallback(
    (smooth = true) => {
      const container = containerRef.current
      if (!container) return

      if (useColumnWidths) {
        const allColumnPositions = getColumnPositions()
        if (allColumnPositions.length === 0) return
        const maxColumnIndex = allColumnPositions.length - 1

        if (currentColumnIndex.current >= maxColumnIndex) {
          return
        }

        currentColumnIndex.current += 1
        isScrollingProgrammatically.current = true

        if (currentColumnIndex.current === maxColumnIndex) {
          container.scrollTo({
            left: container.scrollWidth - container.clientWidth,
            behavior: "smooth",
          })
        } else {
          let targetScrollLeft = 0
          for (let i = startFromColumn; i < currentColumnIndex.current; i++) {
            const columnStart = allColumnPositions[i] ?? 0
            const columnEnd = allColumnPositions[i + 1] ?? 0
            targetScrollLeft += columnEnd - columnStart
          }

          container.scrollTo({
            left: targetScrollLeft,
            behavior: "smooth",
          })
        }

        setTimeout(() => {
          isScrollingProgrammatically.current = false
          syncColumnIndex()
          checkScrollability()
        }, 500)
      } else {
        container.scrollBy({
          left: scrollAmount,
          behavior: smooth ? "smooth" : "auto",
        })
      }
    },
    [
      scrollAmount,
      useColumnWidths,
      startFromColumn,
      getColumnPositions,
      syncColumnIndex,
      checkScrollability,
    ]
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    currentColumnIndex.current = startFromColumn
    checkScrollability()

    const handleScroll = () => {
      if (isScrollingProgrammatically.current) return

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }

      scrollTimeoutRef.current = setTimeout(() => {
        checkScrollability()
      }, 100)
    }

    const handleResize = () => {
      currentColumnIndex.current = startFromColumn
      checkScrollability()
    }

    container.addEventListener("scroll", handleScroll)
    window.addEventListener("resize", handleResize)

    const resizeObserver = new ResizeObserver(() => {
      currentColumnIndex.current = startFromColumn
      checkScrollability()
    })

    resizeObserver.observe(container)

    return () => {
      container.removeEventListener("scroll", handleScroll)
      window.removeEventListener("resize", handleResize)
      resizeObserver.disconnect()

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [checkScrollability, startFromColumn])

  useHotkeys(
    "ArrowLeft, ArrowRight",
    (event) => {
      if (event.key === "ArrowLeft" && canScrollLeft) {
        scrollLeft()
      }
      if (event.key === "ArrowRight" && canScrollRight) {
        scrollRight()
      }
    },
    {
      enabled: isScrollable,
      preventDefault: true,
    }
  )

  return {
    containerRef,
    canScrollLeft,
    canScrollRight,
    isScrollable,
    scrollLeft,
    scrollRight,
  }
}
