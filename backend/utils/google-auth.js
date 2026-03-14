/**
 * Google Calendar OAuth2 Setup Helper
 *
 * Run this once to generate token.json:
 *   node utils/google-auth.js
 *
 * Prerequisites:
 *   1. Go to https://console.cloud.google.com
 *   2. Create a project → Enable "Google Calendar API"
 *   3. Credentials → Create OAuth 2.0 Client ID (type: Desktop app)
 *   4. Download JSON → save as backend/credentials.json
 */

"use strict";

const fs       = require("fs");
const path     = require("path");
const readline = require("readline");

async function main() {
  const credsPath = path.resolve(__dirname, "../credentials.json");
  const tokenPath = path.resolve(__dirname, "../token.json");

  if (!fs.existsSync(credsPath)) {
    console.error("❌ credentials.json not found!");
    console.error("   Download OAuth2 credentials from Google Cloud Console");
    console.error("   and save them as backend/credentials.json");
    process.exit(1);
  }

  const { google } = require("googleapis");
  const creds      = JSON.parse(fs.readFileSync(credsPath, "utf8"));
  const { client_secret, client_id, redirect_uris } = creds.installed || creds.web;
  const redirect_uri = (redirect_uris && redirect_uris.length > 0) ? redirect_uris[0] : "http://localhost";

  const auth = new google.auth.OAuth2(client_id, client_secret, redirect_uri);

  const authUrl = auth.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar"],
  });

  console.log("\n📅 Google Calendar Authorization\n");
  console.log("1. Open this URL in your browser:\n");
  console.log(`   ${authUrl}\n`);
  console.log("2. Sign in and authorize the app");
  console.log("3. Copy the authorization code and paste it below\n");

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const code = await new Promise(resolve => rl.question("Authorization code: ", resolve));
  rl.close();

  try {
    const { tokens } = await auth.getToken(code);
    fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
    console.log(`\n✅ Token saved to ${tokenPath}`);
    console.log("   Google Calendar integration is now active!\n");
  } catch (err) {
    console.error("\n❌ Error retrieving token:", err.message);
    process.exit(1);
  }
}

main();
