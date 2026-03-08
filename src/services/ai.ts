import OpenAI from "openai";
import { getToolDefinitions, getToolHandler } from "../tools/index.js";
import { AbletonService } from "./ableton.js";

// ── Types ──────────────────────────────────────────────────────

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: any[];
}

export interface AgentEvent {
  type: "thinking" | "tool_call" | "tool_result" | "response" | "error";
  data: unknown;
}

// ── System Prompt ──────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert AI music co-producer working directly inside Ableton Live. You are creative, knowledgeable, and hands-on — like having a top-tier producer sitting next to the user.

## Your Capabilities
You can READ the current Ableton session (tempo, tracks, clips, MIDI notes) and WRITE to it (create clips, set notes, change tempo, control transport). You act like a real producer who can reach over and make changes in the DAW.

## Your Expertise
- Music theory: scales, chords, progressions, harmonics, key relationships
- Rhythm & groove: drum patterns, swing, ghost notes, syncopation
- Arrangement: song structure, buildups, drops, transitions, automation
- Sound design principles: layering, frequency balance, stereo width
- Genre knowledge: electronic, hip-hop, lo-fi, pop, rock, jazz, classical, and more
- Mixing concepts: EQ, compression, spatial placement, dynamics

## How You Work
1. **Understand the goal** — Ask clarifying questions if the request is vague
2. **Inspect the session** — Always check the current state before making changes
3. **Plan your approach** — Think through what you'll create before writing notes
4. **Execute** — Write MIDI, adjust tempo, etc.
5. **Verify** — Read back what you wrote to confirm it's correct
6. **Explain** — Tell the user what you did and why (teach them as you go)

## Music Theory Quick Reference
- When writing melodies/chords, always be aware of the key and scale
- Common time positions: beat 1=0, beat 2=1, beat 3=2, beat 4=3 (in a single bar)
- For a 4-bar pattern: bars are at beats 0, 4, 8, 12
- Use velocity variation for human feel (80-110 range, with accents at 120+)
- Ghost notes: velocity 30-50

## Important Rules
- Always inspect the session before making changes
- When creating patterns, think about musicality — not just technical correctness
- Add velocity variation for human feel
- Explain your musical choices to help the user learn
- If you can't do something (like audio analysis), be honest and suggest alternatives`;

// ── AI Service ─────────────────────────────────────────────────

export class AIService {
  private openai: OpenAI;
  private conversationHistory: ChatMessage[] = [];
  private ableton: AbletonService;

  constructor(ableton: AbletonService) {
    this.openai = new OpenAI();
    this.ableton = ableton;
    this.resetConversation();
  }

  resetConversation(): void {
    this.conversationHistory = [
      { role: "system", content: SYSTEM_PROMPT },
    ];
  }

  /**
   * Process a user message through the AI with tool calling.
   * Yields events as the agent thinks, calls tools, and responds.
   */
  async *chat(userMessage: string): AsyncGenerator<AgentEvent> {
    // Add user message to history
    this.conversationHistory.push({ role: "user", content: userMessage });

    // Agentic loop — keep going until we get a text response (no more tool calls)
    let iterations = 0;
    const MAX_ITERATIONS = 15; // safety limit

    while (iterations < MAX_ITERATIONS) {
      iterations++;

      yield { type: "thinking", data: { iteration: iterations } };

      // Call OpenAI with retry logic for rate limits
      let response;
      const MAX_RETRIES = 5;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          response = await this.openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: this.conversationHistory as any,
            tools: getToolDefinitions() as any,
            tool_choice: "auto",
            temperature: 0.7,
          });
          break; // success
        } catch (err: any) {
          // Retry on rate limit (429) errors
          if (err?.status === 429 && attempt < MAX_RETRIES - 1) {
            const waitMs = Math.min(1000 * Math.pow(2, attempt), 10000);
            yield { type: "thinking", data: { message: `Rate limited, retrying in ${waitMs}ms...` } };
            await new Promise((r) => setTimeout(r, waitMs));
            continue;
          }
          yield { type: "error", data: { message: `OpenAI error: ${err.message}` } };
          return;
        }
      }
      if (!response) {
        yield { type: "error", data: { message: "Failed after retries" } };
        return;
      }

      const choice = response.choices[0];
      if (!choice) {
        yield { type: "error", data: { message: "No response from AI" } };
        return;
      }

      const message = choice.message;

      // Add assistant message to history
      this.conversationHistory.push({
        role: "assistant",
        content: message.content ?? "",
        tool_calls: message.tool_calls,
      });

      // If there are tool calls, execute them
      if (message.tool_calls && message.tool_calls.length > 0) {
        for (const toolCall of message.tool_calls) {
          const toolName = toolCall.function.name;
          let toolArgs: Record<string, unknown> = {};

          try {
            toolArgs = JSON.parse(toolCall.function.arguments || "{}");
          } catch {
            toolArgs = {};
          }

          yield {
            type: "tool_call",
            data: { name: toolName, args: toolArgs, id: toolCall.id },
          };

          // Execute the tool
          let result: unknown;
          try {
            const handler = getToolHandler(toolName);
            if (!handler) {
              throw new Error(`Unknown tool: ${toolName}`);
            }
            result = await handler(this.ableton, toolArgs);
          } catch (err: any) {
            result = { error: err.message };
          }

          yield {
            type: "tool_result",
            data: { name: toolName, result, id: toolCall.id },
          };

          // Add tool result to history
          this.conversationHistory.push({
            role: "tool",
            content: JSON.stringify(result),
            tool_call_id: toolCall.id,
          });
        }

        // Continue the loop — AI will see the tool results and decide what to do next
        continue;
      }

      // No tool calls — we have a final text response
      if (message.content) {
        yield { type: "response", data: { content: message.content } };
      }

      break; // Done
    }

    if (iterations >= MAX_ITERATIONS) {
      yield {
        type: "error",
        data: { message: "Agent reached maximum iterations. Stopping to prevent infinite loop." },
      };
    }
  }
}
