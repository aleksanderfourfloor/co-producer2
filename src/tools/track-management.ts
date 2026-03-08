import { AbletonService } from "../services/ableton.js";

// ── Tool: rename_track ──────────────────────────────────────────

export const renameTrackTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "rename_track",
      description:
        "Rename a track in the Ableton Live session. Use this to give tracks meaningful names like 'Kick', 'Bass', 'Lead Synth', etc.",
      parameters: {
        type: "object",
        properties: {
          track_index: {
            type: "number",
            description: "Zero-based index of the track to rename.",
          },
          name: {
            type: "string",
            description: "The new name for the track.",
          },
        },
        required: ["track_index", "name"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    await ableton.renameTrack(args.track_index as number, args.name as string);
    return {
      success: true,
      message: `Renamed track ${args.track_index} to "${args.name}"`,
    };
  },
};

// ── Tool: set_track_mute ────────────────────────────────────────

export const setTrackMuteTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "set_track_mute",
      description: "Mute or unmute a track in the Ableton Live session.",
      parameters: {
        type: "object",
        properties: {
          track_index: {
            type: "number",
            description: "Zero-based index of the track.",
          },
          mute: {
            type: "boolean",
            description: "True to mute the track, false to unmute.",
          },
        },
        required: ["track_index", "mute"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    await ableton.setTrackMute(args.track_index as number, args.mute as boolean);
    return {
      success: true,
      message: `Track ${args.track_index} ${args.mute ? "muted" : "unmuted"}`,
    };
  },
};

// ── Tool: set_track_solo ────────────────────────────────────────

export const setTrackSoloTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "set_track_solo",
      description: "Solo or unsolo a track in the Ableton Live session.",
      parameters: {
        type: "object",
        properties: {
          track_index: {
            type: "number",
            description: "Zero-based index of the track.",
          },
          solo: {
            type: "boolean",
            description: "True to solo the track, false to unsolo.",
          },
        },
        required: ["track_index", "solo"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    await ableton.setTrackSolo(args.track_index as number, args.solo as boolean);
    return {
      success: true,
      message: `Track ${args.track_index} ${args.solo ? "soloed" : "unsoloed"}`,
    };
  },
};

// ── Tool: set_track_volume ──────────────────────────────────────

export const setTrackVolumeTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "set_track_volume",
      description:
        "Set the volume of a track. Value is 0.0 (silence) to 1.0 (0 dB). Default is 0.85 (~0 dB).",
      parameters: {
        type: "object",
        properties: {
          track_index: {
            type: "number",
            description: "Zero-based index of the track.",
          },
          value: {
            type: "number",
            description: "Volume value from 0.0 (silence) to 1.0 (0 dB).",
          },
        },
        required: ["track_index", "value"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    await ableton.setTrackVolume(args.track_index as number, args.value as number);
    return {
      success: true,
      message: `Set track ${args.track_index} volume to ${args.value}`,
    };
  },
};

// ── Tool: set_track_panning ─────────────────────────────────────

export const setTrackPanningTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "set_track_panning",
      description:
        "Set the panning of a track. Value ranges from -1.0 (hard left) through 0.0 (center) to 1.0 (hard right).",
      parameters: {
        type: "object",
        properties: {
          track_index: {
            type: "number",
            description: "Zero-based index of the track.",
          },
          value: {
            type: "number",
            description: "Panning value from -1.0 (left) to 1.0 (right). 0.0 is center.",
          },
        },
        required: ["track_index", "value"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    await ableton.setTrackPanning(args.track_index as number, args.value as number);
    return {
      success: true,
      message: `Set track ${args.track_index} panning to ${args.value}`,
    };
  },
};

// ── Tool: set_track_color ───────────────────────────────────────

export const setTrackColorTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "set_track_color",
      description:
        "Set the color of a track using Ableton's color index (0-69). Some common colors: 0=salmon, 1=orange, 2=light orange, 9=red, 13=green, 17=aqua, 20=blue, 24=purple, 26=pink, 48=dark blue, 60=grey, 69=white.",
      parameters: {
        type: "object",
        properties: {
          track_index: {
            type: "number",
            description: "Zero-based index of the track.",
          },
          color_index: {
            type: "number",
            description: "Ableton color index (0-69).",
          },
        },
        required: ["track_index", "color_index"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    await ableton.setTrackColor(args.track_index as number, args.color_index as number);
    return {
      success: true,
      message: `Set track ${args.track_index} color to index ${args.color_index}`,
    };
  },
};

// ── Tool: arm_track ─────────────────────────────────────────────

export const armTrackTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "arm_track",
      description:
        "Arm or disarm a track for recording. The track must support arming (e.g., MIDI or audio tracks).",
      parameters: {
        type: "object",
        properties: {
          track_index: {
            type: "number",
            description: "Zero-based index of the track.",
          },
          arm: {
            type: "boolean",
            description: "True to arm the track, false to disarm.",
          },
        },
        required: ["track_index", "arm"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    await ableton.armTrack(args.track_index as number, args.arm as boolean);
    return {
      success: true,
      message: `Track ${args.track_index} ${args.arm ? "armed" : "disarmed"}`,
    };
  },
};
