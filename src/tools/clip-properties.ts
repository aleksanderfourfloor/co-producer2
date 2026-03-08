import { AbletonService } from "../services/ableton.js";

// ── Tool: set_clip_loop_points ──────────────────────────────────

export const setClipLoopPointsTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "set_clip_loop_points",
      description:
        "Set the loop start and end points for a clip. This controls which portion of the clip loops during playback. The clip must have looping enabled.",
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
          loop_start: {
            type: "number",
            description: "Loop start position in beats.",
          },
          loop_end: {
            type: "number",
            description: "Loop end position in beats.",
          },
        },
        required: ["track_index", "clip_slot_index", "loop_start", "loop_end"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    await ableton.setClipLoopPoints(
      args.track_index as number,
      args.clip_slot_index as number,
      args.loop_start as number,
      args.loop_end as number
    );
    return {
      success: true,
      message: `Set clip loop points: ${args.loop_start} to ${args.loop_end} beats`,
    };
  },
};

// ── Tool: set_clip_markers ──────────────────────────────────────

export const setClipMarkersTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "set_clip_markers",
      description:
        "Set the start and end markers for a clip. These define the playable region of the clip when looping is disabled.",
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
          start_marker: {
            type: "number",
            description: "Start marker position in beats.",
          },
          end_marker: {
            type: "number",
            description: "End marker position in beats.",
          },
        },
        required: ["track_index", "clip_slot_index", "start_marker", "end_marker"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    await ableton.setClipMarkers(
      args.track_index as number,
      args.clip_slot_index as number,
      args.start_marker as number,
      args.end_marker as number
    );
    return {
      success: true,
      message: `Set clip markers: start=${args.start_marker}, end=${args.end_marker}`,
    };
  },
};
