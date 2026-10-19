# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-10-19

### Added

- Multi-tenant document archives with a separate Supabase project per department, direct browser-to-storage uploads, and independent platform and department accounts.
- Department registration, a public directory, unlisted archives, reserved slugs, and a three-department limit per operator account.
- A manual setup wizard with personalised SQL, project validation, email configuration guidance, and pinned departments through `STATIC_DEPARTMENTS`.
- Invite links with usage limits, expiry, revocation, and optional administrator rights; administrators can also enable joining without an invite. (#1)
- A member vault, exhibit viewers, voting, case notes, subjects, classifications, and document reporting.
- Administration tools for members, invites, files, reports, subjects, audit records, and editable department branding and settings. (#1)
- Password recovery for department members and platform operators, plus a member account page for password changes and leaving a department. (#1, #12, #13)
- English and German interfaces, localised legal documents, search metadata, canonical links, share cards, robots rules, and a sitemap.
- Public department terms, privacy notices, and imprints, a platform imprint, and a cookie notice linked to the relevant privacy notice. (#2, #3, #12)
- Optional Supabase OAuth setup that creates and configures a project while retaining the manual setup path. (#4)
- Per-member storage quotas, storage usage reporting, and administrator cleanup of orphaned objects. (#4)
- Platform abuse reporting and a staff-only queue for reviewing complaints and suspending or restoring department listings. (#4, #12)
- Confirmed department erasure, directory removal, and optional Supabase project deletion, with explicit instructions when project deletion cannot be completed. (#9)
- Tenant schema version tracking, administrator upgrade notices, and SQL copy/download controls for updating existing departments. (#12)
- Indexed vault search with prefix matching, subject filtering, browser-generated image thumbnails, and audit-log CSV export. (#12)
- A subject register with document counts, previous/next exhibit navigation following the vault order, and printable case files. (#15)
- Editing details of a member's own submissions, upload percentages, batches of up to ten files, and clipboard image uploads. (#15)
- Self-hosted Supabase support for pinned departments and the control plane, plus a system-aware light/dark theme switch. (#16)
- A click-to-load DEEPSUB itch.io widget that makes no third-party request until activated. (#17)
- Portable SQL security assertions, schema reapplication checks, component regression tests, demo-seed smoke tests, and CI checks. (#2, #11)

### Changed

- Reworked the interface with shared colour tokens, responsive layouts, clearer keyboard focus, accessible administration tabs, loading states, and route-specific error pages. (#1)
- Modernised the records-office design, navigation, exhibit layout, and landing page; added a remembered grid/list preference for the vault. (#16)
- Upgraded to Next.js 16 and its Node.js proxy convention, with route-type generation included in typechecking. (#14)
- Preserved setup drafts and vault filters across navigation and reloads, and made interrupted uploads resumable without duplicating already-filed documents. (#4, #11, #15)
- Added automatic vault pagination while retaining the manual load-more button and explicit retries after failures. (#15)
- Made the storage bucket follow the configured upload limit and measured filed object sizes from storage metadata where permissions allow; unfiled objects remain outside quota accounting. (#2, #12)
- Clarified public contact details, discoverable unlisted addresses, retained PDF/video metadata, and administration lists that have reached their display limits. (#12)
- Updated administration member email addresses after confirmed account email changes and added an operator action to refresh directory branding. (#2, #12)

### Fixed

- Corrected the operator sign-in form, completed password-reset routes, fixed password confirmation with visible passwords, and limited department sign-out to the current browser session. (#1, #13)
- Fixed mobile horizontal overflow, iOS form zoom, media layout shifts, and date hydration mismatches outside UTC. (#1, #13)
- Repaired report submission, prevented stale filter responses from replacing newer results, and retained loaded vault cards after pagination failures. (#1, #11, #13)
- Corrected Supabase OAuth scope requests and project-creation parameters; surfaced callback failures, expired tokens, refused operations, and signed-out setup attempts with actionable messages. (#5, #6, #7, #10)
- Stopped setup retries from repeatedly resuming a project that no longer exists. (#8)
- Restored Chromium PDF previews using validated PDF bytes and a Blob viewer, with retry controls for failed previews. (#11, #13)
- Corrected storage cleanup after leaving a department and when deleting reported exhibits, including thumbnails; deletion reports reflect objects actually removed. (#13, #15)
- Stopped moderation and settings actions from reporting success when database policies affected no rows, and repaired session refresh propagation and pinned-only authentication flows. (#1, #11)
- Corrected share metadata, visibility-dependent legal-page indexing, and self-hosted console errors from unavailable Vercel Analytics scripts. (#1, #13, #16)

### Security

- Restricted column grants and privileged database operations to prevent member self-promotion, ban reversal, forged file counters, and operator bypasses of suspension or registration limits. (#1, #2, #11)
- Enforced active-member checks for administrators, voting, deletion, and profile updates; protected the last active administrator against concurrent removal. (#2, #4, #11, #12)
- Protected department founding with a single-use secret verifier, isolated browser clients by authentication realm and project, and validated local callback destinations. (#11)
- Bound each Supabase project to one department to prevent mirrored listings and suspension bypasses; rejected service-role keys in database constraints as well as setup validation. (#4, #12)
- Added nonce-based Content Security Policy and security headers, authenticated and rate-limited setup probing, and constrained registered project origins to prevent SSRF. (#2, #4)
- Sealed setup OAuth tokens in short-lived, scoped HTTP-only cookies and bound them to their purpose, operator account, and absolute expiry. (#4, #11)
- Constrained storage paths and accepted file types, stripped supported image metadata before upload, and shortened signed exhibit links to ten minutes. (#2, #4, #12)
- Deduplicated document and comment reports, bounded and throttled platform abuse submissions, and protected moderation privileges against caller-controlled fields. (#1, #4, #11, #13)
- Blocked active-content exhibit rendering, neutralised spreadsheet formulas in audit exports, and kept unexpected authentication errors out of visitor-facing messages. (#12, #13)

### Removed

- Removed the automatically loaded Ko-fi widget script in favour of a plain support link. (#12)
- Removed the unused `departments.verified_at` field, which did not represent an actual verification. (#12)

[Unreleased]: https://github.com/levisager11-oss/opendepartment/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/levisager11-oss/opendepartment/releases/tag/v0.1.0
