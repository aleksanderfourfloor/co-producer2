import { AbletonService } from "../services/ableton.js";
import { getSessionInfoTool, getTrackDetailsTool } from "./session.js";
import {
  playTool,
  stopTool,
  setTempoTool,
  undoTool,
  redoTool,
  stopAllClipsTool,
  setGrooveTool,
  setSwingTool,
  setTimeSignatureTool,
} from "./transport.js";
import { getClipNotesTool, createMidiClipTool, addNotesToClipTool } from "./midi.js";
import {
  removeNotesTool,
  replaceAllNotesTool,
  quantizeClipTool,
  duplicateClipLoopTool,
} from "./note-editing.js";
import {
  createMidiTrackTool,
  createAudioTrackTool,
  createReturnTrackTool,
  deleteTrackTool,
  duplicateTrackTool,
} from "./tracks.js";
import {
  renameTrackTool,
  setTrackMuteTool,
  setTrackSoloTool,
  setTrackVolumeTool,
  setTrackPanningTool,
  setTrackColorTool,
  armTrackTool,
} from "./track-management.js";
import {
  renameClipTool,
  fireClipTool,
  stopClipTool,
  setClipLoopingTool,
} from "./clip-management.js";
import { setClipLoopPointsTool, setClipMarkersTool } from "./clip-properties.js";
import {
  fireSceneTool,
  createSceneTool,
  deleteSceneTool,
  duplicateSceneTool,
} from "./scene-management.js";
import {
  getTrackSendsTool,
  setTrackSendLevelTool,
  setSongPositionTool,
  setArrangementLoopTool,
  placeClipInArrangementTool,
  loadAudioClipTool,
} from "./arrangement.js";
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
  // Session
  getSessionInfoTool,
  getTrackDetailsTool,

  // Transport & Session Settings
  playTool,
  stopTool,
  setTempoTool,
  undoTool,
  redoTool,
  stopAllClipsTool,
  setGrooveTool,
  setSwingTool,
  setTimeSignatureTool,

  // MIDI — Read & Write
  getClipNotesTool,
  createMidiClipTool,
  addNotesToClipTool,

  // MIDI — Edit & Refine
  removeNotesTool,
  replaceAllNotesTool,
  quantizeClipTool,
  duplicateClipLoopTool,

  // Track creation / deletion
  createMidiTrackTool,
  createAudioTrackTool,
  createReturnTrackTool,
  deleteTrackTool,
  duplicateTrackTool,

  // Track management
  renameTrackTool,
  setTrackMuteTool,
  setTrackSoloTool,
  setTrackVolumeTool,
  setTrackPanningTool,
  setTrackColorTool,
  armTrackTool,

  // Clip management
  renameClipTool,
  fireClipTool,
  stopClipTool,
  setClipLoopingTool,
  setClipLoopPointsTool,
  setClipMarkersTool,

  // Scene management
  fireSceneTool,
  createSceneTool,
  deleteSceneTool,
  duplicateSceneTool,

  // Sends & Arrangement
  getTrackSendsTool,
  setTrackSendLevelTool,
  setSongPositionTool,
  setArrangementLoopTool,
  placeClipInArrangementTool,
  loadAudioClipTool,

  // Devices
  browseInstrumentsTool,
  browseEffectsTool,
  loadDeviceTool,
  getDeviceParametersTool,
  setDeviceParameterTool,
  deleteDeviceTool,

  // Analysis
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
