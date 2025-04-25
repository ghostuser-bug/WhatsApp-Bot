# WhatsApp SenderA simple WhatsApp sender with a web interface, supporting scheduled messages and file uploads.---## Features- Send WhatsApp messages to individuals or groups- Schedule messages for future delivery- Upload `.txt` files to send as messages- Web-based interface with QR code authentication---## Requirements- Node.js (v14 or higher recommended)- npm (Node Package Manager)- WhatsApp account (for QR code login)---## Installation### 1. Clone the Repository```bashgit clone https://github.com/yourusername/WhatsApp-Bot.gitcd WhatsApp-Bot
2. Install Dependencies
Windows / Linux
bash
Run
npm install
Termux (Android)
Install Node.js and git:
bash
Run
pkg install nodejs git
Clone and install:
bash
Run
git clone https://github.com/yourusername/WhatsApp-Bot.gitcd WhatsApp-Botnpm install
Usage
Start the Server
Windows / Linux
bash
Run
npm start
Or for development with auto-reload:

bash
Run
npm run dev
Termux
bash
Run
npm start
Access the Web Interface
Open your browser and go to:

plaintext

http://localhost:3000
If running on Termux/Android, find your device's IP address (e.g., ip addr show) and access:

plaintext

http://<your-device-ip>:3000
Login with WhatsApp
On the web interface, scan the QR code using WhatsApp on your phone (Menu > Linked Devices).
Wait for the client to connect.
Send a Message
Enter the recipient's phone number (with country code, e.g., 60123456789 for Malaysia).
Enter your message or upload a .txt file.
(Optional) Set a schedule time for future delivery.
Click Send.
To send to a group:

Use the group ID (e.g., group:1234567890@g.us).
You can find group IDs by sending a message to the group and checking your WhatsApp Web session.
Notes
Do not share your whatsapp-session folder or any authentication/session files.
Uploaded files and logs are stored locally and should be managed according to your privacy needs.
If you encounter issues with QR code scanning, try restarting the server and refreshing the page.
Troubleshooting
Port already in use: Change the port in server.js or stop the conflicting service.
Permission errors on Termux: Use chmod to grant permissions or run as a user with sufficient rights.
Dependencies not installing: Ensure your Node.js version is up to date.
License
MIT

Credits
whatsapp-web.js
express
socket.io
