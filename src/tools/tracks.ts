import { AbletonService } from "../services/ableton.js";

// ── Tool: create_midi_track ─────────────────────────────────────

export const createMidiTrackTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "create_midi_track",
      description:
        "Create a new MIDI track in the Ableton Live session. You can optionally specify the position (index) where the track should be inserted. MIDI tracks are used for virtual instruments, drum racks, and any MIDI-based content.",
      parameters: {
        type: "object",
        properties: {
          index: {
            type: "number",
            description:
              "Optional zero-based index where the track should be inserted. If not provided, the track is added at the end.",
          },
        },
        required: [],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    const result = await ableton.createMidiTrack(args.index as number | undefined);
    return {
      success: true,
      track_index: result.index,
      track_name: result.name,
      message: `Created MIDI track "${result.name}" at index ${result.index}`,
    };
  },
};

// ── Tool: create_audio_track ────────────────────────────────────

export const createAudioTrackTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "create_audio_track",
      description:
        "Create a new audio track in the Ableton Live session. Audio tracks are used for recording audio, loading samples, and working with audio files.",
      parameters: {
        type: "object",
        properties: {
          index: {
            type: "number",
            description:
              "Optional zero-based index where the track should be inserted. If not provided, the track is added at the end.",
          },
        },
        required: [],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    const result = await ableton.createAudioTrack(args.index as number | undefined);
    return {
      success: true,
      track_index: result.index,
      track_name: result.name,
      message: `Created audio track "${result.name}" at index ${result.index}`,
    };
  },
};

// ── Tool: create_return_track ───────────────────────────────────

export const createReturnTrackTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "create_return_track",
      description:
        "Create a new return track (send/bus track) in the Ableton Live session. Return tracks are used for shared effects like reverb and delay that multiple tracks send to.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  handler: async (ableton: AbletonService, _args: Record<string, unknown>) => {
    const result = await ableton.createReturnTrack();
    return {
      success: true,
      track_name: result.name,
      message: `Created return track "${result.name}"`,
    };
  },
};

// ── Tool: delete_track ──────────────────────────────────────────

export const deleteTrackTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "delete_track",
      description:
        "Delete a track from the Ableton Live session by its index. Use with caution — this cannot be undone via this tool.",
      parameters: {
        type: "object",
        properties: {
          track_index: {
            type: "number",
            description: "Zero-based index of the track to delete.",
          },
        },
        required: ["track_index"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    await ableton.deleteTrack(args.track_index as number);
    return {
      success: true,
      message: `Deleted track at index ${args.track_index}`,
    };
  },
};

// ── Tool: duplicate_track ───────────────────────────────────────

export const duplicateTrackTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "duplicate_track",
      description:
        "Duplicate an existing track including all its devices, clips, and settings.",
      parameters: {
        type: "object",
        properties: {
          track_index: {
            type: "number",
            description: "Zero-based index of the track to duplicate.",
          },
        },
        required: ["track_index"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    await ableton.duplicateTrack(args.track_index as number);
    return {
      success: true,
      message: `Duplicated track at index ${args.track_index}`,
    };
  },
};
