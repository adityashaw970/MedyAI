/**
 * external.js – Email (Gmail SMTP), WhatsApp (CallMeBot), Google Calendar, Slack, In-App.
 * All services degrade gracefully to mock/console mode when credentials are absent.
 */

"use strict";

const nodemailer = require("nodemailer");

// ─────────────────────────────────────────────────────────────────
//  Email Service (Gmail SMTP)
// ─────────────────────────────────────────────────────────────────
class EmailService {

  static async send({ toEmail, subject, body }) {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass || pass === "your-16-char-app-password") {
      console.log(`📧 MOCK EMAIL → ${toEmail}\n   Subject: ${subject}\n   ${body.slice(0, 120)}…`);
      return { status: "sent", mocked: true, to: toEmail, channel: "email" };
    }
    try {
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: false,
        auth: { user, pass },
      });
      await transport.sendMail({ from: `MedyAI <${user}>`, to: toEmail, subject, text: body });
      console.log(`📧 EMAIL SENT → ${toEmail} | ${subject}`);
      return { status: "sent", mocked: false, to: toEmail, channel: "email" };
    } catch (e) {
      console.error("📧 Email error:", e.message);
      return { status: "error", message: e.message, channel: "email" };
    }
  }
}

// ─────────────────────────────────────────────────────────────────
//  WhatsApp Service (CallMeBot free API)
//
//  One-time setup for each recipient phone:
//    1. Save +34 644 31 98 61 in contacts as "CallMeBot"
//    2. Send "I allow callmebot to send me messages" via WhatsApp
//    3. You'll receive an API key – put it in .env as WHATSAPP_APIKEY
// ─────────────────────────────────────────────────────────────────
class WhatsAppService {

  static async sendMessage({ phone, message }) {
    const apiKey      = process.env.WHATSAPP_APIKEY;
    const targetPhone = phone || process.env.WHATSAPP_PHONE || "+918961414207";

    // Also store every WhatsApp message in the database for history
    try {
      const { run } = require("../config/database");
      run(
        "INSERT INTO whatsapp_messages (phone, message, status, created_at) VALUES (?, ?, 'sent', ?)",
        [targetPhone, message, new Date().toISOString()]
      );
    } catch (e) { /* table might not exist yet during init */ }

    if (!apiKey) {
      console.log(`📱 MOCK WHATSAPP → ${targetPhone}`);
      console.log(`   ${message.slice(0, 150)}…`);
      return { status: "sent", channel: "whatsapp", mocked: true, phone: targetPhone };
    }

    try {
      const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(targetPhone)}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`CallMeBot returned HTTP ${res.status}`);
      console.log(`📱 WHATSAPP SENT → ${targetPhone}`);
      return { status: "sent", channel: "whatsapp", mocked: false, phone: targetPhone };
    } catch (e) {
      console.error("📱 WhatsApp error:", e.message);
      return { status: "error", channel: "whatsapp", message: e.message, phone: targetPhone };
    }
  }
}

// ─────────────────────────────────────────────────────────────────
//  Slack Service (webhook)
// ─────────────────────────────────────────────────────────────────
class SlackService {

  static async send(message) {
    const webhook = process.env.SLACK_WEBHOOK_URL;
    if (!webhook) {
      console.log(`🔔 MOCK SLACK: ${message.slice(0, 120)}`);
      return { status: "sent", channel: "slack", mocked: true };
    }
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message }),
      });
      if (!res.ok) throw new Error(`Slack ${res.status}`);
      return { status: "sent", channel: "slack", mocked: false };
    } catch (e) {
      console.error("Slack error:", e.message);
      return { status: "error", channel: "slack", message: e.message };
    }
  }
}

// ─────────────────────────────────────────────────────────────────
//  In-App Notification Service
// ─────────────────────────────────────────────────────────────────
class InAppNotificationService {

  static send(doctorId, message) {
    const { run } = require("../config/database");
    try {
      const r = run(
        "INSERT INTO notifications (doctor_id, message, channel, created_at, read) VALUES (?, ?, 'in_app', ?, 0)",
        [doctorId, message, new Date().toISOString()]
      );
      console.log(`🔔 IN-APP #${r.lastInsertRowid} → doctor ${doctorId}`);
      return { status: "sent", channel: "in_app", notificationId: r.lastInsertRowid };
    } catch (e) {
      console.error("In-app notif error:", e.message);
      return { status: "error", channel: "in_app", message: e.message };
    }
  }
}

// ─────────────────────────────────────────────────────────────────
//  Google Calendar Service (OAuth2)
// ─────────────────────────────────────────────────────────────────
class CalendarService {
  static async createEvent({ summary, description, startTime, endTime, attendeeEmails }) {
    const fs = require("fs");
    const credsPath = process.env.GOOGLE_CREDENTIALS_PATH || "./credentials.json";
    const tokenPath = process.env.GOOGLE_TOKEN_PATH       || "./token.json";

    if (!fs.existsSync(credsPath) || !fs.existsSync(tokenPath)) {
      const ts  = startTime instanceof Date ? startTime.toISOString() : String(startTime);
      const slug = ts.slice(0, 16).replace(/[-:T]/g, "");
      const link = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(summary)}&dates=${slug}/${slug}&details=${encodeURIComponent(description || "")}`;
      console.log(`📅 MOCK CALENDAR: "${summary}" at ${ts}`);
      return { status: "created", mocked: true, eventLink: link };
    }

    try {
      const { google } = require("googleapis");
      const token      = JSON.parse(fs.readFileSync(tokenPath, "utf8"));
      const creds      = JSON.parse(fs.readFileSync(credsPath, "utf8"));
      const { client_secret, client_id, redirect_uris } = creds.installed || creds.web;
      const redirect_uri = (redirect_uris && redirect_uris.length > 0) ? redirect_uris[0] : "http://localhost";

      const auth = new google.auth.OAuth2(client_id, client_secret, redirect_uri);
      auth.setCredentials(token);

      const cal    = google.calendar({ version: "v3", auth });
      const sTime  = startTime instanceof Date ? startTime : new Date(startTime);
      const eTime  = endTime   instanceof Date ? endTime   : new Date(endTime || sTime.getTime() + 30 * 60000);

      const attendees = Array.isArray(attendeeEmails) 
        ? attendeeEmails.map(email => ({ email }))
        : (attendeeEmails ? [{ email: attendeeEmails }] : []);

      const result = await cal.events.insert({
        calendarId: "primary",
        resource: {
          summary,
          description,
          start: { dateTime: sTime.toISOString(), timeZone: "Asia/Kolkata" },
          end:   { dateTime: eTime.toISOString(),  timeZone: "Asia/Kolkata" },
          attendees,
        },
        sendUpdates: "all",
      });

      console.log(`📅 CALENDAR EVENT CREATED → ${result.data.htmlLink}`);
      return { status: "created", mocked: false, eventLink: result.data.htmlLink };
    } catch (e) {
      console.error("📅 Calendar error:", e.message);
      return { status: "error", channel: "calendar", message: e.message };
    }
  }
}

// ─────────────────────────────────────────────────────────────────
//  Unified Notification Dispatcher
//  Sends across multiple channels based on context
// ─────────────────────────────────────────────────────────────────
class NotificationService {

  /** Send email confirmation (Scenario 1 – Patient booking) */
  static async sendEmail(opts) {
    return EmailService.send(opts);
  }

  /** Send Slack message */
  static async sendSlack(message) {
    return SlackService.send(message);
  }

  /** Send in-app notification */
  static sendInApp(doctorId, message) {
    return InAppNotificationService.send(doctorId, message);
  }

  /** Send WhatsApp message (Scenario 2 – Doctor reports) */
  static async sendWhatsApp({ phone, message }) {
    return WhatsAppService.sendMessage({ phone, message });
  }

  /**
   * Send doctor report via BOTH WhatsApp + In-App (Scenario 2 requirement:
   * "send this report via a different notification mechanism")
   */
  static async sendDoctorReport(doctorId, message, phone) {
    const inAppResult   = InAppNotificationService.send(doctorId, message);
    const whatsAppResult = await WhatsAppService.sendMessage({ phone, message });
    return {
      in_app:   inAppResult,
      whatsapp: whatsAppResult,
      summary:  "Report sent via In-App notification + WhatsApp",
    };
  }
}

module.exports = {
  NotificationService,
  CalendarService,
  WhatsAppService,
  EmailService,
  SlackService,
  InAppNotificationService,
};