import { promises as fs } from "node:fs";
import path from "node:path";

const CONTENT_FILE_TOOLS = new Set(["read", "grep", "edit", "write"]);
const METADATA_FILE_TOOLS = new Set(["ls", "find"]);
const SHELL_METADATA_COMMANDS = new Set([
  "ls", "find", "test", "stat", "realpath", "dirname", "basename",
]);
const SHELL_NAVIGATION_COMMANDS = new Set(["cd", "pwd"]);
// Flags that let a metadata command delegate work to another command or modify files.
const SHELL_DELEGATING_FLAGS = new Set(["-exec", "-execdir", "-ok", "-okdir", "-delete"]);
const SHELL_CONTENT_COMMANDS = new Set([
  "cat", "less", "more", "head", "tail", "grep", "rg", "sed", "awk", "wc",
  "base64", "xxd", "od", "cp", "mv", "rm", "tee", "curl", "scp", "rsync",
  "tar", "zip", "unzip",
]);

const BLOCK_REASON = "Sensitive environment files are protected. Content reads, searches, edits, copies, and reports of .env/.env.* files are blocked; .env.example and metadata-only checks remain allowed.";

function normalizePathValue(value) {
  return typeof value === "string" ? value.replaceAll("\\", "/") : "";
}

export function isProtectedEnvName(value) {
  const normalized = normalizePathValue(value).replace(/\/+$/u, "");
  if (!normalized) return false;
  const base = path.posix.basename(normalized);
  if (base === ".env") return true;
  if (!base.startsWith(".env.")) return false;
  return !/\.(example|sample)$/iu.test(base);
}

// Escaped dots appear inside source-code identifiers used by safe config
// scans. Exempt only these known identifiers; escaped real paths stay blocked.
const KNOWN_CODE_ENV_IDENTIFIERS = [
  // Python raw-string source often contains doubled backslashes.
  /import\\\\\.meta\\\\\.env/gu,
  /process\\\\\.env/gu,
  /Bun\\\\\.env/gu,
  /Deno\\\\\.env/gu,
  // Shell/JS source usually contains one literal backslash.
  /import\\\.meta\\\.env/gu,
  /process\\\.env/gu,
  /Bun\\\.env/gu,
  /Deno\\\.env/gu,
  /import\.meta\.env/gu,
  /process\.env/gu,
  /Bun\.env/gu,
  /Deno\.env/gu,
];

function withoutKnownCodeEnvIdentifiers(value) {
  let normalized = value;
  for (const identifier of KNOWN_CODE_ENV_IDENTIFIERS) {
    normalized = normalized.replace(identifier, "");
  }
  return normalized;
}

function tokenReferencesProtectedEnv(token) {
  if (typeof token !== "string" || !token) return false;
  const sanitized = withoutKnownCodeEnvIdentifiers(token);
  if (isProtectedEnvName(sanitized)) return true;
  const normalized = normalizePathValue(sanitized);
  // Match exact `.env` or `.env.<suffix>` path tokens. Require a dot after the
  // .env stem so identifiers like `.environ` are not treated as env files.
  const matches = normalized.matchAll(/(?:^|[^A-Za-z0-9_.-])(\.env(?:\.[A-Za-z0-9_.-]+)*)(?![A-Za-z0-9_-])/gu);
  for (const match of matches) {
    if (isProtectedEnvName(match[1])) return true;
  }
  return false;
}

function extractPathCandidates(input, cwd) {
  const supplied = [
    input?.path,
    input?.filePath,
    input?.file_path,
    input?.directory,
    input?.cwd,
    ...(Array.isArray(input?.paths) ? input.paths : []),
  ].filter((value) => typeof value === "string" && value.trim());
  return [...new Set(supplied.map((value) => path.resolve(cwd, value)))];
}

const SHELL_SEGMENT_SPLIT = /&&|\|\||[;|]/u;

function shellSegments(command) {
  return normalizePathValue(command)
    .split(SHELL_SEGMENT_SPLIT)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function segmentWords(segment) {
  return (segment.match(/[^\s"'`;|&<>]+/gu) ?? [])
    .map((word) => word.replace(/^\$?\(+/u, "").replace(/\)+$/u, ""))
    .filter(Boolean);
}

function segmentCommand(words) {
  const word = words.find((candidate) => !candidate.includes("="));
  return word ? word.toLowerCase() : "";
}

/** Navigation and name/metadata-only commands never display file contents. */
function segmentIsMetadataOnly(words) {
  const command = segmentCommand(words);
  if (SHELL_NAVIGATION_COMMANDS.has(command)) return true;
  if (!SHELL_METADATA_COMMANDS.has(command)) return false;
  return !words.some((word) => SHELL_DELEGATING_FLAGS.has(word));
}

function relativeToCwd(cwd, target) {
  const relative = path.relative(path.resolve(cwd), path.resolve(target));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative)) ? relative : null;
}

function directoryMayContainProtectedEnv(cwd, target) {
  const targetRelative = relativeToCwd(cwd, target);
  if (targetRelative === null) return false;
  const protectedRelativePaths = [".env", "frontend/.env"];
  return protectedRelativePaths.some((candidate) => {
    const candidateAbsolute = path.resolve(cwd, candidate);
    const targetAbsolute = path.resolve(cwd, targetRelative);
    return candidateAbsolute === targetAbsolute
      || candidateAbsolute.startsWith(`${targetAbsolute}${path.sep}`);
  });
}

export async function resolveThroughExistingSymlinks(target) {
  let current = path.resolve(target);
  const remainder = [];
  while (true) {
    try {
      const resolved = await fs.realpath(current);
      return path.resolve(resolved, ...remainder.reverse());
    } catch (error) {
      if (error?.code !== "ENOENT" && error?.code !== "ENOTDIR") return path.resolve(target);
      const parent = path.dirname(current);
      if (parent === current) return path.resolve(target);
      remainder.push(path.basename(current));
      current = parent;
    }
  }
}

function blocked() {
  return { reason: BLOCK_REASON };
}

/**
 * Classify sensitive environment-file access without reading file contents.
 * This is host-neutral policy logic; the Pi adapter owns tool-call wiring.
 */
export async function classifySensitivePathAccess(toolName, input, cwd) {
  if (typeof cwd !== "string" || !cwd.trim()) return null;

  if (toolName === "bash" || toolName === "user_bash") {
    const command = input?.command;
    if (typeof command !== "string" || !command.trim()) return null;
    // Remove known escaped code identifiers before path normalization; a
    // Python/JS source scan may mention process\.env without accessing a file.
    // Real escaped paths are not in this list and remain protected.
    const classifiedCommand = withoutKnownCodeEnvIdentifiers(command);

    // Evaluate each &&, ||, ;, or pipeline segment independently so that a
    // metadata-only prefix (for example `cd` or `test`) cannot hide a later
    // content-access segment.
    for (const segment of shellSegments(classifiedCommand)) {
      const words = segmentWords(segment);
      if (segmentIsMetadataOnly(words)) continue;
      if (words.some(tokenReferencesProtectedEnv)) return blocked();
      if (SHELL_CONTENT_COMMANDS.has(segmentCommand(words))) {
        for (const word of words) {
          if (word.startsWith("-") || word.includes("=")) continue;
          if (directoryMayContainProtectedEnv(cwd, path.resolve(cwd, word))) return blocked();
        }
      }
    }
    return null;
  }

  if (CONTENT_FILE_TOOLS.has(toolName)) {
    const candidates = extractPathCandidates(input, cwd);
    if (!candidates.length) return null;

    if (toolName === "grep") {
      for (const target of candidates) {
        if (directoryMayContainProtectedEnv(cwd, target)) return blocked();
      }
    }

    for (const target of candidates) {
      if (isProtectedEnvName(target)) return blocked();
      const resolvedTarget = await resolveThroughExistingSymlinks(target);
      if (isProtectedEnvName(resolvedTarget)) return blocked();
    }
    return null;
  }

  // ls/find expose names and metadata only; they are allowed by this first slice.
  if (METADATA_FILE_TOOLS.has(toolName)) return null;

  return null;
}
