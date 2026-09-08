# Storage hardening evidence context

Analysis: hardening_final. Source scan: 360e089f-a106-44df-b1f1-f6a370934968.
Source root: C:/Users/sale2/Desktop/OpenAI Workspace/OpenDepartment.
Authoritative context loaded from get_codex_security_scan_context. Target revision: ebe4fabb10b4ab8eb5dcc6eed4ede372f76a0c80; git HEAD matches. Scope: entire repository.
The scan is running and unsealed. Current worktree has authorized fixes, so sourceDrift=present. The original baseline review read the affected original source before mutation; the canonical quota finding retains its exact excerpts. The proposal separately reopens the current upload, quota, Storage policy and cleanup boundaries. It does not call current source the original affected snapshot.

## Inventory

| ID | Evidence title | Input | Identity / status |
| --- | --- | --- | --- |
| SCAN | Canonical scan manifest and threat model | scan-manifest.json in parent scan directory | SHA256 df6bcd46a4a24999d89446c16b821856ae3fab9d501209fce40efaef8dc658e9; observed pre-seal digest |
| FINDINGS | Canonical findings | findings.json in parent scan directory | SHA256 9a71580b6de5b2741d1dc5b482a2c31a384d586bd3777bdede6b3548a9e2df93; observed pre-seal digest |
| COVERAGE | Canonical partial coverage | coverage.json in parent scan directory | SHA256 a3a4797477e491de1d9d8a2efd39ac55730e86678fb858664d2b62ec5b9ce6df; partial draft, root owns final coverage |
| storage-quota-bypass | Members bypass configured storage quota through direct uploads | Canonical finding ruleId and identity anchor members-can-bypass-the-configured-storage-quota-through-direct-uploads | Full finding read; medium/high confidence; no hosted exploit executed |
| SQL-CURRENT | Current quota, upload policy and cleanup function | db/tenant-schema.sql | SHA256 b8549837a19e341c41aa3f89813ac3552b08b78f2536584c6e3bbd5eff7deb64 |
| UPLOAD-CURRENT | Current upload and metadata retry path | src/components/dept/UploadForm.tsx | SHA256 5dd57d2b2a4004d1b1e0789e149e9bd57df3999cf7b4f91f68002b1b6f7645e3 |
| CLEANUP-CURRENT | Current administrator cleanup and purge recheck | src/components/admin/AdminStorage.tsx | SHA256 d3e2ab4f4b7017b2fd1bafd2b2e36e69919fd257439ebb3f3c76ca3674baba0c |
| CLEANUP-TEST | Local cleanup age/reference regressions | db/test/04-tenant-security-regressions.sql | SHA256 e57dfd91772ab064f83308632285b79282c28f09e71739b6baba7f786d970d7d |

Canonical documents may change during completion; these digests identify inspected inputs, not a seal. No separate detailed finding writeup was present in the scan directory inventory. Its canonical codeEvidence was read directly. No production Supabase project, Storage server internals, object bytes or account secrets were contacted. PGlite verifies SQL behavior, not the hosted upload/delete protocol.

## Completed local evidence

Before the one-hour condition, the regression reported that a recent unreferenced upload was offered for cleanup. After the change, 148 tenant and 52 control assertions passed, including old unreferenced object inclusion and recent/referenced object exclusion. This is a result for the SQL shim. It does not establish quota enforcement or atomic object deletion. The seed smoke is unrelated to the proposed quota boundary.

## Source drift

Current SQL has authentication and insert-column fences plus private founder bootstrap; none adds an aggregate check to Storage insertion. Current UploadForm preserves uncertain metadata writes and retries the same storage path. Current AdminStorage applies an hour grace and repeats the orphan query before deletion. Those are improvements relative to the canonical snapshot, but an active member can still call Storage directly and leave objects outside metadata accounting. Listing and deleting remain separate operations.

