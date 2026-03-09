import { AbletonService } from "../services/ableton.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Store knowledge files in project_root/knowledge
const KNOWLEDGE_DIR = path.join(__dirname, "..", "..", "knowledge");

export const getMusicalKnowledgeTool = {
  definition: {
    type: "function" as const,
    function: {
      name: "get_musical_knowledge",
      description: "Retrieve specific domain knowledge, genre recipes, or track requirements from the local knowledge base. ALWAYS call this when asked to create a full track or a specific genre.",
      parameters: {
        type: "object",
        properties: {
          topic: { 
            type: "string", 
            description: "The topic or genre to look up (e.g., 'techno', 'house', 'lofi')" 
          },
        },
        required: ["topic"],
      },
    },
  },
  handler: async (ableton: AbletonService, args: Record<string, unknown>) => {
    try {
      let topic = (args.topic as string)?.toLowerCase().trim();
      if (!topic) {
        return { error: "Topic is required" };
      }
      
      // Clean path injection
      topic = topic.replace(/[^a-z0-9_-]/g, "");

      // Check if directory exists, create if not
      try {
        await fs.access(KNOWLEDGE_DIR);
      } catch {
        await fs.mkdir(KNOWLEDGE_DIR, { recursive: true });
        return { error: `Knowledge directory created at ${KNOWLEDGE_DIR}, but it is empty. Please add markdown files (e.g., ${topic}.md).` };
      }

      const filePath = path.join(KNOWLEDGE_DIR, `${topic}.md`);
      
      try {
        const content = await fs.readFile(filePath, "utf-8");
        return { 
          source: `knowledge/${topic}.md`, 
          content,
          note: "This knowledge is retrieved instantly from local files, making it extremely fast, cost-efficient, and easy to maintain."
        };
      } catch (err: any) {
        // If exact match fails, try to list available topics
        const files = await fs.readdir(KNOWLEDGE_DIR);
        const topics = files.filter(f => f.endsWith(".md")).map(f => f.replace(".md", ""));
        return { 
          error: `No specific knowledge found for '${topic}'.`,
          available_topics: topics.length > 0 ? topics : ["No knowledge files available yet."]
        };
      }
    } catch (err: any) {
      return { error: `Failed to retrieve knowledge: ${err.message}` };
    }
  },
};
