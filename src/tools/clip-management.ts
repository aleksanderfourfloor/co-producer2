import { AbletonService } from "../services/ableton.js";

// ── Tool: rename_clip ───────────────────────────────────────────

export const renameClipTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "rename_clip",
      description:
        "Rename a clip in the Ableton Live session. Give clips descriptive names like 'Kick Pattern', 'Bass Groove', etc.",
      parameters: {
        type: "object",
        properties: {
          track_index: {
            type: "number",
            description: "Zero-based index of the track containing the clip.",
          },
          clip_slot_index: {
            type: "number",
            description: "Zero-based index of the clip slot.",
          },
          name: {
            type: "string",
            description: "The new name for the clip.",
          },
        },
        required: ["track_index", "clip_slot_index", "name"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    await ableton.renameClip(
      args.track_index as number,
      args.clip_slot_index as number,
      args.name as string
    );
    return {
      success: true,
      message: `Renamed clip at track ${args.track_index}, slot ${args.clip_slot_index} to "${args.name}"`,
    };
  },
};

// ── Tool: fire_clip ─────────────────────────────────────────────

export const fireClipTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "fire_clip",
      description:
        "Launch/fire a clip to start it playing. The clip must already exist in the specified slot.",
      parameters: {
        type: "object",
        properties: {
          track_index: {
            type: "number",
            description: "Zero-based index of the track.",
          },
          clip_slot_index: {
            type: "number",
            description: "Zero-based index of the clip slot to fire.",
          },
        },
        required: ["track_index", "clip_slot_index"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    await ableton.fireClip(args.track_index as number, args.clip_slot_index as number);
    return {
      success: true,
      message: `Fired clip at track ${args.track_index}, slot ${args.clip_slot_index}`,
    };
  },
};

// ── Tool: stop_clip ─────────────────────────────────────────────

export const stopClipTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "stop_clip",
      description: "Stop a currently playing clip.",
      parameters: {
        type: "object",
        properties: {
          track_index: {
            type: "number",
            description: "Zero-based index of the track.",
          },
          clip_slot_index: {
            type: "number",
            description: "Zero-based index of the clip slot to stop.",
          },
        },
        required: ["track_index", "clip_slot_index"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    await ableton.stopClip(args.track_index as number, args.clip_slot_index as number);
    return {
      success: true,
      message: `Stopped clip at track ${args.track_index}, slot ${args.clip_slot_index}`,
    };
  },
};

// ── Tool: set_clip_looping ──────────────────────────────────────

export const setClipLoopingTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "set_clip_looping",
      description: "Enable or disable looping for a clip.",
      parameters: {
        type: "object",
        properties: {
          track_index: {
            type: "number",
            description: "Zero-based index of the track.",
          },
          clip_slot_index: {
            type: "number",
            description: "Zero-based index of the clip slot.",
          },
          looping: {
            type: "boolean",
            description: "True to enable looping, false to disable.",
          },
        },
        required: ["track_index", "clip_slot_index", "looping"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    await ableton.setClipLooping(
      args.track_index as number,
      args.clip_slot_index as number,
      args.looping as boolean
    );
    return {
      success: true,
      message: `Clip looping ${args.looping ? "enabled" : "disabled"} at track ${args.track_index}, slot ${args.clip_slot_index}`,
    };
  },
};
