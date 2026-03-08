import { AbletonService } from "../services/ableton.js";

// ── Tool: get_track_sends ───────────────────────────────────────

export const getTrackSendsTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "get_track_sends",
      description:
        "Get all send levels for a track. Sends route audio to return tracks (reverb, delay, etc.). Returns the send name, current value, and min/max range.",
      parameters: {
        type: "object",
        properties: {
          track_index: {
            type: "number",
            description: "Zero-based index of the track.",
          },
        },
        required: ["track_index"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    const sends = await ableton.getTrackSends(args.track_index as number);
    return { sends };
  },
};

// ── Tool: set_track_send_level ──────────────────────────────────

export const setTrackSendLevelTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "set_track_send_level",
      description:
        "Set the send level for a track to a specific return track. Use get_track_sends first to see available sends and their ranges. Higher values send more signal to the return track's effect (e.g., more reverb).",
      parameters: {
        type: "object",
        properties: {
          track_index: {
            type: "number",
            description: "Zero-based index of the track.",
          },
          send_index: {
            type: "number",
            description: "Zero-based index of the send (corresponds to return tracks A, B, C, etc.).",
          },
          value: {
            type: "number",
            description: "Send level value (typically 0.0 to 1.0).",
          },
        },
        required: ["track_index", "send_index", "value"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    await ableton.setTrackSendLevel(
      args.track_index as number,
      args.send_index as number,
      args.value as number
    );
    return {
      success: true,
      message: `Set track ${args.track_index} send ${args.send_index} to ${args.value}`,
    };
  },
};

// ── Tool: set_song_position ─────────────────────────────────────

export const setSongPositionTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "set_song_position",
      description:
        "Set the current playback position in the arrangement. Time is in beats.",
      parameters: {
        type: "object",
        properties: {
          time: {
            type: "number",
            description: "Position in beats to jump to.",
          },
        },
        required: ["time"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    await ableton.setSongPosition(args.time as number);
    return {
      success: true,
      message: `Song position set to beat ${args.time}`,
    };
  },
};

// ── Tool: set_arrangement_loop ──────────────────────────────────

export const setArrangementLoopTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "set_arrangement_loop",
      description:
        "Enable/disable the arrangement loop and optionally set its start and length. Useful for looping a specific section during playback.",
      parameters: {
        type: "object",
        properties: {
          enabled: {
            type: "boolean",
            description: "True to enable looping, false to disable.",
          },
          start: {
            type: "number",
            description: "Optional loop start position in beats.",
          },
          length: {
            type: "number",
            description: "Optional loop length in beats.",
          },
        },
        required: ["enabled"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    await ableton.setArrangementLoop(
      args.enabled as boolean,
      args.start as number | undefined,
      args.length as number | undefined
    );
    return {
      success: true,
      message: `Arrangement loop ${args.enabled ? "enabled" : "disabled"}${args.start !== undefined ? ` at beat ${args.start}` : ""}${args.length !== undefined ? `, length ${args.length} beats` : ""}`,
    };
  },
};

// ── Tool: place_clip_in_arrangement ─────────────────────────────

export const placeClipInArrangementTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "place_clip_in_arrangement",
      description:
        "Copy a clip from Session View into the Arrangement View at a specified time position. Use this to build a full song arrangement from session clips.",
      parameters: {
        type: "object",
        properties: {
          track_index: {
            type: "number",
            description: "Zero-based index of the track containing the clip.",
          },
          clip_slot_index: {
            type: "number",
            description: "Zero-based index of the clip slot in Session View.",
          },
          time: {
            type: "number",
            description: "Position in beats where the clip should be placed in the arrangement.",
          },
        },
        required: ["track_index", "clip_slot_index", "time"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    await ableton.duplicateClipToArrangement(
      args.track_index as number,
      args.clip_slot_index as number,
      args.time as number
    );
    return {
      success: true,
      message: `Placed clip from track ${args.track_index}, slot ${args.clip_slot_index} at beat ${args.time} in arrangement`,
    };
  },
};

// ── Tool: load_audio_clip ───────────────────────────────────────

export const loadAudioClipTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "load_audio_clip",
      description:
        "Load an audio file (WAV, AIFF, MP3, etc.) onto an audio track at a specific clip slot position. The track must be an audio track, not a MIDI track.",
      parameters: {
        type: "object",
        properties: {
          track_index: {
            type: "number",
            description: "Zero-based index of the audio track.",
          },
          file_path: {
            type: "string",
            description: "Absolute file path to the audio file.",
          },
          position: {
            type: "number",
            description: "Clip slot position (zero-based) to load the audio into.",
          },
        },
        required: ["track_index", "file_path", "position"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    await ableton.createAudioClip(
      args.track_index as number,
      args.file_path as string,
      args.position as number
    );
    return {
      success: true,
      message: `Loaded audio file onto track ${args.track_index} at position ${args.position}`,
    };
  },
};
