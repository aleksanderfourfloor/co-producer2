import { AbletonService } from "../services/ableton.js";
import { getSessionInfoTool, getTrackDetailsTool } from "./session.js";
import { playTool, stopTool, setTempoTool } from "./transport.js";
import { getClipNotesTool, createMidiClipTool, addNotesToClipTool } from "./midi.js";
import {
  createMidiTrackTool,
  createAudioTrackTool,
  createReturnTrackTool,
  deleteTrackTool,
  duplicateTrackTool,
} from "./tracks.js";
import {
  browseInstrumentsTool,
  browseEffectsTool,
  loadDeviceTool,
  getDeviceParametersTool,
  setDeviceParameterTool,
  deleteDeviceTool,
} from "./devices.js";
import { analyseAudioTool } from "./analysis.js";

// ── Tool Definition Type ────────────────────────────────────────

export interface ToolDef {
  definition: {
    type: "function";
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  };
  handler: (ableton: AbletonService, args: Record<string, unknown>) => Promise<unknown>;
}

// ── Tool Registry ───────────────────────────────────────────────

const ALL_TOOLS: ToolDef[] = [
  getSessionInfoTool,
  getTrackDetailsTool,
  playTool,
  stopTool,
  setTempoTool,
  getClipNotesTool,
  createMidiClipTool,
  addNotesToClipTool,
  createMidiTrackTool,
  createAudioTrackTool,
  createReturnTrackTool,
  deleteTrackTool,
  duplicateTrackTool,
  browseInstrumentsTool,
  browseEffectsTool,
  loadDeviceTool,
  getDeviceParametersTool,
  setDeviceParameterTool,
  deleteDeviceTool,
  analyseAudioTool,
];

/** All tool definitions formatted for OpenAI function calling */
export function getToolDefinitions() {
  return ALL_TOOLS.map((t) => t.definition);
}

/** Look up a tool handler by name */
export function getToolHandler(
  name: string
): ((ableton: AbletonService, args: Record<string, unknown>) => Promise<unknown>) | undefined {
  const tool = ALL_TOOLS.find((t) => t.definition.function.name === name);
  return tool?.handler;
}

/** List all available tool names */
export function getToolNames(): string[] {
  return ALL_TOOLS.map((t) => t.definition.function.name);
}
