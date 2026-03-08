import { AbletonService } from "../services/ableton.js";

// ── Tool: play ──────────────────────────────────────────────────

export const playTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "play",
      description: "Start playback in Ableton Live.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  handler: async (ableton: AbletonService, _args: Record<string, unknown>) => {
    await ableton.play();
    return { success: true, message: "Playback started" };
  },
};

// ── Tool: stop ──────────────────────────────────────────────────

export const stopTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "stop",
      description: "Stop playback in Ableton Live.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  handler: async (ableton: AbletonService, _args: Record<string, unknown>) => {
    await ableton.stop();
    return { success: true, message: "Playback stopped" };
  },
};

// ── Tool: set_tempo ─────────────────────────────────────────────

export const setTempoTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "set_tempo",
      description: "Set the tempo (BPM) of the Ableton Live session. Must be between 20 and 999.",
      parameters: {
        type: "object",
        properties: {
          bpm: {
            type: "number",
            description: "The tempo in beats per minute (20-999).",
          },
        },
        required: ["bpm"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    const bpm = args.bpm as number;
    await ableton.setTempo(bpm);
    return { success: true, message: `Tempo set to ${bpm} BPM` };
  },
};
