---
description: Transient phase artifact that passes an approved plan from /plan to /implement
argument-hint: "[PBI/task identifier]"
---

# Plan Checkpoint — Transient Phase Artifact

Purpose: Carry an approved plan across `/plan` and `/implement` without relying only on conversation context.

Location: `AgenticLab/knowledge/checkpoints/plan-checkpoint.json` at the workspace root.

Lifecycle: `/plan` creates it only after explicit user approval. `/implement` reads it at start and retains it by default. At completion, the user explicitly chooses whether to keep it for `/premortem` or approve its deletion. It is workflow state, not durable project knowledge, and is not retrieved by `readKnowledgeRecords`. This single approved checkpoint write is an explicit `/plan` exception to read-only source inspection; it does not authorize application edits or other writes.

Schema:
```json
{
  "phase": "plan",
  "status": "approved",
  "task": "Example bounded task",
  "approvedAt": "YYYY-MM-DD",
  "scope": "project:confirmed-workspace-key",
  "summary": "Concise approved outcome.",
  "inScope": ["path/to/approved/source", "path/to/approved/test"],
  "outOfScope": ["database access", "unrelated application paths"],
  "validation": ["<purpose>; command: <exact command>; cwd: <working directory>; environment: <required variable names and non-secret values/placeholders or none>; prerequisites: <requirements>; side effects: <file/database/network effects>; status: planned|blocked|not applicable"],
  "stopConditions": ["scope contradiction", "unsafe side effect", "missing evidence"],
  "decisions": ["User-confirmed product or implementation decision"],
  "handoff_candidates": [],
  "planPath": "AgenticLab/prompts/delivery/plan.md"
}
```

Not durable knowledge. Do not store secrets, customer/cart data, raw transcripts, metrics, or pending-candidate contents in this file.

Usage in `/plan`: after the user approves the complete plan, write this checkpoint with approved scope, self-contained validation entries, stop conditions, decisions, and any task-local `handoff_candidates`. Preserve each validation check's command, working directory, required environment variable names and non-secret values/placeholders, prerequisites, side effects, and status so `/implement` does not need to rediscover them. Never store secret values. For implementation plans, include the standard implementation-log path in `inScope` so `/implement` is authorized to write it as a planned output.

Usage in `/implement`: read this exact path at start; require approved status and matching task. If missing, stale, or mismatched, ask the user for the approved plan and do not edit.

Usage in `/premortem`: read it to establish task and scope. Keep it until the user explicitly approves deletion after the premortem review; do not delete it automatically.
