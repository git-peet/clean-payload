import { StringEnum, Type } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerKnowledgeCaptureTools } from "./knowledge-capture-tools.mjs";
import { registerKnowledgeWriteGate } from "./knowledge-write-gate.mjs";
import { registerActionScopeGate } from "./action-scope-gate.mjs";

export default function (pi: ExtensionAPI) {
  registerKnowledgeWriteGate(pi);
  registerActionScopeGate(pi);
  registerKnowledgeCaptureTools(pi, Type, StringEnum);
}
