"use strict";

require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });

const crypto           = require("crypto");
const { initDb, get, run } = require("../config/database");

const hash = pw => crypto.createHash("sha256").update(pw).digest("hex");

function daysAgo(n, h)    { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(h, 0, 0, 0); return d.toISOString(); }
function daysAhead(n, h)  { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(h, 0, 0, 0); return d.toISOString(); }
function todayAt(h)       { const d = new Date(); d.setHours(h, 0, 0, 0); return d.toISOString(); }

async function seed() {
  await initDb();

  if (get("SELECT id FROM doctors LIMIT 1")) {
    console.log("Already seeded – skipping.");
    return;
  }

  // Doctors
  for (const d of [
    ["Ahuja",  "General Physician", "ahuja@hospital.com"],
    ["Smith",  "Cardiologist",      "smith@hospital.com"],
    ["Patel",  "Dermatologist",     "patel@hospital.com"],
  ]) run("INSERT INTO doctors (name, specialization, email, password_hash) VALUES (?,?,?,?)", [...d, hash("doctor123")]);

  // Patients
  for (const p of [
    ["John Doe",   "john@example.com",  "9876543210"],
    ["Alice Ray",  "alice@example.com", "9123456789"],
    ["Bob Kumar",  "bob@example.com",   "9988776655"],
    ["Sara Gupta", "sara@example.com",  "9001122334"],
  ]) run("INSERT INTO patients (name, email, phone, password_hash) VALUES (?,?,?,?)", [...p, hash("patient123")]);

  // Appointments
  const appts = [
    [1,1, daysAgo(1,9),   "completed", "fever"],
    [1,2, daysAgo(1,10),  "completed", "cold and cough"],
    [1,3, daysAgo(1,11),  "completed", "fever"],
    [2,4, daysAgo(1,14),  "completed", "chest pain"],
    [1,4, todayAt(9),     "scheduled", "checkup"],
    [1,2, todayAt(11),    "scheduled", "fever"],
    [2,1, todayAt(10),    "scheduled", "heart palpitations"],
    [1,3, daysAhead(1,15),"scheduled", "skin rash"],
  ];
  for (const [doc, pat, time, status, cond] of appts)
    run("INSERT INTO appointments (doctor_id,patient_id,appointment_time,status,condition_notes,created_at) VALUES (?,?,?,?,?,?)",
      [doc, pat, time, status, cond, new Date().toISOString()]);

  console.log("✅ Seeded: 3 doctors, 4 patients, 8 appointments");
  console.log("   Patient: john@example.com / patient123");
  console.log("   Doctor:  ahuja@hospital.com / doctor123");
}

if (require.main === module) seed().catch(console.error);

module.exports = { seed };