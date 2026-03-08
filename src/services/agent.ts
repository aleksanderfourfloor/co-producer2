import { AIService, AgentEvent } from "./ai.js";
import { AbletonService } from "./ableton.js";

// ── Types ──────────────────────────────────────────────────────

export interface AgentStep {
  type: "plan" | "action" | "evaluation" | "iteration" | "complete" | "error";
  description: string;
  data?: unknown;
}

// ── Agent Service ──────────────────────────────────────────────

export class AgentService {
  private ai: AIService;
  private ableton: AbletonService;

  constructor(ableton: AbletonService) {
    this.ableton = ableton;
    this.ai = new AIService(ableton);
  }

  /**
   * Process a user message — can be a chat message or an autonomous goal.
   * Yields agent events as it works.
   */
  async *processMessage(message: string): AsyncGenerator<AgentEvent> {
    // Check Ableton connection
    if (!this.ableton.isConnected()) {
      yield {
        type: "error",
        data: {
          message:
            "Not connected to Ableton Live. Please make sure Ableton is running with the AbletonJS control surface enabled.",
        },
      };
      return;
    }

    // Delegate to AI service which handles the tool-calling loop
    for await (const event of this.ai.chat(message)) {
      yield event;
    }
  }

  /**
   * Autonomous producer mode — give it a high-level goal and it works
   * through multiple phases: plan → act → evaluate → iterate
   */
  async *executeGoal(goal: string): AsyncGenerator<AgentEvent> {
    if (!this.ableton.isConnected()) {
      yield {
        type: "error",
        data: { message: "Not connected to Ableton Live." },
      };
      return;
    }

    // Wrap the goal in an autonomous-mode prompt
    const autonomousPrompt = `
I want you to work autonomously to achieve this goal: "${goal}"

Work through these phases:
1. INSPECT: First, get the session info to understand what we're working with
2. PLAN: Describe your plan for what you'll create (what tracks, what patterns, what key/tempo)
3. ACT: Execute your plan by creating clips and setting parameters
4. VERIFY: Read back what you created to confirm it's correct
5. REPORT: Summarize what you did and explain your musical choices

Be creative and make it sound good! Use proper music theory, add velocity variation for feel, and think about how the parts work together.`;

    for await (const event of this.ai.chat(autonomousPrompt)) {
      yield event;
    }
  }

  /** Reset the conversation for a fresh session */
  reset(): void {
    this.ai.resetConversation();
  }
}
