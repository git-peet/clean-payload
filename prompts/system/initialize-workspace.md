---
description: "Initialize AgenticLab in this workspace once: confirm scope, orient the codebase, and prepare local Pi wiring."
argument-hint: "[optional project or subproject focus]"
---

# First-use Workspace Initialization

This is a one-time, user-invoked setup and orientation flow for the current workspace. It is not a normal session-start action and must never run automatically on later Pi starts.

The user may invoke this file before project `.pi/` settings exist by asking Pi to read and follow `AgenticLab/prompts/system/initialize-workspace.md`. The initial invocation does not depend on a registered slash command. During approved setup, project-local Pi settings register this template as `/initialize-workspace` for explicit future refreshes and the AgenticLab payload's delivery prompts as `/plan`, `/implement`, and `/premortem`. Registration makes those workflows available; it does not run them.

## Purpose and boundaries

Prepare five distinct things:

1. **Project scope** — user-confirmed project/subproject identity and boundaries in `AgenticLab/PROJECT-SCOPE.md`.
2. **AgenticLab/Pi integration** — project-local `.pi/settings.json` and `.pi/APPEND_SYSTEM.md`; never create or edit a workspace-root `AGENTS.md` or global Pi configuration.
3. **Project orientation profile** — a concise, source-cited `AgenticLab/PROJECT-OVERVIEW.md`, separate from both scope and durable knowledge records.
4. **Knowledge navigation scaffold** — a stable `AgenticLab/knowledge/INDEX.md` router and an empty `AgenticLab/knowledge/records/` destination when absent. This is structure only; it does not seed, promote, or synthesize records.
5. **Workspace capture policy** — `AgenticLab/config/knowledge-capture-policy.json`, rendered from the generic template with the confirmed stable project key and the user's explicit metrics choice; staging starts disabled and project-specific triggers are empty.

This flow does not install or refresh the AgenticLab payload, run the application/tests, seed or promote AgenticLab knowledge records, import V4 knowledge, or build Graphify, semantic maps, symbol indexes, MOCs, or a DIGEST. It does not create or update files in the host application's paths. Do not access `.env`, secrets, protected `data/`, backups, production/customer data, dependencies, generated output, databases, or the network unless a separate task explicitly authorizes an exact path/action. Do not use shell for project discovery by default.

The user explicitly invoked setup, but that is **not** blanket approval for file writes. Inspect and orient only after scope is confirmed. Ask required configuration choices (including an explicit yes/no metrics choice) before the final preview. Show all proposed persistent changes together, then wait for one explicit approval before writing any of them. If the user rejects or edits the preview, apply nothing until a revised complete preview is accepted.

## Step 0 — Load the applicable AgenticLab contracts

Read, if present:

- `AgenticLab/AGENTS.md`
- `AgenticLab/brain/operating-contract.md`
- `AgenticLab/brain/knowledge-contract.md`
- `AgenticLab/knowledge/INDEX.md` (if present)
- `AgenticLab/config/knowledge-capture-policy.template.json` (if present)
- `AgenticLab/config/knowledge-capture-policy.json` (if present)
- `AgenticLab/PROJECT-SCOPE.md`

The first three files are part of the dropped AgenticLab payload. Do not assume Pi discovered them automatically: the workspace may not have `.pi/APPEND_SYSTEM.md` yet. If a required AgenticLab contract file is missing or appears to be a partial/unknown payload, report that and stop rather than inventing its rules. The generic policy template is required for first-use policy creation; if it is missing, malformed, or has unsafe defaults, stop rather than inventing a replacement.

## Step 1 — Inspect only known setup paths

Inspect only these paths to determine whether initialization is new, partial, or already complete:

- `AgenticLab/AGENTS.md`
- `AgenticLab/PROJECT-SCOPE.md`
- `AgenticLab/PROJECT-OVERVIEW.md`
- `AgenticLab/knowledge/INDEX.md`
- `AgenticLab/knowledge/records/` (existence only; do not inspect record bodies)
- `AgenticLab/config/knowledge-capture-policy.template.json`
- `AgenticLab/config/knowledge-capture-policy.json` (existence and bounded config only; preserve if present)
- `.pi/settings.json`
- `.pi/APPEND_SYSTEM.md`

Do not list or inspect host application files during this setup preflight. Do not create, replace, move, or scaffold generic workspace-root paths such as `src/`, `tests/`, `package.json`, or a root `AGENTS.md`.

Classify the state:

- **Payload only:** AgenticLab exists but scope/profile/local Pi wiring are absent or incomplete. This is the normal first-run case.
- **Partially initialized:** one or more target-owned setup files already exist. Preserve them; identify only the missing pieces and conflicts.
- **Already initialized:** scope, overview, project-local Pi wiring, knowledge navigation scaffold, and workspace capture policy exist. Do not rescan or overwrite. Report that initialization appears complete; offer a separately requested, source-bounded refresh only if the user asks.
- If scope/overview exist but the knowledge index or records directory is absent, treat the workspace as **partially initialized** for additive scaffold creation only. Do not repeat project orientation.
- If `AgenticLab/config/knowledge-capture-policy.json` already exists, preserve it. Verify its `project` and `scope` agree with the confirmed stable key; if it is malformed or conflicts with the scope, stop and report the conflict rather than replacing or rewriting it.

If `AgenticLab/` is absent, stop: this prompt must be explicitly read from an AgenticLab payload. Do not infer or report the payload's development origin as part of the consuming project's orientation.

## Step 2 — Confirm project identity and scope before source inspection

If `PROJECT-SCOPE.md` exists, read it and ask only focused questions about missing or conflicting scope. Preserve existing scope text unless the user explicitly approves a change.

If it does not exist, ask for one concise response establishing:

- project name/type or the user's preferred identity;
- the stable project key used for `project:<key>` knowledge scope and capture policy; suggest a key only for explicit confirmation, and never infer it from the workspace directory name;
- which application/repository/subproject the orientation should cover;
- any paths or data that must not be read;
- whether any execution is allowed (default: **read-only inspection only; no app/tests/commands**).

A project name inferred from a folder is a suggestion, not user confirmation. Do not inspect source to infer authorization or decide which project paths are safe. If the task covers a monorepo, ask for or propose a bounded scope before scanning.

State the intended inspection boundary and exclusions back to the user. If there is unresolved ambiguity about protected data, ask before proceeding.

## Step 3 — Make a bounded read-only orientation

After scope is confirmed, inspect only sources needed to create a compact navigation profile. Prefer direct, known files and available native read-only tools. Use the confirmed scope to choose paths; do not recursively inventory the entire workspace by default.

Likely useful sources, only when within the confirmed scope:

- README/contributor/architecture documentation;
- package/workspace manifests and language/framework configuration;
- limited top-level structure for approved application paths;
- entry points named by project documentation or manifests;
- representative tests and test-runner configuration to identify layout/conventions;
- CI/build configuration only when useful to understand the project workflow.

Do not execute scripts found in manifests. Do not install dependencies, start services, run migrations, or run tests. Do not read any excluded/protected files. If you lack safe listing/search tools, ask for known paths or permission for one exact, path-limited, read-only listing command; do not substitute a broader command. If the source surface is too large for the agreed pass, stop with a partial-coverage report and offer a narrower follow-up.

For every material claim, distinguish source-verified fact from inference or unknown and retain supporting file paths. A profile is a useful map, not an exhaustive inventory or current truth for every future task.

## Step 4 — Draft the project orientation profile

Draft `AgenticLab/PROJECT-OVERVIEW.md` with only useful, verified orientation material. Suggested structure:

```markdown
# Project Overview

- **Project:** [user-confirmed identity]
- **Oriented:** [date]
- **Coverage:** [areas inspected and important exclusions]

## Stack and workspace layout
[Languages/frameworks, packages/apps, concise directory map]

## Starting points and key flows
[Important entry points and a small number of useful source paths]

## Build and test approach
[Commands/configuration found in source; explicitly mark as inspected, not run]
[Known test-isolation or safety constraints, if verified]

## Known unknowns
[Material areas not inspected or facts needing confirmation]

Do not reference `wiki/index.md` here — the knowledge-system index is `AgenticLab/knowledge/INDEX.md` and should only be referenced if durable knowledge records exist.

## Sources
[Paths supporting the summary]
```

Do not set an arbitrary token limit; make it compact enough to be read in a fresh session. Do not copy scope rules into it as authority, duplicate decision rationale from records, or populate V4 persona memories, `SYSTEM_CORE.md`, DIGEST, Graphify, symbol/semantic indexes, or experience records. If a durable non-source-derived decision is uncovered, report it separately as a candidate for the future knowledge interface; do not save it here.

## Step 5 — Prepare local Pi wiring

Prepare `.pi/settings.json` by preserving all existing keys and adding only missing AgenticLab resources:

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

When merging, preserve unrelated extensions/prompts/settings and do not duplicate the AgenticLab paths. If an existing value conflicts, is invalid, or cannot be safely merged, stop and show the conflict instead of replacing it.

Prepare `.pi/APPEND_SYSTEM.md` by preserving existing host content and adding a concise AgenticLab block equivalent to:

```markdown
For work in this workspace, read and follow `AgenticLab/AGENTS.md`.
Read `AgenticLab/PROJECT-SCOPE.md` before consequential work and stay within its boundaries.
If `AgenticLab/PROJECT-OVERVIEW.md` exists, read it once as fresh-session orientation; verify relevant facts against current source.
Do not create or modify a workspace-root `AGENTS.md` for AgenticLab.

**Knowledge retrieval trigger:** Before source inspection for design rationale, decision context, or reusable patterns:
1. Read `AgenticLab/knowledge/INDEX.md` as the stable workspace router when present; use it to identify scope, collections, and any curated topic maps. Do not expect an exhaustive record list or duplicated trigger-term list.
2. **Always** call `readKnowledgeRecords` before source inspection for each distinct topic, sub-question, or query — use an exact record `id` when known, otherwise a query. If the task establishes an explicit subproject scope or requests a category, pass the optional `scope` or `category` filter. The adapter inventories and filters active records recursively before returning selected bodies plus available source/evidence metadata. Do not use generic file reads to retrieve record bodies.
3. Only after the tool responds should you verify claims against current source. Treat `filtered`, `incomplete`, `unavailable`, and `no_knowledge_store` distinctly; only a complete `no_match`/`not_found` result supports a no-match claim. If there is a complete no-match, proceed to source inspection.

```

If either `.pi` file already contains equivalent AgenticLab guidance, leave it intact. Do not write global Pi settings/trust or host-root instruction files. Project `.pi` resources require project trust; do not claim they are active in the current process before a fresh trusted Pi process loads them.

**Write gate note:** Knowledge writes during approved `/implement` proceed via the write gate. `/plan` is strictly read-only for project source. **Exception:** The `AgenticLab/knowledge/checkpoints/plan-checkpoint.json` file may be written after explicit user approval to record the approved plan scope, validation, and decisions as a handoff artifact for `/implement`. No host application paths will be created or changed.

## Step 5a — Prepare the knowledge navigation scaffold

After project scope is confirmed, prepare the following additive scaffold:

- If `AgenticLab/knowledge/INDEX.md` is absent, propose a new stable router using the confirmed workspace scope. It must identify `records/` as the canonical destination for newly promoted project records, explain that `readKnowledgeRecords` searches the active knowledge tree recursively (including legacy root-level active records during migration), and state that a complete eligible-corpus scan—not map membership—is required for no-match.
- If `AgenticLab/knowledge/INDEX.md` already exists, preserve it. If its stated scope conflicts with the confirmed scope or its routing is materially misleading, stop and show the conflict; do not silently replace it during initialization.
- If `AgenticLab/knowledge/records/` is absent, propose an empty directory scaffold with a zero-byte `AgenticLab/knowledge/records/.gitkeep` marker so the directory survives workspace copying. If it exists, preserve its contents.
- Do not list or copy active records, pending candidates, checkpoints, metrics, or user notes into the scaffold. Do not create MOCs until a real navigation need is established. This initialization step creates routing/structure only, not durable knowledge.

## Step 6 — Present one complete initialization preview

Before constructing the final preview, obtain an explicit yes/no choice from the user: **enable privacy-minimized aggregate metrics for this workspace?** This choice is separate from permission to write. Do not infer `no` from silence or from the absence of an earlier opt-in. If the user has not answered yes or no, stop and wait without presenting a final policy preview or writing files. Set `metricsEnabled` to exactly match the explicit answer.

After that choice, and before writing anything, show one combined setup preview containing:

1. exact proposed contents/diff for a new or user-approved update to `AgenticLab/PROJECT-SCOPE.md`;
2. the complete proposed `AgenticLab/PROJECT-OVERVIEW.md`, including the inspected source paths, coverage, exclusions, and uncertainties;
3. exact creates/merges for `.pi/settings.json` and `.pi/APPEND_SYSTEM.md`;
4. if absent, the exact stable-router contents for `AgenticLab/knowledge/INDEX.md` and the creation of the empty `AgenticLab/knowledge/records/` scaffold via a zero-byte `.gitkeep`; preserve existing knowledge contents;
5. a statement that no host application files, root `AGENTS.md`, V4 knowledge, `.env`, `data/`, app/test/DB command, or global Pi configuration will be changed/accessed;
6. exact proposed `AgenticLab/config/knowledge-capture-policy.json` contents, derived from the confirmed workspace scope and the generic template. The rendered policy **must include** `"project": "<confirmed project key>"` and `"scope": "project:<confirmed project key>"`, with the same user-confirmed key in both fields; copy the remaining defaults from the template, keep pending staging off, configure no project-specific read triggers, and set metrics exactly to the user's explicit yes/no choice. Never omit either identity field or derive it from the temporary/workspace directory name. If a stable key is not confirmed or the two fields cannot be made consistent with `PROJECT-SCOPE.md`, return to Step 2 and ask before previewing.

After the metrics choice and complete preview, ask one final explicit approval question: **"Do you approve these exact AgenticLab scope/profile, knowledge-navigation scaffold, project-local `.pi`, and capture-policy setup changes?"** Do not write any of them before approval. If the user asks for changes, update the entire preview and ask again.

**Metrics:** The workspace capture policy lives at `AgenticLab/config/knowledge-capture-policy.json`; `.pi/settings.json` does not own this setting. Obtain an explicit yes/no metrics choice before rendering the final policy preview; this is not write approval. If the user has not answered, stop and wait rather than treating silence as `no`. The final preview must show `metricsEnabled` matching the answer. Events go to `.pi/metrics/agenticlab.jsonl`; no raw user content is recorded.

On approval, write only the listed setup/profile files, the approved knowledge-navigation scaffold, and the approved workspace capture policy. The capture policy may be created only as part of this first-use combined preview, before the project-local knowledge-write extension is activated. If the policy already exists, preserve it; if a loaded extension blocks creation, stop and report the conflict rather than using shell or another bypass. Do not create or modify active records, pending candidates, checkpoints, metrics, or MOCs in this workflow. The `INDEX.md` and empty `records/` directory are structural initialization artifacts, not knowledge records. If any write fails or an unexpected file conflict appears, stop and report partial completion; do not broaden the file list.

## Step 7 — Finish and activate Pi locally

Report exactly which files were created or merged and which were preserved. Tell the user to start a fresh Pi process from the workspace root and grant project trust when prompted. This restart activates the newly written `.pi` configuration; **it is not a request to read or run the initialization prompt again.** The initialization flow is now complete.

In the fresh trusted process, the project instructions should load normally. If an explicit smoke check is wanted, read `AgenticLab/PROJECT-SCOPE.md` and `AgenticLab/PROJECT-OVERVIEW.md` and report their key points; do not rescan the codebase or rerun initialization. Verify that:

- `.pi/APPEND_SYSTEM.md` instructions are active;
- the local knowledge-write extension is listed;
- `/initialize-workspace`, `/plan`, `/implement`, and `/premortem` are registered and available for explicit invocation; none was run automatically;
- `PROJECT-SCOPE.md` and the overview are directed to be read at fresh-session start;
- `AgenticLab/knowledge/INDEX.md` exists as a scope-aware router and `AgenticLab/knowledge/records/` exists as an empty canonical destination unless preexisting content was preserved;
- `AgenticLab/config/knowledge-capture-policy.json` exists with `project` equal to the confirmed stable project key and `scope` equal to `project:<key>` in `PROJECT-SCOPE.md`, staging disabled, no unapproved project-specific triggers, and the user's metrics choice;
- no active knowledge record or host application path was created or changed.

If `PROJECT-OVERVIEW.md` was just created, a bounded fresh-session read check verifies availability, not general delivery benefit.

## Later use

Ordinary sessions do not rerun this prompt. They read the confirmed scope and compact overview; task-specific persistent records remain selectively retrieved through the distinct AgenticLab knowledge interface. A later explicit `/initialize-workspace` invocation must detect the existing profile and stop unless the user specifically asks for a refresh. A refresh must show a source-bounded diff and require approval before updating setup/profile files.