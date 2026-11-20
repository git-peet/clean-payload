---
description: Execute an approved plan within its stated scope and verify the result
argument-hint: "[approved plan or task context]"
---

# AgenticLab `/implement` Workflow

**Status:** Opt-in implementation workflow. Run only after explicit invocation with an approved plan; registration makes it available but does not execute it.

## Purpose and authority

Execute an approved plan, not re-plan it. Invocation of this workflow with an approved plan explicitly authorizes changes listed in that plan and no others. A read-only boundary used only for initial orientation does not prohibit these approved changes. A scope boundary explicitly marked as permanent still applies; if it conflicts with the plan, stop and ask. This workflow does not authorize unrelated edits, protected-data access, external actions, or scope expansion. If the approved plan is absent, stale, or materially contradicted by current source, stop and ask.

The workflow may use only the task's authorized project scope and tools. Run only checks listed in the approved checkpoint's self-contained validation entries with status `planned`; do not run `blocked` or `not applicable` entries. Use each planned entry's exact command, working directory, environment, prerequisites, and side effects. Never place secret values in commands or logs; do not read `.env` to fill a missing value. Do not infer missing details or expand validation—pause if the approved entry is insufficient. Do not access `.env`, production databases, or other protected data unless the user explicitly authorizes that exact scope.

## User-supplied task context

${@:-Use the approved plan already present in this conversation. If no approved plan and scope are present, ask for them and do not edit.}

### Minimal context selection

Before proceeding, confirm the smallest sufficient context for this implementation: (1) user request/objective/authorization, (2) approved plan/checkpoint (already established), (3) project knowledge via INDEX/MOC route → scoped record metadata/status → eligible evidence only (on demand, when task could benefit and scope/status pass), (4) current source/tests/docs for present-tense behavior (on demand). Apply the stop rule: assemble what is needed for the next decision or action; stop when sufficient to proceed and verify. If insufficient, retrieve relevant evidence or ask a focused clarification. When project knowledge could materially improve the next decision, call `readKnowledgeRecords` once per distinct topic/query before source inspection, passing scope/category filters when explicitly established. If project knowledge is not relevant, skip retrieval and make no no-match claim. Only a complete `no_match`/`not_found` result supports a no-match claim. After context assembly, invoke the context-selection metric recorder (`recordContextSelectionMetric`) to emit content-free context-selection events (`context_source_used`, `context_stop_rule_triggered`, `context_assembly_complete`) per the knowledge-capture metrics policy. Record the sources used and stop-rule status; keep data content-free (source-layer names, booleans, outcome strings only). Use a domain perspective only when materially useful; include project orientation when fresh-session guidance requires it or it materially helps. Carry a task-local handoff only when a meaningful finding exists. Do not load all layers by default.

### Plan checkpoint (transient)

Before inspection, use Pi's `read` tool to read `AgenticLab/knowledge/checkpoints/plan-checkpoint.json` at workspace root. If present and its `task` matches the current invocation, treat its contents as the approved plan. Do not use shell/bash commands to check for this file — the gate blocks shell access to project knowledge. If missing, stale, or mismatched, ask the user for the approved plan and do not edit. If the checkpoint contains `handoff_candidates`, treat them as transient proposals from the approved `/plan` session, not as active records. Verify each candidate's claim/evidence against current source after the required `readKnowledgeRecords` call, then deduplicate against active knowledge and pending metadata. The workspace capture policy—not the checkpoint alone—controls whether eligible candidates may be staged; promotion always requires explicit adapter confirmation. Do not treat pending candidates as active evidence. For task-local proposals, use status `candidate`; set scope exactly to the approved checkpoint's root scope when it matches the configured policy. Never guess scope from workspace name/title/path; stop on mismatch. Use `source.kind` from `file`, `conversation`, `artifact`, or `user-decision` to match actual provenance.

### Automatic candidate staging and explicit promotion

A workspace policy with `pendingStagingEnabled: true`, approved during initialization or through the dedicated opt-in command, is the workspace-level authorization for staging; do not ask whether to stage each candidate. After implementation and validation outcomes are known, consider task-local handoffs and newly discovered findings. Stage only a candidate that is reusable beyond this task, supported by inspected source or an explicit user decision, within the approved project scope, not duplicated by an active or pending candidate, and free of secrets, raw transcripts/logs, customer data, and unnecessary personal data. Do not stage general AgenticLab payload policies or workflow behavior as target-project knowledge unless the confirmed scope explicitly includes AgenticLab development. Do not stage routine status, one-off implementation details, or unverified failures.

If `pendingStagingEnabled` is `true`, confirm through a complete, topic-relevant `readKnowledgeRecords` result that no equivalent active record exists and inspect pending metadata for duplicates; reuse complete relevant searches already performed. If retrieval is incomplete or unavailable, leave that finding task-local. Then call `triageKnowledgeCandidates` and `stageKnowledgeCandidates` only for eligible, non-duplicate findings. If `pendingStagingEnabled` is `false`, keep findings task-local without asking whether to enable staging. A user may explicitly opt in later with `knowledge-opt-in`; do not change policy directly. If no candidate qualifies, do not call the triage or staging tools and do not prompt.

Staged candidates remain inactive in `knowledge-pending`. For each candidate staged by this run, call `promoteKnowledgeCandidate` to present its action summary and explicit UI confirmation as the promotion review; do not add a separate chat disposition prompt. Promotion is never automatic. If the user declines or UI confirmation is unavailable, leave the candidate pending and report that result. Do not review or alter unrelated pending candidates unless the approved plan explicitly includes that work.

### Completion report

After the checkpoint disposition and standard implementation log are complete, report clearly:
- **Implementation complete**: The approved plan's changes have been applied (or verified already present).
- **Validation**: Exact focused tests/checks run and their results; state anything blocked or not run.
- **Knowledge disposition**: Counts and IDs staged to `knowledge-pending`, promoted to active knowledge, left pending, or left task-local; if none, say no eligible candidates were found. Always check the approved checkpoint for `handoff_candidates`; summarize relevant IDs and outcomes without dumping checkpoint JSON.
- **Implementation log**: The standard log path and whether it was written or appended; note any write failure.
- **Metrics**: Relevant content-free event types/count changes, interpreted alongside tool outcomes; do not treat event counts alone as proof of complete retrieval.
- **Checkpoint disposition**: Whether retained for `/premortem` or deleted after explicit approval.

Do not delete `AgenticLab/knowledge/checkpoints/plan-checkpoint.json` during this workflow. Deletion requires explicit user approval after implementation completion.

### Verify staged candidate outcomes

After staging and the promotion review, verify only the candidate IDs created by this run using pending-candidate metadata. Do not enumerate or review unrelated pending candidates. If promotion is declined, leave the candidate pending. Do not promote, reject, or discard any candidate without the corresponding adapter action preview and explicit UI confirmation. Do not persist raw queries or candidate contents in metrics or implementation logs.

### User approval gate — checkpoint deletion

After implementation validation and candidate promotion review, ask the user to choose one checkpoint disposition:

> A) Keep `plan-checkpoint.json` for `/premortem` reference.
> B) I am not planning to run `/premortem`; I authorize deleting `plan-checkpoint.json`.

Do not infer the choice. Keep the checkpoint unchanged until the user answers. Delete it only after explicit B; retain it after A. Then write the standard implementation log and provide the completion report.

### Standard implementation log

The approved plan includes `AgenticLab/implementation-logs/<workspace-key>/<task-slug>/implementation-log.md` in its implementation scope. After the checkpoint disposition is resolved, always write or append a concise log for this `/implement` run without a separate approval prompt; the explicit `/implement` invocation authorizes this planned output. Record changed paths, validation commands/results or why validation was blocked, knowledge disposition, and checkpoint disposition. Never include secrets, raw transcripts, customer data, or raw candidate contents. If a log already exists, append a dated run section and preserve prior history; do not overwrite it. If the approved log path is unavailable or a safe append cannot be performed, stop and report the problem rather than asking for a second approval.
