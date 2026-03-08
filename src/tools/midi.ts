import { AbletonService, MidiNote } from "../services/ableton.js";

// ── Tool: get_clip_notes ────────────────────────────────────────

export const getClipNotesTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "get_clip_notes",
      description:
        "Read all MIDI notes from a clip in a specific track and clip slot. Returns pitch (0-127), start_time (beats), duration (beats), velocity (0-127) for each note.",
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
    const notes = await ableton.getClipNotes(
      args.track_index as number,
      args.clip_slot_index as number
    );
    return {
      note_count: notes.length,
      notes,
    };
  },
};

// ── Tool: create_midi_clip ──────────────────────────────────────

export const createMidiClipTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "create_midi_clip",
      description: `Create a new MIDI clip with notes in a specific track and clip slot.
      
MIDI note reference:
- Kick: 36, Snare: 38, Closed HH: 42, Open HH: 46, Clap: 39
- C3=60, D3=62, E3=64, F3=65, G3=67, A3=69, B3=71
- C4=72, C2=48, C1=36

Timing: 1 beat = quarter note. A 4-bar clip in 4/4 = 16 beats.
Velocity: 1-127 (100 is a good default, vary for dynamics).`,
      parameters: {
        type: "object",
        properties: {
          track_index: {
            type: "number",
            description: "Zero-based index of the MIDI track.",
          },
          clip_slot_index: {
            type: "number",
            description: "Zero-based index of the clip slot.",
          },
          length_beats: {
            type: "number",
            description: "Length of the clip in beats (e.g., 16 for 4 bars in 4/4).",
          },
          notes: {
            type: "array",
            description: "Array of MIDI notes to add to the clip.",
            items: {
              type: "object",
              properties: {
                pitch: {
                  type: "number",
                  description: "MIDI pitch (0-127). E.g., 60 = C3, 36 = kick drum.",
                },
                start_time: {
                  type: "number",
                  description: "Start time in beats from the beginning of the clip.",
                },
                duration: {
                  type: "number",
                  description: "Duration in beats (0.25 = sixteenth note, 0.5 = eighth, 1 = quarter).",
                },
                velocity: {
                  type: "number",
                  description: "Velocity 1-127 (default 100).",
                },
              },
              required: ["pitch", "start_time", "duration", "velocity"],
            },
          },
        },
        required: ["track_index", "clip_slot_index", "length_beats", "notes"],
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

    const clipName = await ableton.createMidiClip(
      args.track_index as number,
      args.clip_slot_index as number,
      args.length_beats as number,
      notes
    );

    return {
      success: true,
      clip_name: clipName,
      notes_written: notes.length,
      length_beats: args.length_beats,
      message: `Created clip "${clipName}" with ${notes.length} notes`,
    };
  },
};

// ── Tool: add_notes_to_clip ─────────────────────────────────────

export const addNotesToClipTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "add_notes_to_clip",
      description:
        "Add MIDI notes to an existing clip in a specific track and clip slot. The clip must already exist.",
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
            description: "Array of MIDI notes to add.",
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

    await ableton.addNotesToClip(
      args.track_index as number,
      args.clip_slot_index as number,
      notes
    );

    return {
      success: true,
      notes_added: notes.length,
      message: `Added ${notes.length} notes to existing clip`,
    };
  },
};
