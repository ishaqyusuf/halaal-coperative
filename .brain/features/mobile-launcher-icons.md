# Mobile launcher icons

## Source implementation — 1 October 2026

The owner-approved 22 September HalaalVest environment family is integrated
into the main checkout. Production keeps the canonical green mark on off-white
(`#F7FAF7`), Preview uses cobalt blue on pale blue (`#EAF2FF`), and Development
uses signal red on warm cream (`#FFF1CC`). The canonical mark geometry is retained.

`apps/mobile/app.config.ts` selects dedicated launcher, iOS light/dark and Android
adaptive foreground PNGs in `apps/mobile/assets/icons`. Production retains the
unprefixed filenames, Development uses `dev-`, and Preview uses `preview-`.
Launcher/iOS artwork is opaque 1024×1024 RGB; adaptive foregrounds are transparent
1024×1024 RGBA over config-owned solid backgrounds. Splash behavior is unchanged.

The approved source/export comparison is saved at
`~/.gstack/projects/ishaqyusuf-halaal-coperative/designs/mobile-environment-icons-20260922/`.
Runtime/build files are copied into the repository, so releases do not depend on
that local design folder. No image generation or geometry redraw was performed.

`scripts/mobile-expo-config.test.ts` resolves Node Expo config for all three native
identities and verifies paths, dimensions, opacity/alpha, Android background colors
and distinct hashes. Managed EAS builds exclude local native trees and generate
resources from Expo configuration; existing local native trees must be regenerated
for the intended variant before building. Installed icons require a new native
build. An OTA update alone cannot deliver these native launcher resources.

Validation and native-install status are recorded in `.brain/progress.md`.
See [the integration decision](../decisions/ADR-20261001-mobile-environment-launcher-icons.md).
