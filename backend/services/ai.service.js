"use strict";

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { TOOL_DEFINITIONS, executeTool } = require("./mcpTools");

const API_KEYS = (process.env.GEMINI_API_KEYS || "")
  .split(",").map(k => k.trim()).filter(Boolean);

function getKeyManagerStatus() {
  return { total_keys: API_KEYS.length, api_configured: API_KEYS.length > 0 };
}

function clearHistory() {}

function buildGeminiTools() {
  return [{
    functionDeclarations: TOOL_DEFINITIONS.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    })),
  }];
}

function systemInstruction(role, userId) {
  const today = new Date().toISOString().slice(0, 10);

  const base = `Today's date is ${today}.
You are MedyAI, an intelligent medical scheduling assistant.
ALWAYS use the provided tools to fetch real data — never invent doctor names, slots, or stats.
When a patient wants to book: first call check_doctor_availability, then call book_appointment.
After any action, give a clear friendly summary of what was done.`;

  if (role === "doctor") {
    return `${base}
You are assisting a DOCTOR. Their Doctor ID is: ${userId}.
Key tools: get_doctor_summary, get_appointments, send_doctor_notification.
For summary requests, fetch the data first using Doctor ID ${userId}, then proactively call send_doctor_notification.`;
  }

  return `${base}
You are assisting a PATIENT. Their Patient ID is: ${userId}.
Key tools: get_doctors, check_doctor_availability, book_appointment, reschedule_appointment, cancel_appointment.
Always check availability before booking. Use Patient ID ${userId} for bookings.`;
}

const MAX_ITERATIONS = 10;

async function runMcpAgent(messages, role = "patient", userId = null) {
  if (!API_KEYS.length) {
    return {
      role: "assistant",
      content: "⚠️ No Gemini API key configured. Add GEMINI_API_KEYS to your .env file.",
      tools_used: [],
    };
  }

  const previousMessages = Array.isArray(messages) ? messages.slice(0, -1) : [];
  const geminiHistory = previousMessages.map(turn => ({
    role: turn.role === "assistant" ? "model" : "user",
    parts: [{ text: turn.content }],
  }));

  const lastMsg = Array.isArray(messages) ? messages[messages.length - 1] : messages;
  const userText = typeof lastMsg === "string" ? lastMsg : (lastMsg?.content || lastMsg?.text || "");

  if (!userText.trim()) {
    return { role: "assistant", content: "Please enter a message.", tools_used: [] };
  }

  // Iterate over available keys to bypass rate limits (429) & downtime (503)
  for (let keyIndex = 0; keyIndex < API_KEYS.length; keyIndex++) {
    const apiKey = API_KEYS[keyIndex];

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        systemInstruction: systemInstruction(role, userId),
        tools: buildGeminiTools(),
        toolConfig: { functionCallingConfig: { mode: "AUTO" } },
      });

      const chat = model.startChat({ history: geminiHistory });
      const toolsUsed = [];
      let finalText = "";
      let currentPrompt = userText;

      for (let i = 0; i < MAX_ITERATIONS; i++) {
        console.log(`🔄 Agent turn ${i + 1} (Using Key #${keyIndex + 1})`);

        const result = await chat.sendMessage(currentPrompt);
        const parts = result.response.candidates?.[0]?.content?.parts || [];
        const textPart = parts.filter(p => p.text).map(p => p.text).join("");
        if (textPart) finalText = textPart;

        const fnCalls = parts.filter(p => p.functionCall);
        if (!fnCalls.length) {
          console.log(`✅ Done after ${i + 1} turn(s)`);
          break;
        }

        const functionResponseParts = await Promise.all(
          fnCalls.map(async part => {
            const { name, args } = part.functionCall;
            console.log(`   🔧 ${name}(${JSON.stringify(args).slice(0, 120)})`);
            toolsUsed.push(name);
            const toolResult = await executeTool(name, args || {});
            console.log(`   ↳ ${JSON.stringify(toolResult).slice(0, 200)}`);
            
            // Unconditionally wrap in an object. This absolutely prevents the "Proto field is not repeating" error for Arrays and Primitives.
            const formattedResponse = { output: toolResult };
            
            return { functionResponse: { name, response: formattedResponse } };
          })
        );

        currentPrompt = functionResponseParts;
      }

      if (!finalText) {
        finalText = "Action completed. Let me know if you need anything else!";
      }



      return {
        role: "assistant",
        content: finalText,
        tools_used: [...new Set(toolsUsed)],
      };

    } catch (error) {
      const msg = error.message || String(error);
      const isRateLimit = msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED");
      const is503 = msg.includes("503") || msg.includes("Overloaded") || msg.includes("Not Found");

      if (isRateLimit || is503) {
        const errType = is503 ? "service issue/overload" : "rate limit";
        console.log(`⚠️ Gemini key #${keyIndex + 1}/${API_KEYS.length} hit ${errType}. Continuing to next key...`);
        
        // If it's the last key in the pool, return an explicit error
        if (keyIndex === API_KEYS.length - 1) {
          return { role: "assistant", content: `⚠️ We're experiencing heavy traffic. All API keys exhausted.`, tools_used: [] };
        }
        
        // Let the loop continue to test the next key in API_KEYS!
        continue;
      }

      if (msg.includes("API_KEY_INVALID") || msg.includes("401")) {
        console.error("❌ Invalid API Key detected.");
        if (keyIndex === API_KEYS.length - 1) return { role: "assistant", content: "⚠️ Invalid Gemini API key.", tools_used: [] };
        continue;
      }

      console.error("❌ Fatal Agent Error:", msg);
      return { role: "assistant", content: `Something went wrong: ${msg.substring(0, 200)}`, tools_used: [] };
    }
  }
}

module.exports = { runMcpAgent, getKeyManagerStatus, clearHistory };