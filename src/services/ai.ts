import OpenAI from "openai";
import { getToolDefinitions, getToolDefinitionsByNames, getToolHandler } from "../tools/index.js";
import { AbletonService } from "./ableton.js";
import { RouterService, IntentCategory } from "./router.js";

// ── Types ──────────────────────────────────────────────────────

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: any[];
}

export interface AgentEvent {
  type: "thinking" | "tool_call" | "tool_result" | "response_chunk" | "response" | "error";
  data: unknown;
}

// ── System Prompt ──────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert AI music co-producer working directly inside Ableton Live. You are creative, knowledgeable, and hands-on — like having a top-tier producer sitting next to the user.

## Your Capabilities
You can READ the current Ableton session (tempo, tracks, clips, MIDI notes) and WRITE to it. Specifically, you can:

### Transport & Session
- Play, stop, set tempo
- Undo / redo actions
- Stop all clips

### Track Management
- Create MIDI, audio, and return tracks
- Delete and duplicate tracks
- **Rename tracks** to give them meaningful names (e.g., "Kick", "Bass", "Lead Synth")
- Mute/unmute and solo/unsolo tracks
- Set track volume and panning
- Set track color
- Arm/disarm tracks for recording

### MIDI & Clips
- Create MIDI clips with notes
- Add notes to existing clips
- Read notes from clips
- **Remove notes** by time/pitch range
- **Replace all notes** in a clip (for iterative refinement)
- **Quantize** notes to a grid
- **Duplicate clip loop** (double length with copied content)
- **Rename clips** to give them descriptive names
- Fire (launch) and stop individual clips
- Enable/disable clip looping
- Set clip loop start/end points
- Set clip start/end markers

### Scene Management
- Fire scenes (launch all clips in a row)
- Create, delete, and duplicate scenes

### Sends & Arrangement
- Get and set **send levels** to return tracks (reverb, delay buses)
- **Place clips in arrangement view** at specific time positions
- Set and control the **arrangement loop**
- Set song position / jump to specific beats
- Load **audio clips** from files onto audio tracks

### Devices & Effects
- Browse and load instruments, effects, drum kits, and samples from Ableton's browser
- Get and set device parameters
- Delete devices from tracks

### Session Settings
- Set **groove** and **swing** amounts
- Set **time signature**

### UI & Progress
- **Update UI status** (\`update_ui_status\`) to tell the user what you are currently working on during long tasks (e.g. "Browsing for drum kits...", "Writing chord progression...")

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
4. **Create tracks & load sounds** — Create tracks, rename them, then **ALWAYS browse and load an instrument or drum kit** onto each track before writing any MIDI. A MIDI track without an instrument makes no sound!
5. **Write MIDI** — Create clips and write notes with proper music theory
6. **Verify** — Read back what you wrote to confirm it's correct
7. **Explain** — Tell the user what you did and why (teach them as you go)

## Sound Selection Workflow
When creating a new track, ALWAYS follow this order:
1. Create the track and rename it
2. Browse for an appropriate instrument/sound using browse_instruments
3. Load the instrument using load_device
4. THEN write MIDI notes

For drums: use category "drums", browse ["Drum Rack"] for full kits (Kit-909, Kit-808, etc.) or ["Drum Hits", "Kick"/"Snare"/"Hihat"] for individual samples.
For synths: use category "instruments" and browse for Analog, Drift, Wavetable, etc. Or use category "sounds" to find preset sounds organized by type (Bass, Keys, Lead, Pad).

## Music Theory Quick Reference
- When writing melodies/chords, always be aware of the key and scale
- Common time positions: beat 1=0, beat 2=1, beat 3=2, beat 4=3 (in a single bar)
- For a 4-bar pattern: bars are at beats 0, 4, 8, 12
- Use velocity variation for human feel (80-110 range, with accents at 120+)
- Ghost notes: velocity 30-50

## Important Rules
- Always inspect the session before making changes
- When creating tracks, always rename them to something meaningful
- **NEVER leave a MIDI track without an instrument** — always browse and load a suitable instrument, drum kit, or sound preset
- When creating patterns, think about musicality — not just technical correctness
- Add velocity variation for human feel
- Use replace_all_notes instead of creating new clips when iterating on existing patterns
- When asked to refine a pattern, read the current notes first, modify, then replace
- Explain your musical choices to help the user learn
- During complex or autonomous tasks, explicitly call \`update_ui_status\` before you begin a sub-task so the user knows you aren't stuck (e.g. "Writing the bassline...", "Searching for effects").
- If you can't do something (like audio analysis), be honest and suggest alternatives`;


// ── AI Service ─────────────────────────────────────────────────

export class AIService {
  private openai: OpenAI;
  private conversationHistory: ChatMessage[] = [];
  private ableton: AbletonService;
  private router: RouterService;

  constructor(ableton: AbletonService) {
    this.openai = new OpenAI();
    this.ableton = ableton;
    this.router = new RouterService();
    this.resetConversation();
  }

  resetConversation(): void {
    this.conversationHistory = [
      { role: "system", content: SYSTEM_PROMPT },
    ];
  }

  /**
   * Compresses the conversation history when it gets too long to save tokens.
   */
  async *manageContextWindow(): AsyncGenerator<AgentEvent> {
    const MAX_HISTORY = 30; // Max messages before triggering compression
    const KEEP_RECENT = 10; // How many recent messages to keep raw
    
    if (this.conversationHistory.length > MAX_HISTORY) {
      const systemPrompts = this.conversationHistory.filter(m => m.role === "system");
      const nonSystem = this.conversationHistory.filter(m => m.role !== "system");
      
      if (nonSystem.length <= KEEP_RECENT) return;
      
      const toSummarize = nonSystem.slice(0, nonSystem.length - KEEP_RECENT);
      const recent = nonSystem.slice(nonSystem.length - KEEP_RECENT);

      yield { type: "thinking", data: { message: "Compressing conversation history to save tokens..." } };

      const summaryPrompt = `Summarize the following earlier conversation history between the user and the AI Co-Producer. Focus on the user's overarching goals, musical preferences, what has been created so far, and any specific context needed for future actions. Ignore tool execution details, focus on the High Level narrative. Keep it concise but comprehensive.\n\nHistory to summarize:\n${JSON.stringify(toSummarize)}`;
      
      try {
        const summaryResponse = await this.openai.chat.completions.create({
          model: process.env.OPENAI_MODEL_FAST || "gpt-4o-mini",
          messages: [{ role: "user", content: summaryPrompt }],
          temperature: 0.3
        });
        
        const summaryText = summaryResponse.choices[0]?.message?.content || "";
        
        this.conversationHistory = [
          systemPrompts[0], // Original system prompt
          { role: "system", content: `Previous conversation summary:\n${summaryText}` },
          ...recent
        ];
      } catch (err) {
        console.error("Failed to summarize history:", err);
      }
    }
  }

  /**
   * Process a user message through the AI with tool calling.
   * Yields events as the agent thinks, calls tools, and responds.
   */
  async *chat(userMessage: string, forceIntent?: IntentCategory): AsyncGenerator<AgentEvent> {
    // Determine route before adding into history
    let decision = forceIntent 
      ? { intent: forceIntent, model: forceIntent === "simple" ? process.env.OPENAI_MODEL_FAST || "gpt-4o-mini" : process.env.OPENAI_MODEL || "gpt-4o", tools: [] } // tools: [] means all tools in logic below
      : await this.router.routeMessage(userMessage);
      
    // Re-resolve tools if forced
    if (forceIntent && forceIntent !== "creative") {
      const tempDecision = await this.router.routeMessage(userMessage);
      decision.tools = tempDecision.tools;
    } else if (forceIntent === "creative") {
      decision.tools = getToolDefinitions().map(t => t.function.name);
    }
      
    yield { type: "thinking", data: { message: `Routing request as '${decision.intent}' intent using model ${decision.model}` } };

    // Add user message to history
    this.conversationHistory.push({ role: "user", content: userMessage });

    // Manage context window before proceeding
    yield* this.manageContextWindow();

    // Agentic loop — keep going until we get a text response (no more tool calls)
    let iterations = 0;
    const MAX_ITERATIONS = 25; // safety limit
    let consecutiveToolFailures = 0;

    let toolsDef = getToolDefinitionsByNames(decision.tools);

    while (iterations < MAX_ITERATIONS) {
      iterations++;

      yield { type: "thinking", data: { iteration: iterations } };

      // Call OpenAI with retry logic for rate limits
      let response;
      const MAX_RETRIES = 5;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          const stream = await this.openai.chat.completions.create({
            model: decision.model,
            messages: this.conversationHistory as any,
            tools: toolsDef as any,
            tool_choice: "auto",
            temperature: 0.7,
            stream: true, // Enable Server-Sent Events from OpenAI
          });

          let content = "";
          let toolCalls: any[] = [];
          
          // Reconstitute the message from chunks
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            if (!delta) continue;
            
            if (delta.content) {
              content += delta.content;
              // Yield the text piece to the WebSocket client immediately
              yield { type: "response_chunk", data: { text: delta.content, model: decision.model } };
            }
            
            // Rebuild the tool arguments string
            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                if (!toolCalls[tc.index]) {
                  toolCalls[tc.index] = { 
                    id: tc.id, 
                    type: tc.type || "function", 
                    function: { name: tc.function?.name || "", arguments: "" } 
                  };
                }
                if (tc.function?.name) toolCalls[tc.index].function.name += tc.function.name;
                if (tc.function?.arguments) toolCalls[tc.index].function.arguments += tc.function.arguments;
              }
            }
          }

          // Build a mock response object that matches what the rest of the flow expects
          response = {
            choices: [{
              message: {
                role: "assistant",
                content: content || null,
                tool_calls: toolCalls.length > 0 ? toolCalls : undefined
              }
            }]
          };

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
        // 1. First, yield all the 'tool_call' events so the UI updates instantly
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
        }

        // 2. Execute all tools in parallel to drastically improve speed
        const toolPromises = message.tool_calls.map(async (toolCall) => {
          const toolName = toolCall.function.name;
          let toolArgs: Record<string, unknown> = {};
          try {
            toolArgs = JSON.parse(toolCall.function.arguments || "{}");
          } catch {
            toolArgs = {};
          }

          let result: unknown;
          let isError = false;
          try {
            const handler = getToolHandler(toolName);
            if (!handler) {
              throw new Error(`Unknown tool: ${toolName}. This usually happens when the model tries to use a tool that is not in its allowed subset.`);
            }
            result = await handler(this.ableton, toolArgs);
          } catch (err: any) {
            result = { error: err.message };
            isError = true;
          }

          return { toolCall, toolName, result, isError };
        });

        // 3. Wait for all parallel executions to finish
        const results = await Promise.all(toolPromises);

        let errorCountInThisBatch = 0;

        // 4. Yield results and update history
        for (const { toolCall, toolName, result, isError } of results) {
          if (isError) errorCountInThisBatch++;

          yield {
            type: "tool_result",
            data: { name: toolName, result, id: toolCall.id },
          };

          this.conversationHistory.push({
            role: "tool",
            content: JSON.stringify(result),
            tool_call_id: toolCall.id,
          });
        }

        // Track consecutive failures for the cascade logic
        if (errorCountInThisBatch > 0) {
          consecutiveToolFailures++;
        } else {
          consecutiveToolFailures = 0;
        }

        // Cascade logic: if we fail twice in a row with the fast model, escalate to the main model
        if (consecutiveToolFailures >= 2 && decision.model !== (process.env.OPENAI_MODEL || "gpt-4o")) {
          decision.model = process.env.OPENAI_MODEL || "gpt-4o";
          decision.tools = getToolDefinitions().map(t => t.function.name);
          toolsDef = getToolDefinitions();
          yield { type: "thinking", data: { message: `Model struggled with constraints. Escalating to ${decision.model} with all tools.` } };
          consecutiveToolFailures = 0; // reset
        }

        // Continue the loop — AI will see the tool results and decide what to do next
        continue;
      }

      // No tool calls — we have a final text response
      if (message.content) {
        yield { type: "response", data: { content: message.content, model: decision.model } };
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
