# Security Hardening Review: OpenDepartment

## Evidence Basis

We have one architectural opportunity: make the tenant's storage allocation and object lifetime share an enforcement boundary. The canonical finding, **Members can bypass the configured storage quota through direct uploads**, traces a direct member upload that never reaches the metadata quota trigger. I inspected that finding and reopened the current SQL, upload and cleanup paths.

The scan targets revision `ebe4fabb10b4ab8eb5dcc6eed4ede372f76a0c80`. Its artifacts are unsealed drafts. The current worktree contains authorized fixes, including upload retry recovery and cleanup grace/revalidation; this proposal identifies that drift and preserves those protections. Local SQL tests pass, but no hosted Supabase upload protocol or performance experiment was run. The [evidence context](context.md) records input hashes and limits.

## Constraints

We assume a balanced profile: preserve tenant ownership, private downloads, modest operation costs and the platform's absence of a standing tenant administrator key. We have no latency, memory or operating-budget target. A tenant may configure unlimited storage; finite quotas must describe what is actually enforced. We should not install an untested trigger into Supabase-managed Storage tables.

## Opportunity Portfolio

| Opportunity | Evidence | Options | Recommendation | Proposal |
| --- | --- | --- | --- | --- |
| Own storage admission and object lifetime together | Direct-upload quota bypass; separate metadata writes; cleanup age/recheck regression | **Option 1:** retain metadata accounting and strengthen recovery. **Option 2:** tenant-owned admission, reservations and bounded upload gateway. | Validate Option 2 in an isolated hosted project before adoption; keep Option 1 protections meanwhile. | [Storage admission and lifecycle](proposals/storage-admission-lifecycle.md) |

The options are different ownership choices. Option 1 preserves direct browser uploads and accepts a soft aggregate allowance. Option 2 makes the component authorizing bytes also reserve capacity and own eventual cleanup; it requires a tenant-side service and a deliberate migration.

## Recommendation Summary

I recommend Option 2 if a finite per-member quota must withstand a malicious admitted member. We cannot obtain that property by improving the browser's estimate or retry logic alone. The gateway must independently limit incoming bytes, and direct Storage writes must be denied; reservations without those conditions only move the same bypass.

Option 1 is proportionate when operators knowingly accept a soft allowance for a trusted small group. It has lower operating cost and the current fixes improve recovery, but we should not describe it as fixing the canonical quota finding. The major decision is whether strict tenant resource isolation justifies deploying and operating a tenant-owned gateway and cleanup worker.

## Next Decisions

We can choose a hosted prototype of Option 2, retain Option 1 with an explicit soft-quota contract, or refine the operating constraints first. Before production adoption, we need evidence for streamed byte limits, retries, concurrent reservation accounting, direct-write denial and crash recovery. No architectural change is implemented by this proposal. The [structured analysis](hardening.json) and [full proposal](proposals/storage-admission-lifecycle.md) contain the tradeoffs, acceptance conditions and rollback posture.

