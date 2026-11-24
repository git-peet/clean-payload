import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Refresh policy for an installed AgenticLab payload.
 *
 * The installed workspace records the payload revision it was initialized from
 * plus a sha256 manifest of every managed file. That manifest is what makes a
 * refresh safe offline: a file that no longer matches its recorded hash is a
 * local edit (a conflict), not stale payload to overwrite.
 */

export const REVISION_RELATIVE_PATH = path.join("AgenticLab", "SOURCE-REVISION.json");

const MANAGED_FILES = ["AGENTS.md", "README.md"];
const MANAGED_PREFIXES = ["brain/", "adapters/pi/", "prompts/", "config/"];
const UNMANAGED_PREFIXES = [
  "adapters/pi/tests/",
  "knowledge/records/",
  "knowledge/maps/",
  "knowledge/checkpoints/",
  "knowledge-pending/",
  "implementation-logs/",
  "helpers/",
];
// The generic template is payload-owned; the rendered policy beside it is
// workspace-owned and must never be refreshed over.
const UNMANAGED_FILES = [
  "config/knowledge-capture-policy.json",
  "knowledge/INDEX.md",
  "knowledge/MOC-template.md",
  "knowledge/.gitkeep",
];

function toPosix(value) {
  return value.replaceAll("\\", "/");
}

/** True when a payload-relative path is owned by the payload revision. */
export function isManagedPath(relativePath) {
  const rel = toPosix(String(relativePath ?? "")).replace(/^\.\//u, "");
  if (!rel || rel.endsWith("/")) return false;
  if (rel === "SOURCE-REVISION.json" || rel.endsWith("/.gitkeep")) return false;
  if (UNMANAGED_PREFIXES.some((prefix) => rel.startsWith(prefix))) return false;
  if (UNMANAGED_FILES.includes(rel)) return false;
  if (MANAGED_FILES.includes(rel)) return true;
  return MANAGED_PREFIXES.some((prefix) => rel.startsWith(prefix));
}

async function sha256(file) {
  const buffer = await fs.readFile(file);
  return createHash("sha256").update(buffer).digest("hex");
}

async function walk(root, relative = "") {
  const entries = await fs.readdir(path.join(root, relative), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const rel = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await walk(root, rel));
    else if (entry.isFile()) files.push(rel);
  }
  return files;
}

/** Hash every managed file under a payload or installed root. */
export async function collectManifest(root) {
  const all = await walk(root);
  const manifest = {};
  for (const rel of all.sort()) {
    if (!isManagedPath(rel)) continue;
    manifest[rel] = await sha256(path.join(root, rel));
  }
  return manifest;
}

/** Read the recorded revision and manifest from an initialized workspace. */
export async function readRevision(cwd) {
  const target = path.resolve(cwd, REVISION_RELATIVE_PATH);
  let raw;
  try {
    raw = await fs.readFile(target, "utf8");
  } catch {
    throw new Error("no recorded payload revision; this workspace predates refresh support");
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("recorded payload revision is malformed");
  }
  if (!data || typeof data.revision !== "string" || !data.revision.trim()) {
    throw new Error("recorded payload revision is missing its commit id");
  }
  const files = data.files && typeof data.files === "object" ? data.files : {};
  return { revision: data.revision.trim(), recordedAt: data.recordedAt ?? null, files };
}

/** Write or replace the recorded revision for an installed workspace. */
export async function writeRevision(cwd, { revision, manifest, recordedAt }) {
  if (typeof revision !== "string" || !revision.trim()) {
    throw new Error("a payload revision is required");
  }
  if (!manifest || typeof manifest !== "object") {
    throw new Error("a file manifest is required");
  }
  const target = path.resolve(cwd, REVISION_RELATIVE_PATH);
  await fs.mkdir(path.dirname(target), { recursive: true });
  const data = {
    revision: revision.trim(),
    recordedAt: recordedAt ?? new Date().toISOString().slice(0, 10),
    files: Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b))),
  };
  await fs.writeFile(target, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  return data;
}

/**
 * Compare the installed tree with an incoming payload.
 *
 * Conflicts are reported separately: they are files a refresh must not touch
 * without a file-level decision.
 */
export function classifyRefresh({ installed, incoming, recorded }) {
  const paths = new Set([...Object.keys(installed), ...Object.keys(incoming), ...Object.keys(recorded ?? {})]);
  const added = [];
  const replaced = [];
  const unchanged = [];
  const obsolete = [];
  const conflicts = [];
  const missing = [];

  for (const rel of [...paths].sort()) {
    const now = installed[rel];
    const next = incoming[rel];
    const base = recorded?.[rel];

    if (base !== undefined && now === undefined) {
      conflicts.push(rel);
      continue;
    }
    if (base !== undefined && now !== base) {
      conflicts.push(rel);
      continue;
    }
    if (now === undefined && next !== undefined) {
      added.push(rel);
      continue;
    }
    if (now !== undefined && next === undefined) {
      obsolete.push(rel);
      continue;
    }
    if (now === next) {
      unchanged.push(rel);
      continue;
    }
    replaced.push(rel);
  }

  return { added, replaced, unchanged, obsolete, conflicts, missing };
}

/**
 * Build the user-facing summary the prompt presents before approval.
 *
 * `status` is derived from file differences, not from revision labels: a payload
 * directory carries no commit id, so comparing labels would report "changes"
 * whenever the incoming revision is unknown even with nothing to apply.
 */
export function summarizeRefresh({ installedRevision, incomingRevision, result }) {
  const clean = !result.conflicts.length;
  const pending = result.added.length + result.replaced.length;
  return {
    status: result.conflicts.length ? "conflict" : (pending ? "changes" : "noop"),
    installedRevision,
    incomingRevision,
    incomingRevisionKnown: typeof incomingRevision === "string" && incomingRevision !== "payload-under-comparison",
    clean,
    counts: {
      added: result.added.length,
      replaced: result.replaced.length,
      unchanged: result.unchanged.length,
      obsolete: result.obsolete.length,
      conflicts: result.conflicts.length,
    },
  };
}
