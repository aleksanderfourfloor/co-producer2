import { AbletonService } from "../services/ableton.js";

// ── Tool: browse_instruments ────────────────────────────────────

export const browseInstrumentsTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "browse_instruments",
      description: `Browse Ableton Live's instrument browser. Use this to discover available instruments before loading one.
You can browse the top-level categories or navigate into folders using the path parameter.
Common instruments: Analog, Collision, Drift, Electric, Operator, Sampler, Simpler, Tension, Wavetable.
For drums, use the "drums" category instead.`,
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["instruments", "drums", "sounds"],
            description: "Which browser category to browse. Use 'instruments' for synths/instruments, 'drums' for drum racks/kits, 'sounds' for preset sounds.",
          },
          path: {
            type: "array",
            items: { type: "string" },
            description: "Optional path of folder names to navigate into. E.g., ['Analog'] to see Analog presets.",
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
      return { items: items.slice(0, 30), total: items.length };
    }
    const items = await ableton.browsePath(category, path);
    return { items: items.slice(0, 30), total: items.length };
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
      return { items: items.slice(0, 30), total: items.length };
    }
    const items = await ableton.browsePath(category, path);
    return { items: items.slice(0, 30), total: items.length };
  },
};

// ── Tool: load_device ───────────────────────────────────────────

export const loadDeviceTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "load_device",
      description: `Load an instrument or effect from Ableton's browser onto the currently selected track. 
IMPORTANT: You must first select the target track before loading a device. Use browse_instruments or browse_effects first to find the correct path.
The path is an array of folder/item names to navigate to the device. Example: ["Analog"] loads the Analog synth, ["Overdrive"] loads the Overdrive effect.`,
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["instruments", "audio_effects", "midi_effects", "drums", "sounds", "samples"],
            description: "Which browser category the device is in.",
          },
          path: {
            type: "array",
            items: { type: "string" },
            description: 'Path of folder/item names to navigate to and load. E.g., ["Analog"] or ["Compressor"].',
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
