---
description: Preview and, after approval, apply a reviewed AgenticLab payload refresh in this workspace
argument-hint: "<path to the payload to install>"
---

# AgenticLab `/refresh-payload` Workflow

**Status:** Opt-in refresh workflow. Registration makes it available; it does not run on its own. Invoking `/refresh-payload <payload-dir>` is the explicit request to start a preview, not approval to change files.

## Purpose and boundary

Bring this workspace's installed `AgenticLab/` runtime files from an older payload revision to a newer one **without** touching project-owned material or overwriting local edits.

Owned by the payload revision: `AGENTS.md`, `README.md`, `brain/`, `adapters/pi/` (excluding `tests/`), `prompts/`, and `config/knowledge-capture-policy.template.json`.

Never touched by a refresh: `.pi/`, `AgenticLab/PROJECT-SCOPE.md`, `AgenticLab/PROJECT-OVERVIEW.md`, `AgenticLab/config/knowledge-capture-policy.json`, `AgenticLab/knowledge/` (`INDEX.md`, `records/`, `maps/`, checkpoints), `AgenticLab/knowledge-pending/`, `AgenticLab/implementation-logs/`, `AgenticLab/helpers/`, and `AgenticLab/SOURCE-REVISION.json` itself.

This workflow does not install, reset, roll back, delete obsolete paths, or change global Pi configuration.

## 1. Deterministic preview

Run the comparison tool — do not diff files by hand:

```text
node AgenticLab/adapters/pi/payload-refresh-cli.mjs --payload <payload-dir>
```

If this workspace's payload predates the refresh tool, the script is not in the installed tree. In that case run the copy that ships with the payload you are installing, and pass the workspace explicitly:

```text
node <payload-dir>/adapters/pi/payload-refresh-cli.mjs --payload <payload-dir> --cwd <workspace-root>
```

Read its JSON result:

- `status: "unrecorded"` — this workspace predates refresh support. Stop and report; recording a baseline needs explicit approval, because it would declare the current tree canonical.
- `status: "noop"` — same revision and no changed files. Report and stop.
- `status: "changes"` — show the counts and the `added`, `replaced`, and `obsolete` lists.
- `status: "conflict"` — stop. List every path in `conflicts`. A conflict means the installed file no longer matches its recorded hash, so it was edited locally or the tree is not the recorded revision.

## 2. Interpret results honestly

- `added`: present in the payload, absent here. Will be created.
- `replaced`: differs from the installed copy and matches the recorded base. Safe to overwrite.
- `unchanged`: identical. No action.
- `obsolete`: installed but absent from the payload. **Report only.** Do not delete; removal is a separate approved operation.
- `conflicts`: local divergence. Never overwrite. Ask the user to resolve each path — keep the local version, accept the payload version, or defer the whole refresh.

If any file under the never-touched list appears in the output, treat it as a tool defect and stop.

## 3. One approval gate

Present the complete preview: the installed revision, the incoming revision, the counts, the explicit `added`/`replaced` lists, the `obsolete` list, and any conflicts. Then ask once:

> Approve applying this refresh — replacing the listed payload-owned files and recording the new revision? Project scope, project overview, `.pi/` wiring, knowledge, pending candidates, and implementation logs stay untouched. Obsolete paths are reported, not deleted.

Do not apply anything before that approval. Do not ask a second question for the revision update: recording the new revision is part of the approved operation.

## 4. Apply, then verify

After approval, in this order:

1. Replace exactly the approved `replaced` paths and create exactly the approved `added` paths from the payload directory.
2. Verify each written file is byte-identical to its payload source.
3. Record the new revision:

```text
node <payload-dir>/adapters/pi/payload-refresh-cli.mjs --payload <payload-dir> --record --revision <incoming-revision> --cwd <workspace-root>
```

4. Re-run the preview. It must report `status: "noop"`. If it does not, stop and report the discrepancy rather than recording again.

## 5. Report

State: previous revision, new revision, files added, files replaced, files unchanged, obsolete paths left in place, conflicts encountered, and whether a fresh Pi process is required to load changed adapters or prompts. Do not claim the refresh is complete if verification or revision recording failed.

## Failure handling

- Comparison tool unavailable, or the payload path is missing: stop; do not substitute a manual copy.
- A replacement fails midway: stop, report exactly which files were written, and do not update the revision.
- Approval, trust, or the confirmation UI is unavailable: report the limitation and stop. Never record a revision that was not verified.
- Never write to `.pi/`, project scope/overview, knowledge, pending candidates, or implementation logs as part of this workflow.
