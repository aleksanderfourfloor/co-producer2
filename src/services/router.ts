import OpenAI from "openai";
import { TOOL_GROUPS } from "../tools/index.js";

export type IntentCategory = "simple" | "creative" | "edit" | "question";

export interface RoutingDecision {
  intent: IntentCategory;
  model: string;
  tools: string[];
}

export class RouterService {
  private openai: OpenAI;
  private fastModel: string;
  private mainModel: string;
  private allTools: string[];

  constructor() {
    this.openai = new OpenAI();
    this.fastModel = process.env.OPENAI_MODEL_FAST || "gpt-4o-mini";
    this.mainModel = process.env.OPENAI_MODEL || "gpt-4o";
    
    // Flatten all tools exactly once
    this.allTools = Object.values(TOOL_GROUPS).flat();
  }

  /**
   * Classify the user intent and return a routing decision (model + tool subset)
   */
  async routeMessage(message: string): Promise<RoutingDecision> {
    // 1. Fast path: Keyword matching for common simple commands
    const lowerMessage = message.toLowerCase();
    const simpleKeywords = [
      "play", "stop", "pause", "tempo", "bpm", 
      "mute", "solo", "unmute", "unsolo",
      "undo", "redo"
    ];

    // If message is very short and contains a simple keyword, bypass LLM classifier
    if (message.length < 50 && simpleKeywords.some(k => lowerMessage.includes(k))) {
      return {
        intent: "simple",
        model: this.fastModel,
        tools: [...TOOL_GROUPS.transport, ...TOOL_GROUPS.session, ...TOOL_GROUPS.trackOps]
      };
    }

    // 2. LLM path: Ask the fast model to classify the intent
    try {
      const response = await this.openai.chat.completions.create({
        model: this.fastModel,
        messages: [{
          role: 'system',
          content: `Classify the user's music production request into EXACTLY ONE of these categories:
- "simple": Direct simple actions (play, stop, set tempo, mute, rename, volume, pan, color, undo/redo)
- "creative": Creating new musical content (making beats, writing melodies, finding chords, creating full tracks, adding instruments)
- "edit": Modifying existing content (quantizing, deleting notes, changing velocity, replacing notes)
- "question": Asking for advice, music theory, querying session info without taking action

Respond with ONLY the category name in lowercase: "simple", "creative", "edit", or "question".`
        }, {
          role: 'user',
          content: message
        }],
        temperature: 0,
        max_tokens: 10,
      });

      const intentText = (response.choices[0]?.message?.content || "").trim().toLowerCase();
      
      let intent: IntentCategory = "creative"; // fallback to safest/most capable
      if (["simple", "creative", "edit", "question"].includes(intentText)) {
        intent = intentText as IntentCategory;
      }
      
      return this.buildDecision(intent);
    } catch (err) {
      console.warn("[Router] Failed to classify intent, falling back to full model:", err);
      // Fallback
      return this.buildDecision("creative");
    }
  }

  /**
   * Builds the model and tools list based on intent
   */
  private buildDecision(intent: IntentCategory): RoutingDecision {
    switch (intent) {
      case "simple":
        // Fast model, basic tools + session context
        return {
          intent,
          model: this.fastModel,
          tools: [
            ...TOOL_GROUPS.session,
            ...TOOL_GROUPS.transport,
            ...TOOL_GROUPS.trackOps,
            ...TOOL_GROUPS.clipProps,
            ...TOOL_GROUPS.scenes
          ]
        };

      case "edit":
        // Fast model is often good enough for focused editing with subset tools
        return {
          intent,
          model: this.fastModel,
          tools: [
            ...TOOL_GROUPS.session,
            ...TOOL_GROUPS.midi,
            ...TOOL_GROUPS.clipProps,
            ...TOOL_GROUPS.trackOps,
            ...TOOL_GROUPS.devices
          ]
        };

      case "question":
        // Fast model, just needs session info to answer
        return {
          intent,
          model: this.fastModel,
          tools: [
            ...TOOL_GROUPS.session
          ]
        };

      case "creative":
      default:
        // Complex work gets the main model and all tools
        return {
          intent: "creative",
          model: this.mainModel,
          tools: this.allTools
        };
    }
  }
}
