# WhatsApp Sender Application

This is an Express-based Node.js application that uses `whatsapp-web.js` to send WhatsApp messages (text or `.txt` file contents), schedule messages via cron, log activity, and handle file uploads.  

## Features

- Serve a web UI (in `public/index.html`) to display QR code and status  
- Send immediate or scheduled messages  
- Upload a `.txt` file to send its contents as a message  
- Automatic retry and queueing  
- Logout, status, and “current chat” endpoints  
- Detailed logging to `logs/app.log` and automatic upload cleanup (`uploads/`) 

---

## Prerequisites

- **Node.js** v14+ and **npm**  
- **Git** (to clone repo)  
- A modern browser to scan QR code  

---

## Installation (all platforms)

1. Clone this repository:  
   ```bash
   git clone https://github.com/ghostuser-bug/WhatsApp-Bot.git
   cd WhatsApp-Bot
   ```  
2. Install dependencies:  
   ```bash
   npm install
   ```  
3. Ensure directories exist (the app does this automatically on first run):  
   - `logs/` for `app.log`  
   - `uploads/` for incoming `.txt` files   

---

## Configuration

- By default the server listens on port **3000**. To change, set environment variable `PORT`.  
- Sessions are stored under `./whatsapp-session` (managed by `LocalAuth`).  

---

## Running the App

### Termux (Android)

1. **Install Node.js**  
   ```bash
   pkg update && pkg upgrade
   pkg install nodejs git
   ```  
2. **Clone & install** (as above).  
3. **Launch**  
   ```bash
   npm start
   ```  
4. In your Android browser, open `http://localhost:3000`. Scan the QR code with your WhatsApp mobile app.  

### Linux (Ubuntu/Debian)

1. **Install Node.js & Git**  
   ```bash
   sudo apt update
   sudo apt install nodejs npm git
   ```  
2. **Clone & install** (as above).  
3. **Start**  
   ```bash
   npm start
   ```  
4. Open `http://localhost:3000` in your browser, scan QR code.  

### Windows

1. Download and install Node.js (includes npm) from https://nodejs.org.  
2. Open **PowerShell**, then clone and install:  
   ```powershell
   git clone https://your-repo-url.git
   cd your-repo-url
   npm install
   npm start
   ```  
3. In your browser navigate to `http://localhost:3000`, scan QR.  

---

## Usage

Once the client is “ready” (shown in the UI), you have these HTTP endpoints:

| Endpoint             | Method | Payload / Query                             | Description                                              |
|----------------------|--------|----------------------------------------------|----------------------------------------------------------|
| `/api/send`          | POST   | `to` (string), `text` (string)               | Send immediate text message                              |
|                      |        | _or_ `messageFile` (.txt upload)             | Send uploaded file content                               |
|                      |        | optional `scheduleTime` (ISO datetime)       | Schedule message for future                              |
| `/api/status`        | GET    | —                                            | Returns `{ qrCode, clientReady, queueLength }`           |
| `/api/logout`        | POST   | —                                            | Logout WhatsApp session; client will re-initialize       |
| `/api/current-chat`  | GET    | —                                            | Info on how to capture a group ID by messaging in app   |

_Examples_:

- Send now:  
  ```bash
  curl -X POST http://localhost:3000/api/send \
    -H "Content-Type: application/json" \
    -d '{"to":"+1234567890","text":"Hello from API!"}'
  ```
- Schedule for later:  
  ```bash
  curl -X POST http://localhost:3000/api/send \
    -F to="+1234567890" \
    -F messageFile="@./note.txt" \
    -F scheduleTime="2025-05-01T10:00:00Z"
  ```

---

## Logs & Uploads

- **Logs**: `logs/app.log` captures timestamps, events, errors.  
- **Uploads**: `.txt` files saved to `uploads/`, processed, then deleted.   

---

## Troubleshooting

- **Stuck on QR**: ensure no old session in `whatsapp-session`; you can delete that folder and restart.  
- **Port in use**: set `PORT` env var, e.g. `PORT=4000 npm start`.  
- **Permissions** (Termux/Linux): ensure Node can write to project directory.

---
