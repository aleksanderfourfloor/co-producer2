import { AbletonService } from "../services/ableton.js";

// ── Tool: fire_scene ────────────────────────────────────────────

export const fireSceneTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "fire_scene",
      description:
        "Launch/fire a scene, which fires all clips in that row simultaneously. Great for launching full arrangements or switching between sections.",
      parameters: {
        type: "object",
        properties: {
          scene_index: {
            type: "number",
            description: "Zero-based index of the scene to fire.",
          },
        },
        required: ["scene_index"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    await ableton.fireScene(args.scene_index as number);
    return {
      success: true,
      message: `Fired scene ${args.scene_index}`,
    };
  },
};

// ── Tool: create_scene ──────────────────────────────────────────

export const createSceneTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "create_scene",
      description: "Create a new scene in the Ableton Live session.",
      parameters: {
        type: "object",
        properties: {
          index: {
            type: "number",
            description:
              "Optional zero-based index where the scene should be inserted. If not provided, the scene is added at the end.",
          },
        },
        required: [],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    const result = await ableton.createScene(args.index as number | undefined);
    return {
      success: true,
      scene_index: result.index,
      scene_name: result.name,
      message: `Created scene "${result.name}" at index ${result.index}`,
    };
  },
};

// ── Tool: delete_scene ──────────────────────────────────────────

export const deleteSceneTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "delete_scene",
      description: "Delete a scene from the Ableton Live session by its index.",
      parameters: {
        type: "object",
        properties: {
          scene_index: {
            type: "number",
            description: "Zero-based index of the scene to delete.",
          },
        },
        required: ["scene_index"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    await ableton.deleteScene(args.scene_index as number);
    return {
      success: true,
      message: `Deleted scene at index ${args.scene_index}`,
    };
  },
};

// ── Tool: duplicate_scene ───────────────────────────────────────

export const duplicateSceneTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "duplicate_scene",
      description:
        "Duplicate an existing scene including all its clips and settings.",
      parameters: {
        type: "object",
        properties: {
          scene_index: {
            type: "number",
            description: "Zero-based index of the scene to duplicate.",
          },
        },
        required: ["scene_index"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    await ableton.duplicateScene(args.scene_index as number);
    return {
      success: true,
      message: `Duplicated scene at index ${args.scene_index}`,
    };
  },
};
