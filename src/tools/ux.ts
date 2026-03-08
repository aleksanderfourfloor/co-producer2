import { AbletonService } from "../services/ableton.js";

export const uxTools = [
  {
    definition: {
      type: "function",
      function: {
        name: "update_ui_status",
        description: "Update the user interface with a progress message like 'Browsing for drum kits...' or 'Creating bassline...'. Use this frequently during long multi-step goals so the user knows what you are doing.",
        parameters: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
          required: ["message"],
        },
      },
    },
    handler: async (ableton: AbletonService, args: any) => {
      // This is a no-op on the server side, as the WebSocket intercepts the tool_call event directly to update the UI
      return { success: true, message: "UI updated" };
    },
  },
];
