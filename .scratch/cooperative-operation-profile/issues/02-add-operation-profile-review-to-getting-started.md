# 02 - Add Operation Profile Review To Getting Started

**What to build:** New workspaces answer "How does this cooperative operate?" during Getting Started, save service choices, and cannot be considered setup-ready until the Operation Profile has been reviewed.

**Blocked by:** 01 - Persist Tenant Operation Profile Defaults.

**Status:** done

- [x] Getting Started includes an Operation Profile step after setup mode and before detailed finance setup.
- [x] The step presents service choices in plain cooperative language rather than technical feature-toggle language.
- [x] Admins can set commitment collection style, payment receipt access, procurement access, Foodstuff Purchase access, collection-source usage, and support availability.
- [x] Service-specific configuration is progressively revealed only when the relevant service is enabled.
- [x] Setup readiness reflects whether the Operation Profile has been reviewed.
- [x] The Getting Started behavior is covered by loader/action tests or equivalent page-level tests.
