import * as dotenv from "dotenv";
dotenv.config();

import { AIService } from "./src/services/ai.js";
import { AbletonService } from "./src/services/ableton.js";

async function run() {
  const ableton = new AbletonService();
  const ai = new AIService(ableton);

  console.log("Sending query to simple intent (ollama)...");
  
  // Force simple intent to use local model
  const stream = ai.chat("what can you do?", "simple");

  for await (const event of stream) {
    if (event.type === 'response_chunk') {
      process.stdout.write((event.data as any).text);
    } else {
      console.log("\n[EVENT]", JSON.stringify(event, null, 2));
    }
  }
  process.exit(0);
}

run().catch(console.error);
