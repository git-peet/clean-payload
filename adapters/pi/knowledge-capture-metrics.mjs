import { constants as fsConstants, promises as fs } from "node:fs";
import path from "node:path";

const ALLOWED_EVENTS = new Set([
  "candidate_staged",
  "candidate_rejected",
  "decision_knowledge",
  "retrieval_success",
  "no_match",
  "context_source_used",
  "context_stop_rule_triggered",
  "context_assembly_complete"
]);

// Stable, content-free source-layer identifiers; this list validates telemetry,
// it does not select or load context.
export const CONTEXT_SOURCE_IDS = Object.freeze([
  "user_request",
  "operating_instructions",
  "current_source",
  "project_scope",
  "project_knowledge",
  "domain_perspective",
  "workflow_prompt",
  "approved_plan",
  "task_local_handoff",
  "project_orientation"
]);
const ALLOWED_CONTEXT_SOURCES = new Set(CONTEXT_SOURCE_IDS);

export const CONTEXT_ASSEMBLY_OUTCOMES = Object.freeze([
  "complete",
  "not_needed",
  "no_match",
  "filtered",
  "incomplete",
  "unavailable",
  "blocked"
]);
const ALLOWED_CONTEXT_OUTCOMES = new Set(CONTEXT_ASSEMBLY_OUTCOMES);

const ALLOWED_CONTEXT_EVENTS = new Set([
  "context_source_used",
  "context_stop_rule_triggered",
  "context_assembly_complete"
]);

function validateContextMetric(event, opts) {
  const allowedFields = new Set([
    "workspaceRoot",
    ...(event === "context_source_used" ? ["sourcesUsed"] : []),
    ...(event === "context_stop_rule_triggered" ? ["stopRuleFired"] : []),
    ...(event === "context_assembly_complete" ? ["outcome"] : []),
  ]);
  if (Object.keys(opts).some((key) => !allowedFields.has(key))) {
    throw new Error("unsupported context metric field");
  }

  const normalized = { ...opts };
  if (event === "context_source_used") {
    if (!Array.isArray(opts.sourcesUsed) || opts.sourcesUsed.length < 1 || opts.sourcesUsed.length > 10
      || opts.sourcesUsed.some((source) => typeof source !== "string" || !ALLOWED_CONTEXT_SOURCES.has(source))) {
      throw new Error("context sources must be allowlisted source-layer names");
    }
    normalized.sourcesUsed = [...new Set(opts.sourcesUsed)];
  } else if (event === "context_stop_rule_triggered") {
    if (typeof opts.stopRuleFired !== "boolean") {
      throw new Error("stopRuleFired must be a boolean");
    }
  } else if (opts.outcome !== null && opts.outcome !== undefined
    && (typeof opts.outcome !== "string" || !ALLOWED_CONTEXT_OUTCOMES.has(opts.outcome))) {
    throw new Error("context outcome is not allowlisted");
  }
  return normalized;
}

function normalizeContextSelectionInput(opts) {
  if (opts === null || typeof opts !== "object" || Array.isArray(opts)) {
    throw new Error("context-selection metric input must be an object");
  }
  const allowedFields = new Set(["sourcesUsed", "stopRuleFired", "outcome", "workspaceRoot"]);
  if (Object.keys(opts).some((key) => !allowedFields.has(key))) {
    throw new Error("unsupported context-selection metric field");
  }
  const sourcesUsed = opts.sourcesUsed ?? [];
  if (!Array.isArray(sourcesUsed) || sourcesUsed.length > 10
    || sourcesUsed.some((source) => typeof source !== "string" || !ALLOWED_CONTEXT_SOURCES.has(source))) {
    throw new Error("context sources must be allowlisted source-layer names");
  }
  if (opts.stopRuleFired !== undefined && opts.stopRuleFired !== null && typeof opts.stopRuleFired !== "boolean") {
    throw new Error("stopRuleFired must be a boolean");
  }
  if (opts.outcome !== undefined && opts.outcome !== null
    && (typeof opts.outcome !== "string" || !ALLOWED_CONTEXT_OUTCOMES.has(opts.outcome))) {
    throw new Error("context outcome is not allowlisted");
  }
  return { ...opts, sourcesUsed: [...new Set(sourcesUsed)] };
}

export function metricPaths(workspaceRoot = ".") {
  const root = path.resolve(workspaceRoot);
  const metricsDir = path.join(root, ".pi", "metrics");
  return { workspaceRoot: root, metricsDir, logPath: path.join(metricsDir, "agenticlab.jsonl") };
}

/**
 * Register the workspace metrics location for the Pi adapter. Inventory and
 * pricing events deliberately share this narrow writer without payload data.
 */
export function registerKnowledgeCaptureMetrics(_pi, opts = {}) {
  return metricPaths(opts.workspaceRoot || ".");
}

/**
 * Append one allowlisted, content-free event. Callers cannot attach arbitrary
 * metadata, so rule names, conditions, actions, customer, and cart data never
 * enter this log.
 */
export async function recordKnowledgeCaptureMetric(event, opts = {}) {
  if (!ALLOWED_EVENTS.has(event)) {
    throw new Error("unsupported knowledge-capture metric event");
  }
  const metric = ALLOWED_CONTEXT_EVENTS.has(event) ? validateContextMetric(event, opts) : opts;
  const { workspaceRoot, metricsDir, logPath } = metricPaths(metric.workspaceRoot || ".");
  const policyPath = path.join(workspaceRoot, "AgenticLab", "config", "knowledge-capture-policy.json");
  const policyText = await fs.readFile(policyPath, "utf8");
  const policy = JSON.parse(policyText);
  if (policy.metricsEnabled !== true) return { recorded: false, reason: "metrics-disabled" };

  await fs.mkdir(metricsDir, { recursive: true, mode: 0o700 });
  const payload = { event, occurredAt: new Date().toISOString() };
  if (event === "context_source_used") payload.sourcesUsed = metric.sourcesUsed;
  if (event === "context_stop_rule_triggered") payload.stopRuleFired = metric.stopRuleFired;
  if (event === "context_assembly_complete" && metric.outcome != null) payload.outcome = metric.outcome;
  const line = `${JSON.stringify(payload)}\n`;
  const handle = await fs.open(logPath, fsConstants.O_WRONLY | fsConstants.O_APPEND | fsConstants.O_CREAT, 0o600);
  try {
    await handle.writeFile(line, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  return { recorded: true };
}

/**
 * Record a context-selection metric. Content-free: only source-layer names,
 * boolean stop-rule flag, and optional outcome string. Delegates to the core
 * metric writer (policy gate, allowlist, JSONL append).
 */
export async function recordContextSelectionMetric(opts = {}) {
  let normalized;
  try {
    normalized = normalizeContextSelectionInput(opts);
  } catch {
    return { recorded: false, reason: "invalid-context-metric" };
  }
  const { sourcesUsed = [], stopRuleFired = null, outcome = null, workspaceRoot = "." } = normalized;

  const results = [];
  if (sourcesUsed.length) {
    results.push(await recordKnowledgeCaptureMetric("context_source_used", { workspaceRoot, sourcesUsed }));
  }
  if (stopRuleFired !== null && stopRuleFired !== undefined) {
    results.push(await recordKnowledgeCaptureMetric("context_stop_rule_triggered", { workspaceRoot, stopRuleFired }));
  }
  results.push(await recordKnowledgeCaptureMetric("context_assembly_complete", { workspaceRoot, outcome }));
  const unavailable = results.find((result) => result.recorded !== true);
  return unavailable ?? { recorded: true };
}
