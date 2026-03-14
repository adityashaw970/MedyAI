"use strict";

const express      = require("express");
const crypto       = require("crypto");
// ✅ routes/ is one level below backend/, config/ is also one level below → ../config/
const { get, all } = require("../config/database");

const router = express.Router();
const hash   = pw => crypto.createHash("sha256").update(pw).digest("hex");

router.post("/login", (req, res) => {
  const { email, password, role } = req.body || {};
  if (!email || !password || !role)
    return res.status(400).json({ detail: "email, password and role are required" });

  const pwHash = hash(password);

  if (role === "doctor") {
    const doc = get("SELECT * FROM doctors WHERE email = ? AND password_hash = ?", [email, pwHash]);
    if (!doc) return res.status(401).json({ detail: "Invalid doctor credentials" });
    return res.json({ status: "ok", user: { id: doc.id, name: doc.name, email: doc.email, role: "doctor", specialization: doc.specialization } });
  }
  if (role === "patient") {
    const pat = get("SELECT * FROM patients WHERE email = ? AND password_hash = ?", [email, pwHash]);
    if (!pat) return res.status(401).json({ detail: "Invalid patient credentials" });
    return res.json({ status: "ok", user: { id: pat.id, name: pat.name, email: pat.email, role: "patient", phone: pat.phone } });
  }
  return res.status(400).json({ detail: `Unknown role: ${role}` });
});

router.post("/register", (req, res) => {
  const { name, email, password, role, specialization, phone } = req.body || {};
  if (!name || !email || !password || !role)
    return res.status(400).json({ detail: "name, email, password and role are required" });

  const pwHash = hash(password);

  const { run } = require("../config/database");

  if (role === "doctor") {
    const existing = get("SELECT * FROM doctors WHERE email = ?", [email]);
    if (existing) return res.status(400).json({ detail: "Email already registered." });
    
    run("INSERT INTO doctors (name, specialization, email, password_hash) VALUES (?, ?, ?, ?)", [name, specialization || "General Physician", email, pwHash]);
    const doc = get("SELECT * FROM doctors WHERE email = ?", [email]);
    return res.json({ status: "ok", user: { id: doc.id, name: doc.name, email: doc.email, role: "doctor", specialization: doc.specialization } });
  }
  
  if (role === "patient") {
    const existing = get("SELECT * FROM patients WHERE email = ?", [email]);
    if (existing) return res.status(400).json({ detail: "Email already registered." });
    
    run("INSERT INTO patients (name, email, phone, password_hash) VALUES (?, ?, ?, ?)", [name, email, phone || "", pwHash]);
    const pat = get("SELECT * FROM patients WHERE email = ?", [email]);
    return res.json({ status: "ok", user: { id: pat.id, name: pat.name, email: pat.email, role: "patient", phone: pat.phone } });
  }
  
  return res.status(400).json({ detail: `Unknown role: ${role}` });
});

router.get("/users", (req, res) => {
  const doctors  = all("SELECT id, name, email, specialization FROM doctors");
  const patients = all("SELECT id, name, email FROM patients");
  res.json({
    doctors:  doctors.map(d => ({ ...d, name: `Dr. ${d.name}` })),
    patients: patients.map(p => ({ ...p })),
  });
});

module.exports = router;