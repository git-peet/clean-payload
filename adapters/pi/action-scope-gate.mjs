import { promises as fs } from "node:fs";
import path from "node:path";

import {
  classifyActionScope,
  classifyImplementationInput,
  readApprovedScope,
} from "./action-scope-policy.mjs";

const BLOCK_PREFIX = "Action-scope fidelity: ";

/**
 * Pi wiring for exact action-scope fidelity.
 *
 * Enforcement is armed only by a direct /implement input and disarmed on a
 * fresh session or a different workflow invocation. The approved /plan
 * checkpoint is re-read for every consequential call, so stale in-memory
 * state cannot widen the authorization.
 */
export function registerActionScopeGate(pi) {
  let armed = false;

  pi.on("session_start", () => {
    armed = false;
  });

  /**
   * The approved implementation log is the workflow's own completion marker: it is
   * inside approved scope and is written at the end. Once it exists, the plan has
   * been executed and enforcement is released so later default work is not blocked
   * by a stale scope. A missing checkpoint keeps failing closed, as before.
   */
  pi.on("agent_settled", async (_event, ctx) => {
    if (!armed) return;
    try {
      const scope = await readApprovedScope(ctx.cwd);
      const logPath = scope.inScope.find((entry) => entry.includes(`${path.sep}implementation-logs${path.sep}`));
      if (!logPath) return;
      await fs.access(logPath);
      armed = false;
    } catch {
      // Keep the gate armed: an unreadable scope must not release protection.
    }
  });

  pi.on("input", async (event) => {
    const decision = classifyImplementationInput(event?.text, event?.source);
    if (decision === "arm") armed = true;
    else if (decision === "disarm") armed = false;
    return undefined;
  });

  const verify = async (toolName, input, cwd) => {
    if (!armed) return undefined;
    try {
      const scope = await readApprovedScope(cwd);
      const decision = await classifyActionScope(toolName, input, scope.cwd, scope);
      if (decision) return { block: true, reason: `${BLOCK_PREFIX}${decision.reason}; blocked.` };
      return undefined;
    } catch (error) {
      const detail = error?.message ?? "unknown error";
      return {
        block: true,
        reason: `${BLOCK_PREFIX}approved action scope could not be verified (${detail}); blocked.`,
      };
    }
  };

  pi.on("tool_call", async (event, ctx) => {
    const toolName = event?.toolName;
    if (toolName === "write" || toolName === "edit" || toolName === "bash" || toolName === "user_bash") {
      return verify(toolName, event.input, ctx.cwd);
    }
    return undefined;
  });

  pi.on("user_bash", async (event, ctx) => {
    const decision = await verify(
      "user_bash", { command: event?.command }, event?.cwd ?? ctx.cwd,
    );
    if (!decision) return undefined;
    return {
      result: {
        output: decision.reason,
        exitCode: 126,
        cancelled: false,
        truncated: false,
      },
    };
  });
}
