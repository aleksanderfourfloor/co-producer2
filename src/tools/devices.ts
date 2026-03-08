import { AbletonService } from "../services/ableton.js";

// ── Tool: browse_instruments ────────────────────────────────────

export const browseInstrumentsTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "browse_instruments",
      description: `Browse Ableton Live's browser for instruments, drums, sounds, and samples. Use this to discover what's available before loading.

Categories:
- "instruments": Synths like Analog, Drift, Operator, Wavetable, Simpler, Sampler
- "drums": Drum Racks and kits. Common paths:
  - ["Drum Rack"] → full drum rack presets (e.g., "Kit-909", "Kit-808", "Kit-Acoustik")
  - ["Drum Hits"] → individual hits organized by type:
    - ["Drum Hits", "Kick"] → kick samples (909, 808, acoustic, etc.)
    - ["Drum Hits", "Snare"] → snare samples
    - ["Drum Hits", "Hihat"] → hihat samples
    - ["Drum Hits", "Clap"] → clap samples
    - ["Drum Hits", "Percussion"] → percussion samples
- "sounds": Preset sounds organized by type (Bass, Keys, Lead, Pad, etc.)
- "samples": Raw audio samples from Ableton's library and installed packs

Tips:
- Always browse first to see what's available before trying to load
- Navigate step by step: first browse the category, then drill into subfolders
- If you don't find what you need, try a different category or path`,
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["instruments", "drums", "sounds", "samples"],
            description: "Which browser category to browse. Use 'instruments' for synths, 'drums' for drum racks/kits/hits, 'sounds' for preset sounds, 'samples' for raw audio samples.",
          },
          path: {
            type: "array",
            items: { type: "string" },
            description: "Optional path of folder names to navigate into. E.g., ['Drum Hits', 'Kick'] to browse kick drum samples, or ['Drum Rack'] to see drum rack presets.",
          },
        },
        required: ["category"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    const category = args.category as any;
    const path = (args.path as string[]) ?? [];

    if (path.length === 0) {
      const items = await ableton.browseCategory(category);
      return { items: items.slice(0, 50), total: items.length, hint: "Navigate into folders using the 'path' parameter to explore deeper." };
    }
    const items = await ableton.browsePath(category, path);
    return { items: items.slice(0, 50), total: items.length };
  },
};

// ── Tool: browse_effects ────────────────────────────────────────

export const browseEffectsTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "browse_effects",
      description: `Browse Ableton Live's effects browser. Use this to discover available audio and MIDI effects before loading one.
Common audio effects: Amp, Auto Filter, Auto Pan, Beat Repeat, Chorus-Ensemble, Compressor, Corpus, Delay, Drum Buss, Dynamic Tube, Echo, EQ Eight, EQ Three, Erosion, Filter Delay, Flanger, Freq Shifter, Gate, Glue Compressor, Grain Delay, Hybrid Reverb, Limiter, Looper, Multiband Dynamics, Overdrive, Pedal, Phaser-Flanger, Redux, Resonators, Reverb, Saturator, Shifter, Spectral Blur, Spectral Time, Utility, Vinyl Distortion, Vocoder.
Common MIDI effects: Arpeggiator, Chord, Note Length, Pitch, Random, Scale, Velocity.`,
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["audio_effects", "midi_effects"],
            description: "Which effects category to browse.",
          },
          path: {
            type: "array",
            items: { type: "string" },
            description: "Optional path of folder names to navigate into. E.g., ['Compressor'] to see Compressor presets.",
          },
        },
        required: ["category"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    const category = args.category as any;
    const path = (args.path as string[]) ?? [];

    if (path.length === 0) {
      const items = await ableton.browseCategory(category);
      return { items: items.slice(0, 50), total: items.length };
    }
    const items = await ableton.browsePath(category, path);
    return { items: items.slice(0, 50), total: items.length };
  },
};

// ── Tool: load_device ───────────────────────────────────────────

export const loadDeviceTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "load_device",
      description: `Load an instrument, effect, drum kit, or sample from Ableton's browser onto the currently selected track.

IMPORTANT: Always use browse_instruments or browse_effects FIRST to discover the exact path, then load.

Common loading examples:
- Instrument: category="instruments", path=["Analog"] or ["Drift"]
- 909 drum kit: category="drums", path=["Drum Rack", "Kit-909"]
- 808 drum kit: category="drums", path=["Drum Rack", "Kit-808"]
- Individual kick: category="drums", path=["Drum Hits", "Kick", "909 Kick"]
- Effect: category="audio_effects", path=["Compressor"]
- Sound preset: category="sounds", path=["Bass", "..."]

If the exact name doesn't match, browse the folder first to see available items.`,
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["instruments", "audio_effects", "midi_effects", "drums", "sounds", "samples"],
            description: "Which browser category the device/sample is in.",
          },
          path: {
            type: "array",
            items: { type: "string" },
            description: 'Path of folder/item names to navigate to and load. Always browse first if unsure of the exact path.',
          },
        },
        required: ["category", "path"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    const category = args.category as any;
    const path = args.path as string[];

    const loadedName = await ableton.loadBrowserItem(category, path);
    return {
      success: true,
      loaded: loadedName,
      message: `Loaded "${loadedName}" onto the selected track`,
    };
  },
};

// ── Tool: get_device_parameters ─────────────────────────────────

export const getDeviceParametersTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "get_device_parameters",
      description:
        "Get all parameters of a device on a track, including their current values, min, and max. Use this to inspect device settings before modifying them.",
      parameters: {
        type: "object",
        properties: {
          track_index: {
            type: "number",
            description: "Zero-based index of the track.",
          },
          device_index: {
            type: "number",
            description: "Zero-based index of the device on the track.",
          },
        },
        required: ["track_index", "device_index"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    const params = await ableton.getDeviceParameters(
      args.track_index as number,
      args.device_index as number
    );
    return { parameters: params };
  },
};

// ── Tool: set_device_parameter ──────────────────────────────────

export const setDeviceParameterTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "set_device_parameter",
      description:
        "Set a specific parameter value on a device. Use get_device_parameters first to see available parameters and their ranges.",
      parameters: {
        type: "object",
        properties: {
          track_index: {
            type: "number",
            description: "Zero-based index of the track.",
          },
          device_index: {
            type: "number",
            description: "Zero-based index of the device on the track.",
          },
          parameter_name: {
            type: "string",
            description: "Name of the parameter to set (case-insensitive).",
          },
          value: {
            type: "number",
            description: "New value for the parameter (must be within the parameter's min/max range).",
          },
        },
        required: ["track_index", "device_index", "parameter_name", "value"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    await ableton.setDeviceParameter(
      args.track_index as number,
      args.device_index as number,
      args.parameter_name as string,
      args.value as number
    );
    return {
      success: true,
      message: `Set "${args.parameter_name}" to ${args.value}`,
    };
  },
};

// ── Tool: delete_device ─────────────────────────────────────────

export const deleteDeviceTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "delete_device",
      description: "Remove a device from a track by its index.",
      parameters: {
        type: "object",
        properties: {
          track_index: {
            type: "number",
            description: "Zero-based index of the track.",
          },
          device_index: {
            type: "number",
            description: "Zero-based index of the device to remove.",
          },
        },
        required: ["track_index", "device_index"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    await ableton.deleteDevice(args.track_index as number, args.device_index as number);
    return {
      success: true,
      message: `Deleted device ${args.device_index} from track ${args.track_index}`,
    };
  },
};
