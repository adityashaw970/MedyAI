"use strict";

const express      = require("express");
const { all, run } = require("../config/database");

const router = express.Router();

router.get("/", (req, res) => {
  const doctorId = parseInt(req.query.doctor_id || "1");
  const rows = all(
    "SELECT * FROM notifications WHERE doctor_id = ? ORDER BY created_at DESC LIMIT 20",
    [doctorId]
  );
  res.json({
    notifications: rows.map(n => ({
      id: n.id, message: n.message, created_at: n.created_at, read: Boolean(n.read),
    })),
  });
});

router.post("/read", (req, res) => {
  const doctorId = parseInt(req.query.doctor_id || "1");
  run("UPDATE notifications SET read = 1 WHERE doctor_id = ? AND read = 0", [doctorId]);
  res.json({ status: "ok" });
});

module.exports = router;