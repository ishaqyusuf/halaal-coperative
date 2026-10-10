# ADR — Never substitute sample financial data on member home

Date: 28 September 2026
Status: Accepted in source; signed-device review remains open.

## Context

The native member home previously showed sample naira balances, a 72% readiness score, service shortcuts and “Updated just now” whenever its account query had no result. Disabled Plans and Shares reads likewise showed sample rows such as “No arrears” and “120 units held.” A failed or disabled read could therefore appear to be a verified member position.

## Decision

Member home presents financial metrics, readiness and available services only from a returned member-home response. Without that response, it shows an explicit unavailable/loading state and no numerical position or service shortcuts. Query errors provide a retry action. A returned stale cache remains visible with its existing stale-data banner; a returned response is described as available rather than claiming it was updated just now. Disabled Plans and Shares reads show explicit unavailable states. The unused static mobile template holding those sample account facts is removed. The same rule applies to staff repayment summaries: an absent workspace must not be formatted as zero outstanding or labelled live data.

## Consequences

These screens cannot fill a temporary gap with invented balances, readiness, arrears or share holdings. A member may temporarily lose shortcuts until the authoritative read succeeds, while normal navigation and statement access remain available. Local presentation tests and mobile contracts pass; signed-device error, cache and accessibility review remain required.
