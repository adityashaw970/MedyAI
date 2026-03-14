"use strict";

const express = require("express");
const {
  TOOL_DEFINITIONS, RESOURCES, PROMPTS,
  executeTool, readResource, getPrompt,
} = require("../services/mcpTools");

const router = express.Router();

router.get("/tools",     (req, res) => res.json({ tools: TOOL_DEFINITIONS }));
router.get("/resources", (req, res) => res.json({ resources: RESOURCES }));
router.get("/prompts",   (req, res) => res.json({ prompts: PROMPTS }));

router.post("/tools/:name", async (req, res) => {
  const result = await executeTool(req.params.name, req.body || {});
  res.json(result);
});

router.get("/resources/*", (req, res) => {
  try {
    const data = readResource(req.params[0]);
    res.json({ uri: req.params[0], data: JSON.parse(data) });
  } catch (e) { res.status(404).json({ error: e.message }); }
});

router.get("/prompts/:name", (req, res) => {
  try {
    res.json({ name: req.params.name, ...getPrompt(req.params.name, req.query) });
  } catch (e) { res.status(404).json({ error: e.message }); }
});

module.exports = router;