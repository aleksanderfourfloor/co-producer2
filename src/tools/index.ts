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

/** Get specific tool definitions by name */
export function getToolDefinitionsByNames(names: string[]) {
  return ALL_TOOLS.filter((t) => names.includes(t.definition.function.name)).map((t) => t.definition);
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

// ── Tool Groups ──────────────────────────────────────────────────

export const TOOL_GROUPS = {
  transport: [
    "play", "stop", "set_tempo", "undo", "redo", "stop_all_clips",
    "set_groove", "set_swing", "set_time_signature"
  ],
  session: [
    "get_session_info", "get_track_details"
  ],
  trackOps: [
    "create_midi_track", "create_audio_track", "create_return_track",
    "delete_track", "duplicate_track", "rename_track", "set_track_mute",
    "set_track_solo", "set_track_volume", "set_track_panning",
    "set_track_color", "arm_track"
  ],
  midi: [
    "get_clip_notes", "create_midi_clip", "add_notes_to_clip",
    "remove_notes", "replace_all_notes", "quantize_clip", "duplicate_clip_loop"
  ],
  clipProps: [
    "rename_clip", "fire_clip", "stop_clip", "set_clip_looping",
    "set_clip_loop_points", "set_clip_markers"
  ],
  scenes: [
    "fire_scene", "create_scene", "delete_scene", "duplicate_scene"
  ],
  devices: [
    "browse_instruments", "browse_effects", "load_device",
    "get_device_parameters", "set_device_parameter", "delete_device"
  ],
  arrangement: [
    "get_track_sends", "set_track_send_level", "set_song_position",
    "set_arrangement_loop", "place_clip_in_arrangement", "load_audio_clip"
  ],
  analysis: [
    "analyse_audio"
  ],
  ux: [
    "update_ui_status"
  ]
};
