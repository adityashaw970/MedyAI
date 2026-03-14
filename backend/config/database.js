"use strict";

const initSqlJs = require("sql.js");
const path      = require("path");
const fs        = require("fs");

// DB lives next to server.js in the backend folder
const DB_PATH = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(__dirname, "../../medyai.db");

let db  = null;
let SQL = null;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS doctors (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL,
    specialization  TEXT,
    email           TEXT,
    phone           TEXT,
    password_hash   TEXT
  );
  CREATE TABLE IF NOT EXISTS patients (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL,
    email           TEXT    UNIQUE,
    phone           TEXT,
    password_hash   TEXT
  );
  CREATE TABLE IF NOT EXISTS appointments (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    doctor_id        INTEGER REFERENCES doctors(id),
    patient_id       INTEGER REFERENCES patients(id),
    appointment_time TEXT    NOT NULL,
    duration         INTEGER DEFAULT 30,
    status           TEXT    DEFAULT 'scheduled',
    condition_notes  TEXT,
    created_at       TEXT
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    doctor_id  INTEGER REFERENCES doctors(id),
    message    TEXT,
    channel    TEXT    DEFAULT 'in_app',
    created_at TEXT,
    read       INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS conversations (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    user_role  TEXT    NOT NULL,
    title      TEXT,
    created_at TEXT,
    updated_at TEXT
  );
  CREATE TABLE IF NOT EXISTS chat_messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER REFERENCES conversations(id),
    role            TEXT    NOT NULL,
    content         TEXT    NOT NULL,
    tools_used      TEXT,
    created_at      TEXT
  );
  CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    phone      TEXT,
    message    TEXT,
    status     TEXT    DEFAULT 'sent',
    created_at TEXT
  );
`;

async function initDb() {
  if (db) return db;
  SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
    console.log("✅ Database loaded from", DB_PATH);
  } else {
    db = new SQL.Database();
    console.log("✅ New database created →", DB_PATH);
  }

  db.run("PRAGMA foreign_keys = ON;");
  db.run(SCHEMA);

  // Migration helpers – add columns if they don't exist
  const safeAlter = (sql) => { try { db.run(sql); } catch(e) { /* column exists */ } };
  safeAlter("ALTER TABLE appointments ADD COLUMN duration INTEGER DEFAULT 30;");
  safeAlter("ALTER TABLE notifications ADD COLUMN channel TEXT DEFAULT 'in_app';");
  safeAlter("ALTER TABLE doctors ADD COLUMN phone TEXT;");

  _save();
  return db;
}

function _save() {
  if (!db) return;
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  } catch (e) { console.error("DB save error:", e.message); }
}

function _drain(stmt) {
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function _assertReady() {
  if (!db) throw new Error("DB not initialised – await initDb() before use.");
}

function run(sql, params = []) {
  _assertReady();
  db.run(sql, params);
  const rowid   = db.exec("SELECT last_insert_rowid()")[0]?.values?.[0]?.[0] ?? 0;
  const changes = db.exec("SELECT changes()")[0]?.values?.[0]?.[0] ?? 0;
  _save();
  return { lastInsertRowid: Number(rowid), changes: Number(changes) };
}

function get(sql, params = []) {
  _assertReady();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  return _drain(stmt)[0];
}

function all(sql, params = []) {
  _assertReady();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  return _drain(stmt);
}

function getDb() { return db; }

module.exports = { initDb, getDb, run, get, all };