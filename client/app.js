// ── Co-Producer Client App ──────────────────────────────────────

const WS_URL = `ws://${window.location.hostname}:3001`;
const API_URL = `http://${window.location.hostname}:3001`;

// ── State ───────────────────────────────────────────────────────

let ws = null;
let isConnectedToAbleton = false;
let isProcessing = false;
let currentAssistantDiv = null;
let currentAssistantText = "";

// ── DOM Elements ────────────────────────────────────────────────

const connectionStatus = document.getElementById("connection-status");
const statusDot = connectionStatus.querySelector(".status-dot");
const statusText = connectionStatus.querySelector(".status-text");
const resetBtn = document.getElementById("reset-btn");
const refreshSessionBtn = document.getElementById("refresh-session-btn");
const sessionInfo = document.getElementById("session-info");
const activityLog = document.getElementById("activity-log");
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const modelSelect = document.getElementById("model-select");

// ── WebSocket Connection ────────────────────────────────────────

function connectWebSocket() {
  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log("[WS] Connected to server");
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleServerMessage(data);
  };

  ws.onclose = () => {
    console.log("[WS] Disconnected, reconnecting in 2s...");
    setTimeout(connectWebSocket, 2000);
  };

  ws.onerror = (err) => {
    console.error("[WS] Error:", err);
  };
}

// ── Handle Server Messages ──────────────────────────────────────

function handleServerMessage(msg) {
  switch (msg.type) {
    case "connection_status":
      updateConnectionStatus(msg.data.connected);
      if (msg.data.connected) fetchSessionInfo();
      break;

    case "session_state":
      renderSessionInfo(msg.data);
      break;

    case "thinking":
      addActivityItem("thinking", "🤔", "Thinking...");
      showThinking();
      break;

    case "tool_call":
      if (msg.data.name === "update_ui_status") {
        updateThinkingText(msg.data.args.message);
      } else {
        addActivityItem(
          "tool_call",
          "🔧",
          `Calling: ${msg.data.name}(${summarizeArgs(msg.data.args)})`
        );
      }
      break;

    case "tool_result":
      addActivityItem("tool_result", "✅", `${msg.data.name} completed`);
      // Refresh session after tool calls that modify state
      const modifyingTools = ["set_tempo", "play", "stop", "create_midi_clip", "add_notes_to_clip"];
      if (modifyingTools.includes(msg.data.name)) {
        fetchSessionInfo();
      }
      break;

    case "response_chunk":
      hideThinking();
      if (!currentAssistantDiv) {
        currentAssistantDiv = createAssistantMessageNode(msg.data.model);
        chatMessages.appendChild(currentAssistantDiv);
      }
      currentAssistantText += msg.data.text;
      currentAssistantDiv.querySelector(".message-content").textContent = currentAssistantText;
      scrollChat();
      break;

    case "response":
      hideThinking();
      if (currentAssistantDiv) {
        // Finalize chunked message
        currentAssistantDiv.querySelector(".message-content").innerHTML = formatMarkdown(currentAssistantText);
        currentAssistantDiv = null;
        currentAssistantText = "";
      } else if (msg.data.content) {
        // Fallback for non-chunked text
        const fallbackDiv = createAssistantMessageNode(msg.data.model);
        fallbackDiv.querySelector(".message-content").innerHTML = formatMarkdown(msg.data.content);
        chatMessages.appendChild(fallbackDiv);
        scrollChat();
      }
      isProcessing = false;
      updateSendButton();
      break;

    case "error":
      hideThinking();
      addErrorMessage(msg.data.message);
      addActivityItem("error", "❌", msg.data.message);
      isProcessing = false;
      updateSendButton();
      break;
  }
}

// ── Connection Status ───────────────────────────────────────────

function updateConnectionStatus(connected) {
  isConnectedToAbleton = connected;
  connectionStatus.className = `connection-indicator ${connected ? "connected" : "disconnected"}`;
  statusText.textContent = connected ? "Ableton Live" : "Disconnected";
}

// ── Session Info ────────────────────────────────────────────────

async function fetchSessionInfo() {
  try {
    const res = await fetch(`${API_URL}/api/session`);
    const data = await res.json();
    renderSessionInfo(data);
  } catch (err) {
    console.error("[Session] Fetch error:", err);
  }
}

function renderSessionInfo(data) {
  if (!data || !data.connected) {
    sessionInfo.innerHTML = `<div class="session-empty">Connect to Ableton Live to see session info</div>`;
    return;
  }

  let html = "";

  // Tempo
  html += `
    <div class="session-stat">
      <span class="label">Tempo</span>
      <span class="value">${Math.round(data.tempo)} BPM</span>
    </div>`;

  // Time Signature
  html += `
    <div class="session-stat">
      <span class="label">Time Sig</span>
      <span class="value">${data.signature_numerator}/${data.signature_denominator}</span>
    </div>`;

  // Playing
  html += `
    <div class="session-stat">
      <span class="label">Transport</span>
      <button 
        id="transport-btn" 
        class="value transport-btn ${data.isPlaying ? 'playing' : ''}"
        data-playing="${data.isPlaying}"
      >
        ${data.isPlaying ? "⏹ Stop" : "▶ Play"}
      </button>
    </div>`;

  // Tracks
  if (data.tracks && data.tracks.length > 0) {
    html += `<div class="track-list">`;
    for (const track of data.tracks) {
      let isMutedOrSolo = "";
      if (track.isSoloed) isMutedOrSolo = ` <span style="color:var(--accent-amber);font-size:0.7em">(S)</span>`;
      else if (track.isMuted) isMutedOrSolo = ` <span style="color:var(--text-muted);font-size:0.7em">(M)</span>`;

      html += `
        <div class="track-item">
          <span class="track-type-badge ${track.type}">${track.type}</span>
          <span class="track-name">${escapeHtml(track.name)}${isMutedOrSolo}</span>
        </div>`;
    }
    html += `</div>`;
  }

  sessionInfo.innerHTML = html;
}

// Handle dynamic clicks on session info Panel (like the Transport button)
sessionInfo.addEventListener("click", (e) => {
  const btn = e.target.closest("#transport-btn");
  if (!btn) return;

  const isPlaying = btn.getAttribute("data-playing") === "true";
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ 
      type: "transport_control", 
      action: isPlaying ? "stop" : "play" 
    }));
    
    // Optimistic UI update
    btn.setAttribute("data-playing", (!isPlaying).toString());
    btn.className = `value transport-btn ${!isPlaying ? 'playing' : ''}`;
    btn.innerHTML = !isPlaying ? "⏹ Stop" : "▶ Play";
  }
});

// ── Activity Log ────────────────────────────────────────────────

function addActivityItem(type, icon, text) {
  // Remove the empty state
  const empty = activityLog.querySelector(".activity-empty");
  if (empty) empty.remove();

  const item = document.createElement("div");
  item.className = `activity-item ${type}`;
  item.innerHTML = `
    <span class="activity-icon">${icon}</span>
    <span class="activity-text">${escapeHtml(text)}</span>
  `;

  activityLog.appendChild(item);
  activityLog.scrollTop = activityLog.scrollHeight;

  // Keep only the last 50 items
  while (activityLog.children.length > 50) {
    activityLog.removeChild(activityLog.firstChild);
  }
}

// ── Chat Messages ───────────────────────────────────────────────

function addUserMessage(text) {
  const msg = document.createElement("div");
  msg.className = "message user-message";
  msg.innerHTML = `<div class="message-content"><p>${escapeHtml(text)}</p></div>`;
  chatMessages.appendChild(msg);
  scrollChat();
}

function createAssistantMessageNode(modelName) {
  const div = document.createElement("div");
  div.className = "message assistant-message";
  const badgeHTML = modelName ? `<div class="model-badge">${modelName}</div>` : "";
  div.innerHTML = `
    ${badgeHTML}
    <div class="message-content"></div>
  `;
  return div;
}

function addAssistantMessage(text, modelName) {
  const msg = createAssistantMessageNode(modelName);
  msg.querySelector(".message-content").innerHTML = formatMarkdown(text);
  chatMessages.appendChild(msg);
  scrollChat();
}

function addErrorMessage(text) {
  const msg = document.createElement("div");
  msg.className = "message error-message";
  msg.innerHTML = `<div class="message-content"><p>⚠️ ${escapeHtml(text)}</p></div>`;
  chatMessages.appendChild(msg);
  scrollChat();
}

function showThinking() {
  // Remove existing thinking indicator
  hideThinking();

  const indicator = document.createElement("div");
  indicator.className = "thinking-indicator";
  indicator.id = "thinking";
  indicator.innerHTML = `
    <div class="thinking-dots"><span></span><span></span><span></span></div>
    <span class="thinking-text">Co-Producer is working...</span>
  `;
  chatMessages.appendChild(indicator);
  scrollChat();
}

function hideThinking() {
  const existing = document.getElementById("thinking");
  if (existing) existing.remove();
}

function updateThinkingText(text) {
  const existing = document.getElementById("thinking");
  if (existing) {
    const textNode = existing.querySelector(".thinking-text");
    if (textNode) {
      textNode.textContent = text;
    }
  } else {
    // If it's not showing, show it with this text
    showThinking();
    updateThinkingText(text);
  }
}

function scrollChat() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ── Input Handling ──────────────────────────────────────────────

chatInput.addEventListener("input", () => {
  // Auto-resize
  chatInput.style.height = "auto";
  chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + "px";
  updateSendButton();
});

chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Global Keyboard Shortcuts
document.addEventListener("keydown", (e) => {
  // Toggle playback with Spacebar (only if not typing in an input field)
  if (e.code === "Space" && e.target.tagName !== "TEXTAREA" && e.target.tagName !== "INPUT") {
    e.preventDefault();
    const btn = document.getElementById("transport-btn");
    if (btn) {
      btn.click(); // Reuse the existing click handling logic
    }
  }
});

sendBtn.addEventListener("click", sendMessage);
resetBtn.addEventListener("click", resetConversation);
refreshSessionBtn.addEventListener("click", fetchSessionInfo);

function sendMessage() {
  const text = chatInput.value.trim();
  if (!text || isProcessing) return;

  isProcessing = true;
  addUserMessage(text);
  updateSendButton();

  // Send via WebSocket
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ 
      type: "chat", 
      message: text, 
      modelPreference: modelSelect.value 
    }));
  } else {
    addErrorMessage("Not connected to server. Trying to reconnect...");
    isProcessing = false;
    updateSendButton();
  }

  chatInput.value = "";
  chatInput.style.height = "auto";
}

function resetConversation() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "reset" }));
  }

  // Clear chat except the welcome message
  const messages = chatMessages.querySelectorAll(".message:not(.system-message)");
  messages.forEach((m) => m.remove());
  hideThinking();

  // Clear activity log
  activityLog.innerHTML = `<div class="activity-empty">Agent activity will appear here</div>`;
  currentAssistantDiv = null;
  currentAssistantText = "";
}

function updateSendButton() {
  sendBtn.disabled = !chatInput.value.trim() || isProcessing;
}

// ── Helpers ─────────────────────────────────────────────────────

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function formatMarkdown(text) {
  // Simple markdown formatting
  let html = text
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, "<pre><code>$2</code></pre>")
    // Inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Headers
    .replace(/^### (.+)$/gm, "<h4>$1</h4>")
    .replace(/^## (.+)$/gm, "<h3>$1</h3>")
    .replace(/^# (.+)$/gm, "<h2>$1</h2>")
    // List items
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/^(\d+)\. (.+)$/gm, "<li>$2</li>");

  // Wrap consecutive <li> elements in <ul>
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>");

  // Paragraphs (lines not already wrapped)
  html = html
    .split("\n\n")
    .map((p) => {
      p = p.trim();
      if (!p) return "";
      if (p.startsWith("<")) return p;
      return `<p>${p}</p>`;
    })
    .join("\n");

  return html;
}

function summarizeArgs(args) {
  if (!args || Object.keys(args).length === 0) return "";
  const entries = Object.entries(args);
  if (entries.length === 1) {
    const [key, val] = entries[0];
    if (typeof val === "object") return `${key}: {...}`;
    return `${key}: ${val}`;
  }
  return entries
    .slice(0, 3)
    .map(([k, v]) => {
      if (typeof v === "object") return `${k}: {...}`;
      return `${k}: ${v}`;
    })
    .join(", ");
}

// ── Initialize ──────────────────────────────────────────────────

connectWebSocket();
fetchSessionInfo();
