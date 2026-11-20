---
description: "Initialize AgenticLab in this workspace once: confirm scope, orient the project, and prepare local Pi wiring."
argument-hint: "[optional project or subproject focus]"
---

# First-use Workspace Initialization

This is a one-time, user-invoked setup flow. It is not a session-start action and must never run automatically on later Pi starts. The user starts it by asking the agent to read and follow this file from the workspace root. During approved setup, `.pi/settings.json` registers this prompt as `/initialize-workspace` and the delivery prompts as `/plan`, `/implement`, and `/premortem`; registration makes them available but does not run them.

## Outcomes and invariants

Initialization may prepare:

1. A user-confirmed `AgenticLab/PROJECT-SCOPE.md`.
2. A concise, source-cited `AgenticLab/PROJECT-OVERVIEW.md` for the confirmed scope.
3. Project-local `.pi/settings.json` and `.pi/APPEND_SYSTEM.md`.
4. A knowledge index and empty directory scaffolding where absent.
5. `AgenticLab/config/knowledge-capture-policy.json` rendered from the payload template.

The initialization request is **not** approval to write. Show one complete preview and obtain explicit approval in a later user message before writing anything. After approval, write only the exact paths and contents shown in that preview.

During initialization:

- Do not run application commands, scripts, tests, migrations, or builds.
- Do not install dependencies, access the network, start services, or access databases.
- Do not read `.env` contents, secrets, protected data, backups, customer/production data, installed dependency trees, or generated output. Relevant manifests may be read after scope confirmation.
- Do not run or emit metrics during initialization. Do not create or modify host-application paths, active records, candidates, checkpoints, metrics, populated MOCs, Graphify/semantic/symbol indexes, or DIGEST files.
- Do not use shell for broad project discovery.
- Candidate staging and metrics default to enabled. The user may explicitly opt out of either during initialization.

## Interaction contract

Initialization has three distinct states; never combine them:

1. **Scope clarification:** If required scope is missing or ambiguous, ask one concise question containing only the missing details and end the turn. Output only that question—no preview, no “Approve these setup changes?” text, and no write instructions. A scope reply supplies context only; it is not approval.
2. **Preview:** Once scope is complete, perform read-only preparation and present the complete preview. End with exactly one question: “Approve these setup changes?” Then stop. Do not call `write`, `edit`, `mkdir`, `touch`, or any mutating shell command in the preview turn.
3. **Apply:** Write only after a later user message explicitly approves that complete preview. A scope answer, correction request, silence, or approval of an earlier preview does not authorize writes. If the preview needs correction, return to Preview and wait again.

Do not send interim scope recaps, progress reports, or phase narration. If a genuine ambiguity or blocker remains, ask only the focused question needed to resolve it.

## Preflight

Read the required AgenticLab instructions and contracts:

- `AgenticLab/AGENTS.md`
- `AgenticLab/brain/operating-contract.md`
- `AgenticLab/brain/knowledge-contract.md`
- `AgenticLab/config/knowledge-capture-policy.template.json`

If a required file is missing, malformed, or indicates an unknown/partial payload, report the problem and stop. Do not invent replacement rules or search for other contract filenames.

Check only these known initialization paths:

- `AgenticLab/PROJECT-SCOPE.md`
- `AgenticLab/PROJECT-OVERVIEW.md`
- `AgenticLab/knowledge/INDEX.md` — existence only before scope confirmation; inspect its routing only after scope confirmation if needed
- `AgenticLab/knowledge/records/` — existence only; never inspect record contents
- `AgenticLab/knowledge/maps/` — existence only
- `AgenticLab/knowledge/MOC-template.md` — existence only
- `AgenticLab/config/knowledge-capture-policy.json` — existence only before scope confirmation; inspect bounded fields only after scope confirmation
- `.pi/settings.json` and `.pi/APPEND_SYSTEM.md` — existence before scope confirmation; read their contents only after scope confirmation when needed to preserve/merge them

Use exact-path reads or existence checks only. If shell is the only way to check a listed path, a direct `test -e <that-exact-path>` check is allowed. Do not use `ls`, `find`, globs, or recursive listings during preflight. Do not inspect any other workspace or payload paths here. In particular, do not check adapter or delivery-prompt wiring targets until after scope confirmation, during setup preparation.

Classify the state:

- **Payload only:** none of the workspace-owned outputs (scope, overview, index, records directory, policy, or local Pi wiring) exist. Payload-provided `maps/` or `MOC-template.md` may already exist; these do not by themselves mean the workspace is initialized.
- **Partially initialized:** some workspace-owned outputs exist, but the required set is incomplete. Preserve them and prepare only safe, additive changes. If scope or policy conflicts with the confirmed identity/key, stop and report the conflict.
- **Already initialized:** scope, overview, index, records directory, policy, local Pi wiring, maps directory, and MOC template are all present. Do not rescan or overwrite them. Report completion and offer a separately requested, source-bounded refresh only if the user asks.
- If an overview already exists, do not repeat project orientation unless the user explicitly requests a refresh. If only additive scaffold items are missing, prepare that scaffold only.

If `AgenticLab/` is absent, stop. This prompt must be read from an AgenticLab payload.

## Scope gate

If `AgenticLab/PROJECT-SCOPE.md` exists, read it and ask only about missing or conflicting scope. Preserve the existing scope unless the user explicitly approves a change.

If no scope file exists, use scope details the user explicitly supplied in the initialization request. Ask **one concise question containing only still-missing items**:

- Project identity/name; do not infer it from the directory name.
- Stable key for `project:<key>`. A key may be suggested from the user-confirmed project name, but never inferred from the workspace directory name; ask the user to confirm a suggestion.
- Included application, repository, or subproject(s).
- Temporary orientation exclusions (paths/data not to read).
- Permanent exclusions, or “None.”

Candidate staging and metrics remain enabled by default; mention that the user may opt out of either, but do not make either a required question. Explain that staging may save eligible candidates as inactive pending records; it does not promote them, and promotion remains separately confirmed.

If the user has already supplied enough information, use it and proceed without an acknowledgement or confirmation. Ask one focused clarification only if an ambiguity prevents safe orientation.

**Hard stop:** If required scope information is missing or ambiguous, ask the question and end the turn immediately. Until the user replies, do not read or list any further workspace or payload paths, check wiring targets, run shell commands, or prepare the preview. Do not narrate internal analysis or make additional tool calls after asking; wait for the user.

**Closed scope:** The user-confirmed included areas are fixed for this initialization. Discovering adjacent packages or applications does not add them to scope or authorize reading them. Shared root configuration may be read only when it directly supports an included area; it does not add sibling packages to scope. If an adjacent area seems necessary, ask before inspecting it and stop until the user replies. Omission from this run is not a permanent exclusion. Record only durable exclusions the user explicitly confirmed.

`PROJECT-SCOPE.md` is project context, not a permission matrix. It records only confirmed project identity, included areas, and explicit permanent exclusions. Do not put temporary read limits, task permissions, or workflow rules in it.

Use the user's confirmed project identity verbatim; do not expand it with inferred technical details. In `PROJECT-SCOPE.md`, list only the user-confirmed application/repository/subproject names and paths under `Included project scope`. A name such as “FastAPI demo application” is identity only; it does not authorize extra stack, architecture, or test claims. Put verified technical details in `PROJECT-OVERVIEW.md`.

Use the actual workspace root path supplied by the runtime, or a stable workspace name. Do not persist generic text such as “current workspace.” Use this compact structure for a new scope file:

```markdown
# Project Scope

- **Project:** [user-confirmed identity]
- **Stable project key:** [confirmed key]
- **Knowledge scope:** project:[confirmed key]
- **Workspace root:** [actual workspace root path or stable workspace name]

## Included project scope
[Only the applications, repositories, or subprojects the user confirmed.]

## Permanent exclusions
[Only explicit, durable exclusions; otherwise “None specified.”]
```

## Orientation

Begin source inspection only after scope is confirmed. Read a few relevant in-scope documents, manifests, and entry points to create a compact navigation profile. Do not recursively inventory the repository or inspect unrelated packages or scripts. Do not read excluded/protected files, run commands, install dependencies, start services, run migrations, or run tests.

Initialization does not assess build/test commands, test-fixture isolation, or runtime side effects. The overview may point to project documentation, but should say those details were not assessed; `/plan` verifies only what its task needs. Distinguish user-provided identity/scope from source-derived facts. List only existing files actually read to support overview claims.

## Prepare the profile and setup changes

Prepare only the following outputs as needed. Preserve existing content unless the user approves a specific update.

### Project overview

Prepare `AgenticLab/PROJECT-OVERVIEW.md` as a compact navigation aid, not an exhaustive inventory. Separate user-provided identity/scope from a few source-supported facts about stack, layout, and entry points. List only existing files actually read that support those facts in `Sources`; do not list directories, directory listings, path-only identifications, user-provided facts, or files this preview will create. Build/test commands and their safety are not assessed during initialization; say so and leave those details to a relevant `/plan`. Do not include unconfirmed adjacent applications/packages, turn temporary orientation limits into permanent project rules, or add unrelated PBI/history details.

### Local Pi wiring

Prepare `.pi/settings.json` by preserving existing keys and adding only missing AgenticLab entries without duplicates:

```json
{
  "extensions": ["../AgenticLab/adapters/pi/knowledge-write-gate.ts"],
  "prompts": [
    "../AgenticLab/prompts/system/initialize-workspace.md",
    "../AgenticLab/prompts/delivery/plan.md",
    "../AgenticLab/prompts/delivery/implement.md",
    "../AgenticLab/prompts/delivery/premortem.md"
  ]
}
```

If existing values are invalid or conflict, stop and show the conflict instead of replacing them. Before previewing this wiring, verify existence only for the exact registered targets: `AgenticLab/adapters/pi/knowledge-write-gate.ts` and the four listed prompt files. If any target is missing, stop and report the incomplete payload; do not inspect unrelated adapter or prompt files.

Prepare `.pi/APPEND_SYSTEM.md` by preserving existing host content and adding the following AgenticLab block only if an equivalent block is not already present; do not duplicate it:

```markdown
For work in this workspace, read and follow `AgenticLab/AGENTS.md`.
Read `AgenticLab/PROJECT-SCOPE.md` before consequential work and stay within its boundaries.
If `AgenticLab/PROJECT-OVERVIEW.md` exists, read it once as fresh-session orientation; verify relevant facts against current source.
Do not create or modify a workspace-root `AGENTS.md` for AgenticLab.

**Knowledge retrieval trigger:** Before source inspection for design rationale, decision context, or reusable patterns:
1. Read `AgenticLab/knowledge/INDEX.md` as the stable workspace router when present; use it to identify scope, collections, and curated topic maps. Do not expect an exhaustive record list or duplicated trigger-term list.
2. **Always** call `readKnowledgeRecords` before source inspection for each distinct topic, sub-question, or query — use an exact record `id` when known, otherwise a query. If the task establishes an explicit subproject scope or requests a category, pass the optional `scope` or `category` filter. The adapter inventories and filters active records recursively before returning selected bodies plus available source/evidence metadata. Do not use generic file reads to retrieve record bodies.
3. Only after the tool responds should you verify claims against current source. Treat `filtered`, `incomplete`, `unavailable`, and `no_knowledge_store` distinctly; only a complete `no_match`/`not_found` result supports a no-match claim. If there is a complete no-match, proceed to source inspection.

**Write gate note:** Knowledge changes use the dedicated adapter lifecycle. `/plan` is read-only for application source; its final preview includes the exact transient checkpoint, including task-local handoff candidates, and user approval authorizes that one write. The write gate exempts only the exact `AgenticLab/knowledge/checkpoints/plan-checkpoint.json` path to avoid a redundant second confirmation; no other knowledge write is covered by plan approval. When the workspace policy enables pending staging, `/implement` may automatically stage only eligible, source-supported candidates as inactive pending records. Staging never authorizes promotion; promotion or rejection requires the dedicated adapter review and explicit UI confirmation. No host application paths are created during initialization.
```

Project `.pi` resources require project trust and a fresh trusted Pi process. Do not modify global Pi settings or host-root instructions.

### Knowledge scaffold

- If `AgenticLab/knowledge/INDEX.md` is absent, prepare a scope-aware router identifying `records/` as the canonical destination for active/promoted project records only. Pending candidates are inactive and separate from `records/`; never describe them as stored in that collection. Explain recursive active-record retrieval, including legacy root-level records during migration; state that a complete eligible-corpus scan—not map membership—is required for a no-match claim; and describe maps as optional navigation aids. Do not add transient active-record counts/status such as “no active records yet”: the INDEX is a durable router. It may state that initialization does not seed or promote records, but do not infer that the full eligible corpus is empty solely because `records/` is absent.
- If `AgenticLab/knowledge/INDEX.md` exists, preserve it. After scope confirmation, inspect only enough routing content to verify its scope is consistent; if it conflicts or is materially misleading, stop and show the conflict rather than replacing it.
- If `AgenticLab/knowledge/records/` is absent, prepare an empty directory with a zero-byte `.gitkeep`. If it exists, preserve it without inspecting record contents.
- If `AgenticLab/knowledge/maps/` exists, preserve the directory and its contents; do not add a `.gitkeep` inside it. If the directory is absent, prepare it with a zero-byte `.gitkeep`.
- If `AgenticLab/knowledge/MOC-template.md` exists, preserve it. If absent, prepare a minimal blank template consistent with `AgenticLab/brain/knowledge-contract.md`.
- Do not create or copy active records, candidates, checkpoints, metrics, populated MOCs, or user notes.

### Capture policy

Render `AgenticLab/config/knowledge-capture-policy.json` from `AgenticLab/config/knowledge-capture-policy.template.json`. The generic template supplies defaults but has no workspace identity fields. In the rendered policy, always add `"project": "<confirmed-key>"` and `"scope": "project:<confirmed-key>"`; do not omit them, because the adapter otherwise falls back to its pilot scope. Preserve `schemaVersion: 1`, use `pendingStagingEnabled: true` and `metricsEnabled: true` unless the user explicitly opted out of either, and keep project-specific triggers empty. Metrics are aggregate and content-free; initialization emits none. If the template is missing, invalid, or unsafe, stop rather than inventing a policy. Preserve an existing policy; after scope confirmation, verify its project/scope match the confirmed key and stop if they conflict or are missing.

## Preview and approval

Before presenting the preview, verify that:

- Every application/package in `PROJECT-SCOPE.md` is within the user-confirmed scope; a whole-repository confirmation includes its subprojects, but discovering a sibling does not expand a narrower scope. The scope file contains names/paths and durable exclusions, not source-derived stack or test details.
- No adjacent discovery expanded scope or became a permanent exclusion.
- The overview separates user-provided identity/scope from source-supported facts, cites only existing files actually read, and leaves build/test commands and safety unassessed for task-specific `/plan` work.
- The path inventory is based on exact-path existence checks: each path has one consistent action (Create only if absent, Preserve if existing, Update only when explicitly approved). A Preserve row for a directory covers its existing contents; do not list its children as separate actions. For every Create, show a `### <path>` heading followed by the exact full contents; a summary is not a substitute. Show exact diffs for Updates, and ensure counts and summary match the inventory. If any Create lacks full contents, the preview is incomplete: do not ask for approval.
- Existing maps, MOC templates, records, and unrelated `.pi` settings are preserved.
- The policy contains `project` equal to the confirmed key and `scope` equal to `project:<key>`, plus staging and metrics enabled unless explicitly opted out, and no unapproved triggers. Explain that staging saves only eligible candidates as inactive pending records; promotion is separately confirmed.
- The preview contains only the setup paths listed in the preparation section; no other path is proposed.
- No host-application path, active record, candidate, checkpoint, metric, or populated MOC is proposed.

Show one complete preview. End with exactly one short question:

**“Approve these setup changes?”**

Then stop. Do not write anything before explicit approval of that complete preview in a later user message. Answers to scope questions, optional preferences, silence, or review of a preview are not write approval. If the user requests a correction, do not write; you may make exact-path, read-only checks within the already-confirmed included areas when needed to correct the preview. Do not inspect excluded/protected data or widen project scope. If a required source is outside the confirmed scope, ask before reading it. If scope changes, the old preview is invalid and a new preview is required.

## Apply and finish

After approval, write only the exact approved paths and contents. Preserve all other files. If a write fails or conflicts, stop and report which approved writes succeeded; do not broaden the change set.

Verify only the approved writes. Do not run the application, tests, scripts, or a general smoke test. Report created, updated, and preserved paths, and tell the user that a fresh trusted Pi process is required to load the local settings. Do not rerun initialization automatically.

If initialization is interrupted, resume from the last completed step. If the scope question is unanswered, remain stopped; do not continue inspection.

## Later use

Ordinary sessions do not rerun this prompt. They use the confirmed scope and compact overview; task-specific persistent records are retrieved through the AgenticLab knowledge interface. A later explicit initialization or refresh requires a source-bounded preview and approval before any updates. If staging is disabled, it may later be enabled with `pi "knowledge-opt-in"` in the Pi runtime (adapter command, not a CLI subcommand); never run it from shell.
