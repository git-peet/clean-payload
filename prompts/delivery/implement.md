---
description: Execute an approved plan within its stated scope and verify the result
argument-hint: "[approved plan or task context]"
---

# V5 `/implement` Workflow — First Prototype

**Status:** Prompt prototype for design/testing; an initialized Pi workspace registers this template as opt-in `/implement`. Registration does not auto-run it; a separate user invocation with an approved plan is required.

## Purpose and authority

Execute an approved plan, not re-plan it. Invocation of this workflow with an approved plan explicitly authorizes changes listed in that plan and no others. It does not authorize unrelated edits, protected-data access, external actions, or scope expansion. If the approved plan is absent, stale, or materially contradicted by current source, stop and ask.

The workflow may use only the task's authorized project scope and tools. Tests or commands must be named in the approved validation plan and confirmed safe for the selected environment. Do not access `.env`, production databases, or other protected data unless the user explicitly authorizes that exact scope.

## User-supplied task context

${@:-Use the approved plan already present in this conversation. If no approved plan and scope are present, ask for them and do not edit.}

### Plan checkpoint (transient)

Before inspection, use Pi's `read` tool to read `AgenticLab/knowledge/checkpoints/plan-checkpoint.json` at workspace root. If present and its `task` matches the current invocation, treat its contents as the approved plan. Do not use shell/bash commands to check for this file — the gate blocks shell access to project knowledge. If missing, stale, or mismatched, ask the user for the approved plan and do not edit. If the checkpoint contains a `handoff_candidates` array, treat those items as transient proposals from the approved `/plan` session. For each item, verify its claim/evidence against current source after the required `readKnowledgeRecords` call, then deduplicate against active knowledge and pending candidate metadata. Do not treat a pending candidate as active evidence. When converting a task-local `proposed` handoff for triage, use lifecycle status `candidate`; set its `scope` exactly to the approved checkpoint's root `scope` if that matches the configured workspace policy scope. Do not derive or guess scope from the workspace name, title, or directory; if the scopes disagree, stop and report the mismatch. `source.kind` must be one of `file`, `conversation`, `artifact`, or `user-decision`, chosen to reflect the actual provenance. If approved implementation scope explicitly includes staging and workspace opt-in is enabled, use `triageKnowledgeCandidates` and `stageKnowledgeCandidates` for supported, non-duplicate candidates; staging leaves them inactive in `knowledge-pending`. If staging is outside the implementation scope, do not stage it as part of the implementation. Instead, at the end-of-implementation review, offer a separate, explicit post-task staging choice for the task-local handoff. That authorization covers only staging the identified candidate; it does not amend the code scope or change the checkpoint. If the user declines, keep the candidate task-local. If staging is disabled or unavailable, keep the finding task-local and report that it was not persisted. Staging is not promotion; durable activation requires the separate end-of-implementation disposition flow below. If no handoff candidates are present, do not invent or stage one.

### Completion report

At the end of this workflow, report clearly:
- **Implementation complete**: The approved plan's changes have been applied (or verified already present).
- **Validation**: Exact focused tests/checks run and their results; state anything blocked or not run.
- **Knowledge disposition**: Counts and IDs staged to `knowledge-pending`, promoted to active knowledge, rejected/discarded, or left pending; if none, say no candidates were proposed or relevant. Always check `AgenticLab/knowledge/checkpoints/plan-checkpoint.json` for `handoff_candidates`—never infer silently.
- **Metrics**: Relevant content-free event types/count changes, interpreted alongside tool outcomes; do not treat event counts alone as proof of complete retrieval.
- **Checkpoint disposition**: Whether retained for `/premortem` or deleted after explicit approval.

Do not delete `AgenticLab/knowledge/checkpoints/plan-checkpoint.json` during this workflow. Deletion requires explicit user approval after implementation completion.

### End-of-implementation knowledge review and disposition

Run this review after implementation validation and before the completion report when the approved checkpoint contains handoff candidates, this implementation staged candidates, or a relevant existing pending candidate was identified during work. If none applies, skip the review; do not create ceremony for an empty queue.

1. Call `listPendingKnowledgeCandidates` to inventory metadata in the configured scope. Never read, grep, edit, or delete `knowledge-pending/` files directly.
2. Restrict full review to candidates linked to this task or materially relevant to its outcome. For a task-local handoff not yet pending, use its checkpoint content; call `readKnowledgeRecords` to check active-record overlap and use pending metadata to check for a duplicate. If staging was excluded from the approved implementation scope, show the candidate and ask whether the user authorizes a separate post-task staging action. This is not a PBI scope amendment and does not require another plan or checkpoint. If declined, leave it task-local. If approved and workspace staging opt-in is enabled, use `triageKnowledgeCandidates` and `stageKnowledgeCandidates` for that candidate only. Then use `previewPendingKnowledgeCandidate` for non-mutating full-content review. If retrieval is incomplete/unavailable, report that limitation and do not bypass it.
3. Present a concise disposition table with candidate ID, claim, scope, evidence/provenance, duplicate/active-record check, and a recommendation: `promote`, `reject/discard`, or `keep pending`. A recommendation is not authorization. If the evidence is insufficient or the candidate is a duplicate, recommend keeping pending or rejecting it; never promote merely to empty the queue.
4. Ask the user to select a disposition. Do not invoke `promoteKnowledgeCandidate` or `rejectPendingKnowledgeCandidate` just to inspect or recommend. Only after the user explicitly chooses an action, call the matching tool for that one candidate. Review its complete action preview and require its explicit UI confirmation; the chat choice authorizes the action but does not replace the UI confirmation. Declining leaves the candidate pending.
5. After each confirmed action, verify its result and relist pending metadata. For promotion, call `readKnowledgeRecords` by the promoted ID and confirm the active body/provenance are retrievable. For rejection, confirm only the selected candidate left pending and no active record was created. Stop on unexpected state or scope change.
6. INDEX/MOC updates are not automatic consequences of promotion. Propose them separately only when a genuine navigation relationship changes, and require separate approval.

This is an autonomous review/orchestration step, not autonomous activation: the agent gathers evidence and recommends dispositions; the user chooses; the existing per-action confirmation gate protects each durable write or discard. Do not persist raw queries or candidate contents in metrics/logs.

### User approval gate — checkpoint deletion

After reporting completion, confirm with the user:

> A) Are you planning to run /premortem? If so, plan-checkpoint.json will be kept for premortem reference.
> B) Not planning to run /premortem? plan-checkpoint.json will be deleted.

Only proceed with deletion if the user explicitly confirms option B.

### Implementation-log auto-trigger

After implementation completes and checkpoint disposition is handled, the workflow will automatically request user approval to write the implementation-log:

1. Implementation completes successfully (or verification confirms existing implementation is complete)
2. Checkpoint disposition is resolved (kept for premortem reference, or deleted)
3. The workflow automatically generates the implementation-log summary based on:
   - Files changed during this implementation
   - Tests run (if any) and metrics outcomes (`no_match` counts, `candidate_staged` events, etc.)
   - Candidate disposition summary: staged to `knowledge-pending`, promoted to active, rejected/discarded, left pending, or none detected
   - Plan-checkpoint disposition (kept for premortem reference or deleted)
4. The workflow then asks the user:
   > "Implementation complete. Do you approve writing the implementation-log?"
   > [Yes/No]
5. If the user approves:
   - The implementation-log is written to `AgenticLab/implementation-logs/<workspace-key>/<pbi-id-slug>/implementation-log.md` directly from the `/implement` session state with user approval
   - No snapshot file is written or consumed — the log is written directly
   - The workflow completes successfully
6. If the user declines:
   - No implementation-log is written
   - The workflow completes successfully without writing the log
   - The implementation remains complete and verified

**Note:** This is an automated process with an explicit user approval gate. No additional prompts are required beyond this single approval step.
