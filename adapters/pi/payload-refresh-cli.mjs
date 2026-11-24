#!/usr/bin/env node
import path from "node:path";

import {
  classifyRefresh,
  collectManifest,
  readRevision,
  summarizeRefresh,
  writeRevision,
} from "./payload-refresh-policy.mjs";

/**
 * Preview a payload refresh, or record the current revision.
 *
 * Usage:
 *   node AgenticLab/adapters/pi/payload-refresh-cli.mjs --payload <dir>
 *   node AgenticLab/adapters/pi/payload-refresh-cli.mjs --record --revision <id>
 *
 * The command only reads and reports unless --record is passed. Applying a
 * refresh is the caller's job, after approval.
 */

function parseArgs(argv) {
  const options = { payload: null, record: false, revision: null, cwd: process.cwd() };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--payload") options.payload = argv[index + 1];
    else if (arg === "--record") options.record = true;
    else if (arg === "--revision") options.revision = argv[index + 1];
    else if (arg === "--cwd") options.cwd = argv[index + 1];
  }
  return options;
}

function fail(message) {
  process.stdout.write(`${JSON.stringify({ status: "error", reason: message })}\n`);
  process.exit(2);
}

const options = parseArgs(process.argv.slice(2));
const installedRoot = path.resolve(options.cwd, "AgenticLab");

// Recording only describes the installed tree, so it must work during first
// initialization, before any payload snapshot directory is available.
if (options.record) {
  if (!options.revision) fail("--record also needs --revision <commit-id>");
  const installed = await collectManifest(installedRoot);
  const recorded = await writeRevision(options.cwd, { revision: options.revision, manifest: installed });
  process.stdout.write(`${JSON.stringify({
    status: "recorded",
    revision: recorded.revision,
    files: Object.keys(recorded.files).length,
  })}\n`);
  process.exit(0);
}

if (!options.payload) fail("--payload <dir> is required for a preview");
const payloadRoot = path.resolve(options.payload);
const incoming = await collectManifest(payloadRoot);

let installedRevision;
let recorded;
try {
  const revision = await readRevision(options.cwd);
  installedRevision = revision.revision;
  recorded = revision.files;
} catch (error) {
  process.stdout.write(`${JSON.stringify({
    status: "unrecorded",
    reason: error.message,
    incomingFiles: Object.keys(incoming).length,
  })}\n`);
  process.exit(3);
}

const installed = await collectManifest(installedRoot);
const result = classifyRefresh({ installed, incoming, recorded });
const summary = summarizeRefresh({
  installedRevision,
  incomingRevision: options.revision ?? "payload-under-comparison",
  result,
});

process.stdout.write(`${JSON.stringify({ ...summary, ...result }, null, 2)}\n`);
process.exit(summary.status === "conflict" ? 1 : 0);
