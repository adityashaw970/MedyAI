"use strict";

require("dotenv").config();  // .env is in the same folder as server.js

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const { initDb, get, run } = require("./config/database");

const app = express();
const PORT = parseInt(process.env.PORT || "8000");

app.use(cors());
app.use(express.json());

// ── Routes ───────────────────────────────────────────────────────
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/chat", require("./routes/chat.routes"));
app.use("/api/mcp", require("./routes/mcp.routes"));
app.use("/api/notifications", require("./routes/notifications.routes"));

app.get("/health", (_, res) => res.json({ status: "ok", time: new Date().toISOString() }));

// ── Auto-seed helpers ─────────────────────────────────────────────
const hash = pw => crypto.createHash("sha256").update(pw).digest("hex");

function daysAgo(n, h) { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(h, 0, 0, 0); return d.toISOString(); }
function daysAhead(n, h) { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(h, 0, 0, 0); return d.toISOString(); }
function todayAt(h) { const d = new Date(); d.setHours(h, 0, 0, 0); return d.toISOString(); }

async function seedIfEmpty() {
  if (get("SELECT id FROM doctors LIMIT 1")) {
    console.log("📦 Database already seeded – skipping.");
    return;
  }

  console.log("🌱 Seeding database with real Gmail IDs…");

  // ── Doctors (3) ──────────────────────────────────────────────
  for (const d of [
    ["Aditya", "General Physician", "adityashaw970@gmail.com", "+918961414207"],
    ["Nikta", "Cardiologist", "nikitashawwork@gmail.com", "+918961414207"],
    ["Aparup", "Dermatologist", "aparupgoswami5@gmail.com", "+918961414207"],
  ]) run(
    "INSERT INTO doctors (name, specialization, email, phone, password_hash) VALUES (?,?,?,?,?)",
    [...d, hash("doctor123")]
  );

  // ── Patients (4) ─────────────────────────────────────────────
  for (const p of [
    ["Abhijeet Shaw", "shawabhijeet45@gmail.com", "8961414207"],
    ["Arun Shaw", "arunshaw970@gmail.com", "8961414207"],
    ["Niki", "nikitashawwork@gmail.com", "8961414207"],
    ["Goswami", "aparupgoswami5@gmail.com", "8961414207"],
  ]) run(
    "INSERT INTO patients (name, email, phone, password_hash) VALUES (?,?,?,?)",
    [...p, hash("patient123")]
  );

  // ── Seed appointments ────────────────────────────────────────
  for (const [doc, pat, time, status, cond] of [
    [1, 1, daysAgo(1, 9), "completed", "fever"],
    [1, 2, daysAgo(1, 10), "completed", "cold and cough"],
    [1, 3, daysAgo(1, 11), "completed", "fever"],
    [2, 4, daysAgo(1, 14), "completed", "chest pain"],
    [1, 4, todayAt(9), "scheduled", "checkup"],
    [1, 2, todayAt(11), "scheduled", "fever"],
    [2, 1, todayAt(10), "scheduled", "heart palpitations"],
    [3, 3, todayAt(14), "scheduled", "skin rash"],
    [1, 3, daysAhead(1, 15), "scheduled", "skin rash follow-up"],
    [2, 2, daysAhead(1, 10), "scheduled", "ecg checkup"],
  ]) run(
    "INSERT INTO appointments (doctor_id,patient_id,appointment_time,status,condition_notes,duration,created_at) VALUES (?,?,?,?,?,30,?)",
    [doc, pat, time, status, cond, new Date().toISOString()]
  );

  console.log("✅ Seeded: 3 doctors · 4 patients · 10 appointments");
  console.log("   Doctor  → adityashaw970@gmail.com  / doctor123");
  console.log("   Patient → shawabhijeet45@gmail.com / patient123");
}

// ── Start ─────────────────────────────────────────────────────────
async function start() {
  try {
    await initDb();
    await seedIfEmpty();

    const server = app.listen(PORT, () =>
      console.log(`\n🚀 MedyAI backend → http://localhost:${PORT}\n`)
    );

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`\n❌ Port ${PORT} already in use.`);
        console.error("   Fix: run  npx kill-port 8000  then restart.\n");
        process.exit(1);
      } else throw err;
    });

  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
}

start();