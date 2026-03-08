import { AbletonService, MidiNote } from "../services/ableton.js";

// ── Tool: remove_notes ──────────────────────────────────────────

export const removeNotesTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "remove_notes",
      description: `Remove MIDI notes from a clip within a specified time and pitch range.
Use this to delete specific notes — for example, remove all kick notes, remove notes in a specific bar, or clear a pitch range.

Examples:
- Remove ALL notes: fromTime=0, fromPitch=0, timeSpan=9999, pitchSpan=128
- Remove notes in bar 2 only (beats 4-8): fromTime=4, fromPitch=0, timeSpan=4, pitchSpan=128
- Remove all kick notes (pitch 36): fromTime=0, fromPitch=36, timeSpan=9999, pitchSpan=1
- Remove notes between C3-C4: fromTime=0, fromPitch=60, timeSpan=9999, pitchSpan=12`,
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
          from_time: {
            type: "number",
            description: "Start time in beats (0 = beginning of clip).",
          },
          from_pitch: {
            type: "number",
            description: "Start pitch (0-127). 0 for all pitches.",
          },
          time_span: {
            type: "number",
            description: "Time range in beats to remove notes from. Use 9999 for all.",
          },
          pitch_span: {
            type: "number",
            description: "Pitch range (number of semitones). 128 for all pitches, 1 for a single pitch.",
          },
        },
        required: ["track_index", "clip_slot_index", "from_time", "from_pitch", "time_span", "pitch_span"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    await ableton.removeNotes(
      args.track_index as number,
      args.clip_slot_index as number,
      args.from_time as number,
      args.from_pitch as number,
      args.time_span as number,
      args.pitch_span as number
    );
    return {
      success: true,
      message: `Removed notes in range: time=${args.from_time}-${(args.from_time as number) + (args.time_span as number)}, pitch=${args.from_pitch}-${(args.from_pitch as number) + (args.pitch_span as number)}`,
    };
  },
};

// ── Tool: replace_all_notes ─────────────────────────────────────

export const replaceAllNotesTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "replace_all_notes",
      description: `Replace ALL notes in a clip with a new set of notes. This clears the clip completely and writes new notes.
Use this when you want to completely rewrite a pattern rather than add to it.
This is the best way to iteratively refine a pattern — read the notes, modify them, then replace.`,
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
          notes: {
            type: "array",
            description: "The complete new set of MIDI notes for the clip.",
            items: {
              type: "object",
              properties: {
                pitch: { type: "number", description: "MIDI pitch (0-127)." },
                start_time: { type: "number", description: "Start time in beats." },
                duration: { type: "number", description: "Duration in beats." },
                velocity: { type: "number", description: "Velocity 1-127." },
              },
              required: ["pitch", "start_time", "duration", "velocity"],
            },
          },
        },
        required: ["track_index", "clip_slot_index", "notes"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    const notes = (args.notes as any[]).map(
      (n): MidiNote => ({
        pitch: n.pitch,
        start_time: n.start_time,
        duration: n.duration,
        velocity: n.velocity,
        mute: false,
      })
    );

    await ableton.replaceAllNotes(
      args.track_index as number,
      args.clip_slot_index as number,
      notes
    );

    return {
      success: true,
      notes_written: notes.length,
      message: `Replaced all notes with ${notes.length} new notes`,
    };
  },
};

// ── Tool: quantize_clip ─────────────────────────────────────────

export const quantizeClipTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "quantize_clip",
      description: `Quantize all notes in a clip to a grid. This snaps note start times to the nearest grid position.
Use this to tighten up timing after recording or to make patterns more rigid.

Grid values: 1=quarter note, 2=eighth note, 3=eighth triplet, 4=sixteenth note, 5=sixteenth triplet, 6=thirty-second note
Amount: 1.0 = full quantize (snap exactly to grid), 0.5 = half quantize (move halfway to grid)`,
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
          grid: {
            type: "number",
            description: "Quantize grid: 1=quarter, 2=eighth, 3=eighth triplet, 4=sixteenth, 5=sixteenth triplet, 6=thirty-second.",
          },
          amount: {
            type: "number",
            description: "Quantize strength from 0.0 (no change) to 1.0 (full snap). Default 1.0.",
          },
        },
        required: ["track_index", "clip_slot_index", "grid", "amount"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    await ableton.quantizeClip(
      args.track_index as number,
      args.clip_slot_index as number,
      args.grid as number,
      args.amount as number
    );
    return {
      success: true,
      message: `Quantized clip to grid ${args.grid} with amount ${args.amount}`,
    };
  },
};

// ── Tool: duplicate_clip_loop ───────────────────────────────────

export const duplicateClipLoopTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "duplicate_clip_loop",
      description:
        "Double the length of a clip's loop and duplicate all notes and envelopes into the new half. Great for creating variations — duplicate the loop, then modify the second half.",
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
        },
        required: ["track_index", "clip_slot_index"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    await ableton.duplicateClipLoop(
      args.track_index as number,
      args.clip_slot_index as number
    );
    return {
      success: true,
      message: `Duplicated clip loop (doubled length with copied content)`,
    };
  },
};
