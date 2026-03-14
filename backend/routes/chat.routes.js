"use strict";

const express         = require("express");
const { runMcpAgent } = require("../services/ai.service");
const { get, all, run } = require("../config/database");

const router = express.Router();

// ─────────────────────────────────────────────────────────────────
//  GET /api/chat/conversations – List all conversations for a user
// ─────────────────────────────────────────────────────────────────
router.get("/conversations", (req, res) => {
  const { user_id, role } = req.query;
  if (!user_id || !role)
    return res.status(400).json({ detail: "user_id and role are required" });

  const conversations = all(
    `SELECT id, title, created_at, updated_at
     FROM conversations
     WHERE user_id = ? AND user_role = ?
     ORDER BY updated_at DESC`,
    [parseInt(user_id), role]
  );

  // Add message count and last message preview for each conversation
  const enriched = conversations.map(conv => {
    const count = get(
      "SELECT COUNT(*) as cnt FROM chat_messages WHERE conversation_id = ?",
      [conv.id]
    );
    const lastMsg = get(
      "SELECT content, role FROM chat_messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1",
      [conv.id]
    );
    return {
      ...conv,
      message_count: count?.cnt || 0,
      last_message: lastMsg?.content?.slice(0, 80) || "",
      last_role: lastMsg?.role || "",
    };
  });

  res.json({ conversations: enriched });
});

// ─────────────────────────────────────────────────────────────────
//  GET /api/chat/conversations/:id/messages – Get all messages
// ─────────────────────────────────────────────────────────────────
router.get("/conversations/:id/messages", (req, res) => {
  const convId = parseInt(req.params.id);

  const conv = get("SELECT * FROM conversations WHERE id = ?", [convId]);
  if (!conv) return res.status(404).json({ detail: "Conversation not found" });

  const messages = all(
    "SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC",
    [convId]
  );

  res.json({
    conversation: conv,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
      tools_used: m.tools_used ? JSON.parse(m.tools_used) : [],
      ts: new Date(m.created_at).getTime(),
    })),
  });
});

// ─────────────────────────────────────────────────────────────────
//  DELETE /api/chat/conversations/:id – Delete a conversation
// ─────────────────────────────────────────────────────────────────
router.delete("/conversations/:id", (req, res) => {
  const convId = parseInt(req.params.id);
  run("DELETE FROM chat_messages WHERE conversation_id = ?", [convId]);
  run("DELETE FROM conversations WHERE id = ?", [convId]);
  res.json({ status: "ok", message: "Conversation deleted" });
});

// ─────────────────────────────────────────────────────────────────
//  POST /api/chat – Send a message (creates conversation if needed)
// ─────────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const { messages, role = "patient", user_id, conversation_id } = req.body || {};
  if (!Array.isArray(messages) || !messages.length)
    return res.status(400).json({ detail: "messages array is required" });

  try {
    let convId = conversation_id ? parseInt(conversation_id) : null;

    // Auto-create conversation if none provided
    if (!convId && user_id) {
      const lastMsg  = messages[messages.length - 1];
      const rawTitle = typeof lastMsg === "string" ? lastMsg : (lastMsg?.content || "New conversation");
      const title    = rawTitle.length > 80 ? rawTitle.slice(0, 77) + "…" : rawTitle;

      const result = run(
        "INSERT INTO conversations (user_id, user_role, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        [user_id, role, title, new Date().toISOString(), new Date().toISOString()]
      );
      convId = result.lastInsertRowid;
    }

    // Save the user's new message to the DB
    const lastMsg     = messages[messages.length - 1];
    const userContent = typeof lastMsg === "string" ? lastMsg : (lastMsg?.content || "");
    if (convId && userContent) {
      run(
        "INSERT INTO chat_messages (conversation_id, role, content, tools_used, created_at) VALUES (?, 'user', ?, NULL, ?)",
        [convId, userContent, new Date().toISOString()]
      );
    }

    // Run the AI agent
    const aiResult = await runMcpAgent(messages, role, user_id || null);

    // Save the AI response to the DB
    if (convId && aiResult.content) {
      run(
        "INSERT INTO chat_messages (conversation_id, role, content, tools_used, created_at) VALUES (?, 'assistant', ?, ?, ?)",
        [convId, aiResult.content, JSON.stringify(aiResult.tools_used || []), new Date().toISOString()]
      );
      // Update conversation timestamp
      run("UPDATE conversations SET updated_at = ? WHERE id = ?",
        [new Date().toISOString(), convId]);
    }

    return res.json({ response: aiResult, conversation_id: convId });
  } catch (e) {
    console.error("Chat route error:", e.message);
    return res.json({
      response: { role: "assistant", content: `❌ Server error: ${e.message}`, tools_used: [] },
    });
  }
});

module.exports = router;