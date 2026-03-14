"use strict";

const { get, all, run: dbRun } = require("../config/database");
const { NotificationService, CalendarService } = require("./external");

// ─────────────────────────────────────────────────────────────────
//  MCP Tool Definitions
// ─────────────────────────────────────────────────────────────────
const TOOL_DEFINITIONS = [
  {
    name: "get_doctors",
    description: "Fetch a list of all available doctors and their specializations.",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "check_doctor_availability",
    description: "Check a doctor's schedule for a specific date to find free/booked slots. Returns existing appointments so you can see which slots are taken.",
    parameters: {
      type: "object",
      properties: {
        doctor_id: { type: "number", description: "The ID of the doctor." },
        date: { type: "string", description: "Date to check in YYYY-MM-DD format." }
      },
      required: ["doctor_id", "date"],
    },
  },
  {
    name: "book_appointment",
    description: "Book an appointment for a patient with a doctor. IMPORTANT: Checks for conflicts first – rejects if the time slot overlaps with an existing appointment for that doctor OR if the patient already has an appointment at that time.",
    parameters: {
      type: "object",
      properties: {
        patient_id:      { type: "number" },
        doctor_id:       { type: "number" },
        start_time:      { type: "string", description: "ISO date-time string for appointment start" },
        duration:        { type: "number", description: "Duration in minutes (default 30)" },
        condition_notes: { type: "string", description: "Symptoms or reason, e.g. 'fever', 'checkup'" }
      },
      required: ["patient_id", "doctor_id", "start_time"]
    }
  },
  {
    name: "reschedule_appointment",
    description: "Reschedule an existing appointment to a new time. Also checks for conflicts at the new time.",
    parameters: {
      type: "object",
      properties: {
        appointment_id: { type: "number" },
        new_start_time: { type: "string", description: "ISO date-time string" },
        duration:       { type: "number", description: "Duration in minutes (default: keep existing)" }
      },
      required: ["appointment_id", "new_start_time"]
    }
  },
  {
    name: "cancel_appointment",
    description: "Cancel an existing appointment.",
    parameters: {
      type: "object",
      properties: { appointment_id: { type: "number" } },
      required: ["appointment_id"]
    }
  },
  {
    name: "get_doctor_summary",
    description: "Get a summary report of patients and conditions for a doctor over a date range.",
    parameters: {
      type: "object",
      properties: {
        doctor_id:  { type: "number" },
        start_date: { type: "string", description: "YYYY-MM-DD" },
        end_date:   { type: "string", description: "YYYY-MM-DD" }
      },
      required: ["doctor_id", "start_date", "end_date"]
    }
  },
  {
    name: "get_appointments",
    description: "Get a list of appointments for a doctor on a specific date.",
    parameters: {
      type: "object",
      properties: {
        doctor_id: { type: "number" },
        date:      { type: "string", description: "YYYY-MM-DD" }
      },
      required: ["doctor_id", "date"]
    }
  },
  {
    name: "send_doctor_notification",
    description: "Send a notification/report to the doctor via BOTH WhatsApp and In-App notification. Use this to deliver summary reports.",
    parameters: {
      type: "object",
      properties: {
        doctor_id: { type: "number" },
        message:   { type: "string" }
      },
      required: ["doctor_id", "message"]
    }
  },
  {
    name: "send_whatsapp_message",
    description: "Send a WhatsApp message to a specific phone number.",
    parameters: {
      type: "object",
      properties: {
        phone:   { type: "string", description: "Phone number with country code, e.g. +918961414207" },
        message: { type: "string", description: "The message text to send" }
      },
      required: ["phone", "message"]
    }
  }
];

const RESOURCES = [];
const PROMPTS = [];

// ─────────────────────────────────────────────────────────────────
//  Double-Booking Prevention Helper
// ─────────────────────────────────────────────────────────────────
function checkTimeConflict(entityType, entityId, startTime, duration, excludeApptId = null) {
  const date       = startTime.slice(0, 10); // YYYY-MM-DD
  const newStartMs = new Date(startTime).getTime();
  const newEndMs   = newStartMs + (duration || 30) * 60 * 1000;

  const column = entityType === "doctor" ? "doctor_id" : "patient_id";
  let query = `SELECT id, appointment_time, duration FROM appointments WHERE ${column} = ? AND appointment_time LIKE ? AND status != 'cancelled'`;
  const params = [entityId, date + "%"];

  if (excludeApptId) {
    query += " AND id != ?";
    params.push(excludeApptId);
  }

  const existing = all(query, params);

  for (const appt of existing) {
    const apptStartMs = new Date(appt.appointment_time).getTime();
    const apptEndMs   = apptStartMs + (appt.duration || 30) * 60 * 1000;

    // Overlap check: new [start, end) intersects existing [start, end)
    if (newStartMs < apptEndMs && newEndMs > apptStartMs) {
      const apptTimeStr = new Date(appt.appointment_time).toLocaleTimeString("en-IN", {
        hour: "2-digit", minute: "2-digit", hour12: true
      });
      return {
        conflict: true,
        message: `Time slot conflicts with existing appointment #${appt.id} at ${apptTimeStr}. Please choose a different time.`
      };
    }
  }
  return { conflict: false };
}

// ─────────────────────────────────────────────────────────────────
//  Tool Executor
// ─────────────────────────────────────────────────────────────────
async function executeTool(name, args) {
  try {

    // ── get_doctors ──────────────────────────────────────────────
    if (name === "get_doctors") {
      return all("SELECT id, name, specialization, email FROM doctors");
    }

    // ── check_doctor_availability ────────────────────────────────
    if (name === "check_doctor_availability") {
      const booked = all(
        `SELECT a.id, a.appointment_time, a.duration, a.status, a.condition_notes, p.name as patient_name
         FROM appointments a
         LEFT JOIN patients p ON a.patient_id = p.id
         WHERE a.doctor_id = ? AND a.appointment_time LIKE ? AND a.status != 'cancelled'
         ORDER BY a.appointment_time`,
        [args.doctor_id, args.date + "%"]
      );
      const doctor = get("SELECT name, specialization FROM doctors WHERE id = ?", [args.doctor_id]);
      return {
        doctor: doctor ? `Dr. ${doctor.name} (${doctor.specialization})` : "Unknown",
        date: args.date,
        booked_slots: booked,
        total_booked: booked.length,
        note: "Working hours are typically 9 AM to 5 PM. Any slot not listed above is available."
      };
    }

    // ── book_appointment (with double-booking prevention) ────────
    if (name === "book_appointment") {
      const duration = args.duration || 30;

      // 1. Check DOCTOR time conflicts
      const doctorConflict = checkTimeConflict("doctor", args.doctor_id, args.start_time, duration);
      if (doctorConflict.conflict) {
        return { success: false, error: `Doctor unavailable: ${doctorConflict.message}` };
      }

      // 2. Check PATIENT time conflicts (same patient double-booking)
      const patientConflict = checkTimeConflict("patient", args.patient_id, args.start_time, duration);
      if (patientConflict.conflict) {
        return { success: false, error: `You already have an appointment at this time: ${patientConflict.message}` };
      }

      // 3. All clear – insert the appointment
      const endTime = new Date(new Date(args.start_time).getTime() + duration * 60000).toISOString();
      const dbResult = dbRun(
        `INSERT INTO appointments (doctor_id, patient_id, appointment_time, condition_notes, duration, created_at, status)
         VALUES (?, ?, ?, ?, ?, ?, 'scheduled')`,
        [args.doctor_id, args.patient_id, args.start_time, args.condition_notes || "", duration, new Date().toISOString()]
      );

      // 4. Send email confirmation to patient (Scenario 1 requirement)
      const p = get("SELECT name, email FROM patients WHERE id = ?", [args.patient_id]);
      const d = get("SELECT name, email FROM doctors WHERE id = ?",  [args.doctor_id]);

      if (p && p.email) {
        await NotificationService.sendEmail({
          toEmail: p.email,
          subject: `✅ Appointment Confirmed – Dr. ${d?.name || "Doctor"}`,
          body: [
            `Hi ${p.name},`,
            ``,
            `Your appointment has been confirmed!`,
            ``,
            `📋 Details:`,
            `   Doctor:    Dr. ${d?.name || "Doctor"}`,
            `   Date/Time: ${new Date(args.start_time).toLocaleString("en-IN")}`,
            `   Duration:  ${duration} minutes`,
            `   Reason:    ${args.condition_notes || "General consultation"}`,
            ``,
            `📍 Please arrive 10 minutes early.`,
            ``,
            `Thanks for using MedyAI!`,
          ].join("\n"),
        });
      }

      // Also send email confirmation to Doctor
      if (d && d.email) {
        await NotificationService.sendEmail({
          toEmail: d.email,
          subject: `📅 New Appointment Booked – Patient: ${p?.name || "Patient"}`,
          body: [
            `Hi Dr. ${d.name},`,
            ``,
            `A new appointment has been scheduled.`,
            ``,
            `📋 Details:`,
            `   Patient:   ${p?.name || "Patient"}`,
            `   Date/Time: ${new Date(args.start_time).toLocaleString("en-IN")}`,
            `   Duration:  ${duration} minutes`,
            `   Reason:    ${args.condition_notes || "General consultation"}`,
            ``,
            `MedyAI System`,
          ].join("\n"),
        });
      }

      // 5. Schedule Google Calendar event
      if (p && d && p.email) {
        await CalendarService.createEvent({
          summary:       `Appointment: ${p.name} with Dr. ${d.name}`,
          description:   `Reason: ${args.condition_notes || "General consultation"}\nDuration: ${duration} min\nBooked via MedyAI`,
          startTime:     new Date(args.start_time),
          endTime:       new Date(endTime),
          attendeeEmails: [p.email, d.email].filter(Boolean),
        });
      }

      return {
        success: true,
        message: `Appointment booked successfully! Confirmation emails sent to Patient (${p?.email || "patient"}) and Doctor (${d?.email || "doctor"}).`,
        appointment_id: dbResult.lastInsertRowid,
        details: {
          doctor: d ? `Dr. ${d.name}` : "Doctor",
          patient: p?.name || "Patient",
          time: args.start_time,
          duration,
          condition: args.condition_notes || "",
          email_confirmation: p?.email ? "sent" : "skipped",
          calendar_event: "created",
        }
      };
    }

    // ── reschedule_appointment (with conflict check) ─────────────
    if (name === "reschedule_appointment") {
      const appt = get("SELECT * FROM appointments WHERE id = ?", [args.appointment_id]);
      if (!appt) return { success: false, error: "Appointment not found." };
      if (appt.status === "cancelled") return { success: false, error: "Cannot reschedule a cancelled appointment." };

      const duration = args.duration || appt.duration || 30;

      // Check doctor conflict
      const doctorConflict = checkTimeConflict("doctor", appt.doctor_id, args.new_start_time, duration, args.appointment_id);
      if (doctorConflict.conflict) {
        return { success: false, error: `Doctor unavailable at new time: ${doctorConflict.message}` };
      }

      // Check patient conflict
      const patientConflict = checkTimeConflict("patient", appt.patient_id, args.new_start_time, duration, args.appointment_id);
      if (patientConflict.conflict) {
        return { success: false, error: `Patient conflict at new time: ${patientConflict.message}` };
      }

      dbRun("UPDATE appointments SET appointment_time = ?, duration = ? WHERE id = ?",
        [args.new_start_time, duration, args.appointment_id]);

      return {
        success: true,
        message: `Appointment #${args.appointment_id} rescheduled to ${new Date(args.new_start_time).toLocaleString("en-IN")}.`
      };
    }

    // ── cancel_appointment ───────────────────────────────────────
    if (name === "cancel_appointment") {
      const appt = get("SELECT * FROM appointments WHERE id = ?", [args.appointment_id]);
      if (!appt) return { success: false, error: "Appointment not found." };
      if (appt.status === "cancelled") return { success: false, error: "Appointment is already cancelled." };

      dbRun("UPDATE appointments SET status = 'cancelled' WHERE id = ?", [args.appointment_id]);

      // Fetch patient and doctor details
      const p = get("SELECT name, email FROM patients WHERE id = ?", [appt.patient_id]);
      const d = get("SELECT name, email FROM doctors WHERE id = ?",  [appt.doctor_id]);

      // Send cancellation emails
      if (p && p.email) {
        await NotificationService.sendEmail({
          toEmail: p.email,
          subject: `❌ Appointment Cancelled – Dr. ${d?.name || "Doctor"}`,
          body: [
            `Hi ${p.name},`,
            ``,
            `Your appointment scheduled for ${new Date(appt.appointment_time).toLocaleString("en-IN")} has been cancelled.`,
            ``,
            `If you need to reschedule, please use the MedyAI app.`,
            ``,
            `Thanks for using MedyAI!`,
          ].join("\n"),
        });
      }

      if (d && d.email) {
        await NotificationService.sendEmail({
          toEmail: d.email,
          subject: `❌ Appointment Cancelled – Patient: ${p?.name || "Patient"}`,
          body: [
            `Hi Dr. ${d.name},`,
            ``,
            `The appointment with ${p?.name || "Patient"} scheduled for ${new Date(appt.appointment_time).toLocaleString("en-IN")} has been cancelled.`,
            ``,
            `This slot is now available for other patients.`,
            ``,
            `MedyAI System`,
          ].join("\n"),
        });
      }

      return { success: true, message: `Appointment #${args.appointment_id} has been cancelled. Cancellation emails sent.` };
    }

    // ── get_doctor_summary ───────────────────────────────────────
    if (name === "get_doctor_summary") {
      const conditions = all(`
        SELECT a.condition_notes, count(a.id) as count, a.status
        FROM appointments a
        WHERE a.doctor_id = ? AND a.appointment_time >= ? AND a.appointment_time <= ? AND a.status != 'cancelled'
        GROUP BY a.condition_notes, a.status
      `, [args.doctor_id, args.start_date, args.end_date + "T23:59:59.999Z"]);

      const totalPatients = get(`
        SELECT COUNT(DISTINCT a.patient_id) as total
        FROM appointments a
        WHERE a.doctor_id = ? AND a.appointment_time >= ? AND a.appointment_time <= ? AND a.status != 'cancelled'
      `, [args.doctor_id, args.start_date, args.end_date + "T23:59:59.999Z"]);

      const doctor = get("SELECT name FROM doctors WHERE id = ?", [args.doctor_id]);

      return {
        doctor: doctor ? `Dr. ${doctor.name}` : "Unknown",
        date_range: `${args.start_date} to ${args.end_date}`,
        total_unique_patients: totalPatients?.total || 0,
        conditions_breakdown: conditions,
      };
    }

    // ── get_appointments ─────────────────────────────────────────
    if (name === "get_appointments") {
      return all(`
        SELECT a.id, a.appointment_time, a.duration, a.status, a.condition_notes, p.name as patient_name, p.email as patient_email
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        WHERE a.doctor_id = ? AND a.appointment_time LIKE ? AND a.status != 'cancelled'
        ORDER BY a.appointment_time
      `, [args.doctor_id, args.date + "%"]);
    }

    // ── send_doctor_notification (WhatsApp + In-App) ─────────────
    if (name === "send_doctor_notification") {
      const doctor = get("SELECT name, phone FROM doctors WHERE id = ?", [args.doctor_id]);
      const phone  = doctor?.phone || process.env.WHATSAPP_PHONE || "+918961414207";

      const result = await NotificationService.sendDoctorReport(
        args.doctor_id,
        args.message,
        phone
      );

      return {
        success: true,
        message: `Report delivered to Dr. ${doctor?.name || "Doctor"} via WhatsApp (${phone}) and In-App notification.`,
        channels: result,
      };
    }

    // ── send_whatsapp_message ────────────────────────────────────
    if (name === "send_whatsapp_message") {
      const result = await NotificationService.sendWhatsApp({
        phone:   args.phone,
        message: args.message,
      });
      return {
        success: true,
        message: `WhatsApp message sent to ${args.phone}.`,
        details: result,
      };
    }

    return { error: "Unknown tool: " + name };
  } catch (err) {
    console.error(`❌ Tool "${name}" error:`, err.message);
    return { error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────
function readResource(uri) {
  throw new Error("Resource not found");
}

function getPrompt(name, args) {
  throw new Error("Prompt not found");
}

module.exports = {
  TOOL_DEFINITIONS,
  RESOURCES,
  PROMPTS,
  executeTool,
  readResource,
  getPrompt,
  NotificationService,
  CalendarService,
};