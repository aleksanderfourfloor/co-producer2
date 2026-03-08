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

// ── Tool: undo ──────────────────────────────────────────────────

export const undoTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "undo",
      description: "Undo the last action in Ableton Live. Useful for reverting mistakes.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  handler: async (ableton: AbletonService, _args: Record<string, unknown>) => {
    await ableton.undo();
    return { success: true, message: "Undo performed" };
  },
};

// ── Tool: redo ──────────────────────────────────────────────────

export const redoTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "redo",
      description: "Redo the last undone action in Ableton Live.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  handler: async (ableton: AbletonService, _args: Record<string, unknown>) => {
    await ableton.redo();
    return { success: true, message: "Redo performed" };
  },
};

// ── Tool: stop_all_clips ────────────────────────────────────────

export const stopAllClipsTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "stop_all_clips",
      description: "Stop all currently playing clips in the Ableton Live session.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  handler: async (ableton: AbletonService, _args: Record<string, unknown>) => {
    await ableton.stopAllClips();
    return { success: true, message: "All clips stopped" };
  },
};

// ── Tool: set_groove ────────────────────────────────────────────

export const setGrooveTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "set_groove",
      description:
        "Set the global groove amount for the session. Controls how much groove templates affect timing. Value from 0.0 (no groove) to 1.0 (full groove).",
      parameters: {
        type: "object",
        properties: {
          amount: {
            type: "number",
            description: "Groove amount from 0.0 to 1.0.",
          },
        },
        required: ["amount"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    await ableton.setGrooveAmount(args.amount as number);
    return { success: true, message: `Groove amount set to ${args.amount}` };
  },
};

// ── Tool: set_swing ─────────────────────────────────────────────

export const setSwingTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "set_swing",
      description:
        "Set the global swing amount for the session. Swing shifts every other note slightly later to create a 'shuffled' feel. Value from 0.0 (no swing) to 1.0 (maximum swing).",
      parameters: {
        type: "object",
        properties: {
          amount: {
            type: "number",
            description: "Swing amount from 0.0 to 1.0.",
          },
        },
        required: ["amount"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    await ableton.setSwingAmount(args.amount as number);
    return { success: true, message: `Swing amount set to ${args.amount}` };
  },
};

// ── Tool: set_time_signature ────────────────────────────────────

export const setTimeSignatureTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "set_time_signature",
      description:
        "Set the time signature of the Ableton Live session. Common time signatures: 4/4 (default), 3/4 (waltz), 6/8 (compound), 5/4, 7/8.",
      parameters: {
        type: "object",
        properties: {
          numerator: {
            type: "number",
            description: "Top number of time signature (beats per bar). E.g., 4 for 4/4.",
          },
          denominator: {
            type: "number",
            description: "Bottom number of time signature (note value). E.g., 4 for quarter note.",
          },
        },
        required: ["numerator", "denominator"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    await ableton.setTimeSignature(args.numerator as number, args.denominator as number);
    return {
      success: true,
      message: `Time signature set to ${args.numerator}/${args.denominator}`,
    };
  },
};
