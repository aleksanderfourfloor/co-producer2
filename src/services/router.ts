import OpenAI from "openai";
import { TOOL_GROUPS } from "../tools/index.js";

export type IntentCategory = "simple" | "creative" | "edit" | "question";
export type ModelProvider = "ollama" | "openai";

export interface RoutingDecision {
  intent: IntentCategory;
  model: string;
  provider: ModelProvider;
  tools: string[];
}

export class RouterService {
  private openai: OpenAI;
  private localModel: string;
  private fastModel: string;
  private mainModel: string;
  private ollamaAvailable: boolean;
  private allTools: string[];

  constructor() {
    this.openai = new OpenAI();
    this.localModel = process.env.OLLAMA_MODEL || "llama3.1:8b";
    this.fastModel = process.env.OPENAI_MODEL_FAST || "gpt-4o-mini";
    this.mainModel = process.env.OPENAI_MODEL || "gpt-4o";
    this.ollamaAvailable = !!process.env.OLLAMA_BASE_URL;
    
    // Flatten all tools exactly once
    this.allTools = Object.values(TOOL_GROUPS).flat();
  }

  /**
   * Classify the user intent and return a routing decision (provider + model + tool subset)
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
        ...this.pickProviderAndModel("simple"),
        tools: [...TOOL_GROUPS.transport, ...TOOL_GROUPS.session, ...TOOL_GROUPS.trackOps, ...TOOL_GROUPS.ux]
      };
    }

    // 2. LLM path: Ask the fast API model to classify the intent (reliable classifier)
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
   * Picks the provider and model based on intent tier
   */
  private pickProviderAndModel(intent: IntentCategory): { provider: ModelProvider; model: string } {
    switch (intent) {
      case "simple":
      case "question":
        // Tier 1: Local model (free) for simple stuff
        if (this.ollamaAvailable) {
          return { provider: "ollama", model: this.localModel };
        }
        // Fall through to fast API if Ollama is not configured
        return { provider: "openai", model: this.fastModel };

      case "edit":
        // Tier 2: Fast API model (cheap) for editing
        return { provider: "openai", model: this.fastModel };

      case "creative":
      default:
        // Tier 3: Premium API model (expensive) for creative work
        return { provider: "openai", model: this.mainModel };
    }
  }

  /**
   * Builds the full routing decision based on intent
   */
  private buildDecision(intent: IntentCategory): RoutingDecision {
    const { provider, model } = this.pickProviderAndModel(intent);

    switch (intent) {
      case "simple":
        return {
          intent, provider, model,
          tools: [
            ...TOOL_GROUPS.session,
            ...TOOL_GROUPS.transport,
            ...TOOL_GROUPS.trackOps,
            ...TOOL_GROUPS.clipProps,
            ...TOOL_GROUPS.scenes,
            ...TOOL_GROUPS.ux
          ]
        };

      case "edit":
        return {
          intent, provider, model,
          tools: [
            ...TOOL_GROUPS.session,
            ...TOOL_GROUPS.midi,
            ...TOOL_GROUPS.clipProps,
            ...TOOL_GROUPS.trackOps,
            ...TOOL_GROUPS.devices,
            ...TOOL_GROUPS.ux
          ]
        };

      case "question":
        return {
          intent, provider, model,
          tools: [
            ...TOOL_GROUPS.session,
            ...TOOL_GROUPS.ux
          ]
        };

      case "creative":
      default:
        return {
          intent: "creative", provider, model,
          tools: this.allTools
        };
    }
  }
}
