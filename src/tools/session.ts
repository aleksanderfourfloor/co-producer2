import { AbletonService } from "../services/ableton.js";

// ── Tool: get_session_info ──────────────────────────────────────

export const getSessionInfoTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "get_session_info",
      description:
        "Get the current Ableton Live session information including tempo, time signature, playback state, and a list of all tracks with their names and types.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  handler: async (ableton: AbletonService, _args: Record<string, unknown>) => {
    return await ableton.getSessionInfo();
  },
};

// ── Tool: get_track_details ─────────────────────────────────────

export const getTrackDetailsTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "get_track_details",
      description:
        "Get full details about a specific track including volume, panning, devices/plugins loaded, and clip slots with clip names.",
      parameters: {
        type: "object",
        properties: {
          track_index: {
            type: "number",
            description: "The zero-based index of the track to inspect.",
          },
        },
        required: ["track_index"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    return await ableton.getTrackDetails(args.track_index as number);
  },
};
