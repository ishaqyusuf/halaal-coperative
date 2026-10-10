# Native environment launcher icon families

Date: 2026-10-01
Status: Accepted by owner instruction to implement the saved direction

## Decision

Use the approved 22 September canonical HalaalVest artwork with green Production,
blue Preview and red Development identities. Commit the exported PNGs in the app
and select dedicated files for every environment in Expo config. Preview must not
reuse Production artwork. Android adaptive foregrounds preserve transparency with
matching solid background colors; iOS light/dark and generic launcher assets are
opaque. Preserve the existing splash and stable application identities.

## Consequences

Native icon changes require regenerated native resources and new installed builds.
OTA updates do not replace home-screen icons. Config resolution and asset checks
protect against shared environment files and invalid platform image formats.
The design folder remains provenance and review material, not a build dependency.
See [the feature record](../features/mobile-launcher-icons.md).
