import { promises as fs } from "node:fs";
import path from "node:path";
import {
  isProtectedEnvName,
  resolveThroughExistingSymlinks,
} from "./sensitive-path-policy.mjs";

/**
 * C04 policy for exact action-scope fidelity.
 *
 * The approved /plan checkpoint is the only authorization source. This module
 * is deliberately host-neutral and does not parse shell syntax: it evaluates
 * lexical tool inputs and fails closed when the scope cannot be verified.
 */

export const CHECKPOINT_RELATIVE_PATH = path.join(
  "AgenticLab",
  "knowledge",
  "checkpoints",
  "plan-checkpoint.json",
);

const ARM_COMMAND = /^\/implement(?:\s|$)/u;
const DISARM_COMMAND = /^\/(?:plan|premortem|initialize-workspace)(?:\s|$)/u;

const SHELL_SEGMENT_SPLIT = /&&|\|\||[;|\n]/u;
const SHELL_WORD_SPLIT = /[^\s"'`;|&<>]+/gu;
const REDIRECT_WRITE = /(?:^|[^&<>])>>?(?![&])/u;

const WRAPPER_COMMANDS = new Set(["sudo", "env", "command", "time", "exec"]);
const ALWAYS_MUTATING_COMMANDS = new Set([
  "cp", "mv", "rm", "rmdir", "mkdir", "touch", "install", "tee",
  "chmod", "chown", "truncate", "dd", "ln",
]);
const READ_ONLY_GIT_COMMANDS = new Set([
  "status", "diff", "log", "show", "branch", "remote", "rev-parse",
  "ls-files", "cat-file", "help", "version",
]);
const EXTERNAL_COMMANDS = new Set(["curl", "wget", "scp", "rsync", "ssh", "gh"]);
// `find` selects unless it carries an action; these actions write or execute.
const FIND_ACTION_FLAGS = new Set([
  "-delete", "-exec", "-execdir", "-ok", "-okdir", "-fprint", "-fprint0", "-fprintf", "-fls",
]);

function asStringList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry) => typeof entry === "string" && entry.trim())
    .map((entry) => entry.trim());
}

export function classifyImplementationInput(text, source) {
  if (typeof text !== "string") return null;
  // A relayed /implement is not a user invocation and must not arm the gate.
  if (source === "extension") return null;
  const normalized = text.trim();
  if (ARM_COMMAND.test(normalized)) return "arm";
  if (DISARM_COMMAND.test(normalized)) return "disarm";
  return null;
}

export function extractValidationCommands(validation) {
  return asStringList(validation).map((entry) => {
    const match = entry.match(
      /(?:^|;)\s*command:\s*(.+?)(?=\s*;\s*(?:cwd|environment|prerequisites|side effects|status):|$)/iu,
    );
    return (match ? match[1] : entry).trim();
  }).filter(Boolean);
}

export async function readApprovedScope(cwd) {
  if (typeof cwd !== "string" || !cwd.trim()) {
    throw new Error("workspace cwd is unavailable");
  }
  const root = path.resolve(cwd);
  const checkpointPath = path.resolve(root, CHECKPOINT_RELATIVE_PATH);
  let raw;
  try {
    raw = await fs.readFile(checkpointPath, "utf8");
  } catch {
    throw new Error("approved plan checkpoint is unavailable");
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("approved plan checkpoint is malformed");
  }

  if (!data || data.status !== "approved") {
    throw new Error("plan checkpoint is not approved");
  }

  const inScope = asStringList(data.inScope);
  if (!inScope.length) {
    throw new Error("approved plan checkpoint has no inScope entries");
  }

  return {
    cwd: root,
    inScope: inScope.map((entry) => path.resolve(root, entry)),
    outOfScope: asStringList(data.outOfScope).map((entry) => path.resolve(root, entry)),
    validationCommands: extractValidationCommands(data.validation),
  };
}

function isWithin(root, target) {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function resolveTarget(cwd, value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = path.resolve(cwd, value.replaceAll("\\", "/"));
  if (normalized.includes("\0")) return null;
  return resolveThroughExistingSymlinks(normalized);
}

function normalizeCommand(value) {
  return String(value).trim().replace(/\s+/gu, " ");
}

function shellSegments(command) {
  return String(command)
    .split(SHELL_SEGMENT_SPLIT)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function shellWords(segment) {
  return (segment.match(SHELL_WORD_SPLIT) ?? [])
    .map((word) => word.replace(/^\$?\(+/u, "").replace(/\)+$/u, ""))
    .filter(Boolean);
}

function commandIndex(words) {
  return words.findIndex(
    (word) => !word.includes("=") && !WRAPPER_COMMANDS.has(word.toLowerCase()),
  );
}

function segmentCommand(words) {
  const index = commandIndex(words);
  return index < 0 ? "" : words[index].toLowerCase();
}

function looksLikePathToken(word, command) {
  if (!word || word.startsWith("-") || word.includes("=")) return false;
  if (WRAPPER_COMMANDS.has(word.toLowerCase())) return false;
  if (["echo", "printf", "true", "false"].includes(word.toLowerCase())) return false;
  if (command === "sed" && /^s[:/|@]/u.test(word)) return false;
  if (word.includes("/") || word.includes(".")) return true;
  // Bare names are meaningful targets only for commands that take paths.
  return ALWAYS_MUTATING_COMMANDS.has(command) || command === "find";
}

function classifyShellMutation(segment) {
  const words = shellWords(segment);
  const command = segmentCommand(words);
  if (!command) return { mutating: false, words };

  if (command === "git") {
    const subcommand = words[commandIndex(words) + 1]?.toLowerCase() ?? "";
    if (READ_ONLY_GIT_COMMANDS.has(subcommand)) return { mutating: false, words };
    return {
      mutating: true,
      reason: "git mutations are outside the approved action scope",
      words,
      command,
    };
  }

  if (EXTERNAL_COMMANDS.has(command)) {
    return {
      mutating: true,
      reason: "external network operations are outside the approved action scope",
      words,
      command,
    };
  }

  if (command === "find" && words.some((word) => FIND_ACTION_FLAGS.has(word.toLowerCase()))) {
    return { mutating: true, words, command };
  }

  if (command === "sed") {
    // `sed` edits in place with -i/--in-place (including combined and suffixed forms).
    const inPlace = words.some((word) => word === "--in-place"
      || word.startsWith("--in-place=")
      || /^-[a-zA-Z]*i/u.test(word));
    if (!inPlace) return { mutating: false, words };
    return { mutating: true, words, command };
  }
  if (command === "rm" && words.some((word) => /^-[a-z]*r/u.test(word) || word === "--recursive")) {
    return { mutating: true, words, command, recursiveDelete: true };
  }
  if (ALWAYS_MUTATING_COMMANDS.has(command)) {
    return { mutating: true, words, command };
  }
  if (REDIRECT_WRITE.test(segment)) return { mutating: true, words, command };
  return { mutating: false, words, command };
}

async function shellTargets(words, command, cwd) {
  const index = commandIndex(words);
  const candidates = words
    .slice(index < 0 ? 0 : index + 1)
    .filter((word) => looksLikePathToken(word, command));
  const targets = [];
  for (const candidate of candidates) {
    const resolved = await resolveTarget(cwd, candidate);
    if (resolved) targets.push(resolved);
  }
  return [...new Set(targets)];
}

function scopeDecision(target, root, scope) {
  if (isProtectedEnvName(target)) {
    return { reason: "protected environment file is outside the approved action scope" };
  }
  if (scope.outOfScope.some((excluded) => isWithin(excluded, target))) {
    const relative = path.relative(root, target) || ".";
    return { reason: `target '${relative}' is not an exact approved path` };
  }
  if (!scope.inScope.some((allowed) => isWithin(allowed, target))) {
    const relative = path.relative(root, target) || ".";
    return { reason: `target '${relative}' is not an exact approved path` };
  }
  return null;
}

/**
 * /implement ends with an explicit keep/delete choice for the transient
 * checkpoint. Allow only the exact plain `rm` of that one path; no flags,
 * no globs, and no other checkpoint-like targets.
 */
async function isCheckpointDeletion(words, command, root) {
  if (command !== "rm") return false;
  const targets = words
    .slice(commandIndex(words) + 1)
    .filter((word) => !word.startsWith("-") && !word.includes("="));
  if (targets.length !== 1) return false;
  const resolved = await resolveTarget(root, targets[0]);
  return resolved === path.resolve(root, CHECKPOINT_RELATIVE_PATH);
}

/**
 * Returns null when the action is within the approved scope, otherwise a
 * content-free block reason. Throws when the scope itself cannot be trusted.
 */
export async function classifyActionScope(toolName, input, cwd, scope) {
  if (!scope || !Array.isArray(scope.inScope) || typeof scope.cwd !== "string") {
    throw new Error("approved action scope is invalid");
  }
  const root = path.resolve(scope.cwd || cwd);

  if (toolName === "write" || toolName === "edit") {
    const supplied = [
      input?.path,
      input?.filePath,
      input?.file_path,
      ...(Array.isArray(input?.paths) ? input.paths : []),
    ].filter((value) => typeof value === "string" && value.trim());
    if (!supplied.length) {
      return { reason: "write target could not be identified" };
    }

    for (const value of supplied) {
      const target = await resolveTarget(root, value);
      if (!target) return { reason: "write target could not be resolved" };
      const decision = scopeDecision(target, root, scope);
      if (decision) return decision;
    }
    return null;
  }

  if (toolName === "bash" || toolName === "user_bash") {
    const command = input?.command;
    if (typeof command !== "string" || !command.trim()) {
      return { reason: "shell command could not be identified" };
    }
    const approved = new Set(scope.validationCommands.map(normalizeCommand));

    for (const segment of shellSegments(command)) {
      const mutation = classifyShellMutation(segment);
      // Git mutations are excluded by the project scope even if a checkpoint
      // entry mentions them; no validation command can re-authorize a push.
      if (mutation.reason) return { reason: mutation.reason };
      if (approved.has(normalizeCommand(segment))) continue;
      if (!mutation.mutating) continue;
      if (mutation.recursiveDelete) {
        return { reason: "recursive deletion is not covered by the approved scope" };
      }
      if (segment.includes("$(") || segment.includes("`")) {
        return { reason: "shell substitution in a mutating command cannot be verified" };
      }
      if (await isCheckpointDeletion(mutation.words, mutation.command, root)) continue;
      const targets = await shellTargets(mutation.words, mutation.command, root);
      if (!targets.length) {
        return { reason: "mutating shell target could not be identified" };
      }
      for (const target of targets) {
        const decision = scopeDecision(target, root, scope);
        if (decision) return decision;
      }
    }
    return null;
  }

  // This slice governs consequential writes and shell actions only.
  return null;
}
