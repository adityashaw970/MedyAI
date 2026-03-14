# MedyAI – Smart Doctor Appointment & Reporting Assistant

An agentic AI-powered medical scheduling application using **MCP (Model Context Protocol)**, **FastAPI-style Node.js Backend**, **React**, **Google Calendar**, **Gmail**, and **WhatsApp** integrations.

---

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd backend
npm install
node server.js
```

The backend auto-seeds the database with sample data on first run.

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

## 🔧 External Service Setup

### Gmail SMTP (Email Confirmations)

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification**
3. Go to [App Passwords](https://myaccount.google.com/apppasswords)
4. Generate a new App Password for **"Mail"**
5. Update `backend/.env`:

```
SMTP_USER=adityashaw970@gmail.com
SMTP_PASS=<your-16-char-app-password>
```

### WhatsApp Notifications (CallMeBot)

1. Save **+34 644 31 98 61** in your WhatsApp contacts
2. Send `I allow callmebot to send me messages` to that number
3. You'll receive an **API key** – update `backend/.env`:

```
WHATSAPP_PHONE=+918961414207
WHATSAPP_APIKEY=<your-callmebot-api-key>
```

### Google Calendar API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → Enable **Google Calendar API**
3. Credentials → Create **OAuth 2.0 Client ID** (Desktop app)
4. Download as `credentials.json` → place in `backend/`
5. Run: `node utils/google-auth.js` (follows interactive auth flow → creates `token.json`)

---

## 🧩 Architecture

```
┌────────────────┐     ┌──────────────────────────────────┐
│   React UI     │────▶│   Node.js + Express Backend      │
│  (Vite + TW4)  │◀────│                                  │
└────────────────┘     │   ┌──────────────────────────┐   │
                       │   │  AI Agent (Gemini LLM)   │   │
                       │   │  ┌──────────────────────┐ │   │
                       │   │  │ MCP Tool Definitions │ │   │
                       │   │  └──────────────────────┘ │   │
                       │   └──────────────────────────┘   │
                       │                                   │
                       │   ┌────────┐ ┌──────────────────┐│
                       │   │SQLite  │ │ External Services ││
                       │   │  DB    │ │ • Gmail SMTP      ││
                       │   │        │ │ • Google Calendar  ││
                       │   │        │ │ • WhatsApp (CMB)   ││
                       │   │        │ │ • In-App Notifs    ││
                       │   └────────┘ └──────────────────┘│
                       └──────────────────────────────────┘
```

### MCP (Model Context Protocol) Design

| Layer      | Implementation                                |
|------------|-----------------------------------------------|
| **Tools**  | 9 tools exposed via `/api/mcp/tools`         |
| **Resources** | Database-backed appointment data           |
| **Prompts** | System prompts for patient/doctor roles     |

### MCP Tools Available

| Tool                         | Description                                         |
|------------------------------|-----------------------------------------------------|
| `get_doctors`                | List all doctors and specializations                |
| `check_doctor_availability`  | Check available slots for a doctor on a date        |
| `book_appointment`           | Book with **conflict detection** + email + calendar |
| `reschedule_appointment`     | Reschedule with conflict check                      |
| `cancel_appointment`         | Cancel an appointment                               |
| `get_doctor_summary`         | Stats report for a date range                       |
| `get_appointments`           | List appointments for a doctor on a date            |
| `send_doctor_notification`   | Send report via **WhatsApp + In-App**               |
| `send_whatsapp_message`      | Send a WhatsApp message to any number               |

---

## 📱 Sample Prompts

### Patient (Scenario 1)

```
"I want to book an appointment with Dr. Ahuja tomorrow morning."
"Check Dr. Smith's availability for Friday afternoon."
"Please book the 3 PM slot."
"Cancel my latest appointment."
"Reschedule my appointment to next Monday at 2 PM."
```

### Doctor (Scenario 2)

```
"How many patients visited yesterday?"
"How many appointments do I have today?"
"How many patients with fever?"
"Summarize this week and send me a notification via WhatsApp."
"Give me a full weekly report."
```

---

## 🔒 Key Features

- **Double-Booking Prevention**: Both doctor and patient schedules are checked for time overlaps before booking
- **Conversation Persistence**: Every message is stored server-side per user — previous conversations visible on re-login
- **Multi-Turn Conversations**: AI maintains context across multiple prompts within a conversation
- **Role-Based Access**: Patient vs. Doctor flows with different tools and system prompts
- **Multi-Channel Notifications**:
  - **Email** (Gmail SMTP) → Patient appointment confirmations
  - **WhatsApp** (CallMeBot) → Doctor summary reports
  - **In-App** → Doctor notifications panel
- **Google Calendar** → Appointment events with attendee invites

---

## 📦 Tech Stack

| Component     | Technology                         |
|---------------|------------------------------------|
| Frontend      | React 19, Vite, TailwindCSS 4     |
| Backend       | Node.js, Express                   |
| Database      | SQLite (via sql.js)                |
| LLM           | Google Gemini 2.5 Flash            |
| Email         | Nodemailer + Gmail SMTP            |
| Calendar      | Google Calendar API (googleapis)   |
| WhatsApp      | CallMeBot free API                 |
| Protocol      | MCP (Model Context Protocol)       |

---

## 📁 Project Structure

```
Assignment/
├── backend/
│   ├── .env                    # Environment variables
│   ├── server.js               # Express server + auto-seed
│   ├── config/
│   │   └── database.js         # SQLite schema + helpers
│   ├── routes/
│   │   ├── auth.routes.js      # Login / Register
│   │   ├── chat.routes.js      # Chat + conversation history
│   │   ├── mcp.routes.js       # MCP tool/resource/prompt endpoints
│   │   └── notifications.routes.js
│   ├── services/
│   │   ├── ai.service.js       # Gemini agent loop
│   │   ├── mcpTools.js         # MCP tool definitions + executor
│   │   └── external.js         # Email, WhatsApp, Calendar, Slack
│   └── utils/
│       ├── seed.js             # Manual seed script
│       └── google-auth.js      # Google Calendar OAuth setup
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # Login + Chat + Conversation History
│   │   ├── index.css           # Global styles
│   │   └── main.jsx            # Entry point
│   └── index.html
└── README.md
```
