import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { AbletonService } from "./services/ableton.js";
import { AgentService } from "./services/agent.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "3001");

// ── Services ───────────────────────────────────────────────────

const ableton = new AbletonService();
const agent = new AgentService(ableton);

// ── Express ────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend
app.use(express.static(path.join(__dirname, "..", "client")));

// REST endpoint for session info (for polling)
app.get("/api/session", async (_req, res) => {
  try {
    if (!ableton.isConnected()) {
      return res.json({ connected: false });
    }
    const info = await ableton.getSessionInfo();
    res.json({ connected: true, ...info });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/status", (_req, res) => {
  res.json({ connected: ableton.isConnected() });
});

// ── HTTP + WebSocket Server ────────────────────────────────────

const server = createServer(app);
const wss = new WebSocketServer({ server });

function broadcast(data: object): void {
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

// ── WebSocket Handling ─────────────────────────────────────────

wss.on("connection", (ws) => {
  console.log("[WS] Client connected");

  // Send current connection status
  ws.send(
    JSON.stringify({
      type: "connection_status",
      data: { connected: ableton.isConnected() },
    })
  );

  // Handle incoming messages
  ws.on("message", async (raw) => {
    let parsed: any;
    try {
      parsed = JSON.parse(raw.toString());
    } catch {
      ws.send(JSON.stringify({ type: "error", data: { message: "Invalid JSON" } }));
      return;
    }

    if (parsed.type === "chat") {
      // Process through the agent
      try {
        for await (const event of agent.processMessage(parsed.message)) {
          ws.send(JSON.stringify(event));
        }
      } catch (err: any) {
        ws.send(
          JSON.stringify({ type: "error", data: { message: err.message } })
        );
      }
    } else if (parsed.type === "goal") {
      // Autonomous mode
      try {
        for await (const event of agent.executeGoal(parsed.goal)) {
          ws.send(JSON.stringify(event));
        }
      } catch (err: any) {
        ws.send(
          JSON.stringify({ type: "error", data: { message: err.message } })
        );
      }
    } else if (parsed.type === "transport_control") {
      try {
        if (parsed.action === "play") {
          await ableton.play();
        } else if (parsed.action === "stop") {
          await ableton.stop();
        }
      } catch (err: any) {
        ws.send(JSON.stringify({ type: "error", data: { message: "Failed to control transport: " + err.message } }));
      }
    } else if (parsed.type === "reset") {
      agent.reset();
      ws.send(JSON.stringify({ type: "response", data: { content: "Conversation reset." } }));
    }
  });

  ws.on("close", () => {
    console.log("[WS] Client disconnected");
  });
});

// ── Ableton Connection Events ──────────────────────────────────

ableton.onConnectionChange(
  () => broadcast({ type: "connection_status", data: { connected: true } }),
  () => broadcast({ type: "connection_status", data: { connected: false } })
);

ableton.on("session_changed", async () => {
  try {
    if (ableton.isConnected()) {
      const info = await ableton.getSessionInfo();
      broadcast({ type: "session_state", data: { connected: true, ...info } });
    }
  } catch (err) {
    console.error("[Server] Error getting session info for broadcast:", err);
  }
});

// ── Start ──────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║        🎵 Co-Producer Agent 🎵           ║");
  console.log("║   AI Music Production for Ableton Live   ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log();

  // Start Ableton connection (non-blocking — works even if Ableton isn't running yet)
  console.log("[Ableton] Attempting to connect...");
  ableton.start().catch((err) => {
    console.warn("[Ableton] Initial connection failed:", err.message);
    console.warn("[Ableton] Will auto-connect when Ableton Live starts with AbletonJS control surface.");
  });

  // Start HTTP + WS server
  server.listen(PORT, () => {
    console.log();
    console.log(`[Server] Running on http://localhost:${PORT}`);
    console.log(`[Server] WebSocket on ws://localhost:${PORT}`);
    console.log();
    console.log("Open http://localhost:5173 in your browser (or http://localhost:${PORT} if not using serve)");
    console.log();
  });
}

main();
