// server.js - Main application file with improved error handling, logging, and file upload
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const http = require('http');
const socketIo = require('socket.io');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Accept only .txt files
    if (path.extname(file.originalname) !== '.txt') {
      return cb(new Error('Only .txt files are allowed'));
    }
    cb(null, true);
  },
  limits: {
    fileSize: 1024 * 1024 * 5 // limit to 5MB
  }
});

// Create log file stream
const logFile = fs.createWriteStream(path.join(logsDir, 'app.log'), { flags: 'a' });

// Simple logging function
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  logFile.write(logMessage + '\n');
}

// Initialize Express
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));
app.use(express.json());

// Message queue
const messageQueue = [];
let processingQueue = false;
let qrCodeData = null;
let clientReady = false;

log('Starting WhatsApp sender application...');

// Initialize WhatsApp client
try {
  log('Initializing WhatsApp client...');
  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './whatsapp-session' }),
    puppeteer: { 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
    }
  });

  // WhatsApp Events
  client.on('qr', (qr) => {
    log('QR code received: ' + qr.substring(0, 20) + '...');
    qrCodeData = qr;
    io.emit('qrCode', qr);
  });

  client.on('ready', () => {
    log('Client is ready!');
    clientReady = true;
    qrCodeData = null;
    io.emit('clientReady');
    processQueue();
  });

  client.on('authenticated', () => {
    log('Client authenticated successfully');
    qrCodeData = null;
  });

  client.on('auth_failure', (msg) => {
    log('Authentication failure: ' + msg);
    io.emit('authFailure', { message: msg });
  });

  client.on('disconnected', (reason) => {
    log('Client disconnected: ' + reason);
    clientReady = false;
    io.emit('clientDisconnected', { reason });
  });

  // Initialize client with error handling
  client.initialize().catch(err => {
    log('Error initializing client: ' + err.message);
    io.emit('initError', { error: err.message });
  });

  // Process text file in background and queue the content as a message
  function processTextFile(filePath, to) {
    return new Promise((resolve, reject) => {
      log(`Processing text file: ${filePath}`);
      
      // Read file content asynchronously
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          log(`Error reading file: ${err.message}`);
          reject(err);
          return;
        }
        
        log(`File processed successfully. Content length: ${data.length} characters`);
        
        // Add the file content to the message queue
        messageQueue.push({
          to: to,
          text: data
        });
        
        // Start processing the queue if not already processing
        processQueue();
        
        // Clean up the file
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) {
            log(`Warning: Could not delete file ${filePath}: ${unlinkErr.message}`);
          } else {
            log(`File ${filePath} deleted after processing`);
          }
        });
        
        resolve();
      });
    });
  }

// Process message queue with fixed phone number formatting
async function processQueue() {
  if (!clientReady || processingQueue || messageQueue.length === 0) return;
  
  processingQueue = true;
  
  try {
    const message = messageQueue.shift();
    log(`Sending message to ${message.to}: ${message.text.substring(0, 30)}...`);
    
    // Format the destination ID based on whether it's a group or individual
    let formattedNumber = message.to.replace(/^\+/, '');
    
    // Check if it's a group ID (groups should be prefixed with "group:" in the request)
    if (message.to.startsWith('group:')) {
      // Extract the group ID and format it
      formattedNumber = message.to.replace('group:', '');
      if (!formattedNumber.includes('@g.us')) {
        formattedNumber = `${formattedNumber}@g.us`;
      }
    } else {
      // Regular contact number
      if (!formattedNumber.includes('@c.us')) {
        formattedNumber = `${formattedNumber}@c.us`;
      }
    }
    
    log(`Formatted destination ID: ${formattedNumber}`);
    
    await client.sendMessage(formattedNumber, message.text);
    log('Message sent successfully');
    io.emit('messageSent', { to: message.to, text: message.text });
    
    // Wait 3 seconds between messages to avoid rate limiting
    setTimeout(() => {
      processingQueue = false;
      processQueue();
    }, 3000);
  } catch (error) {
    log('Error sending message: ' + error.message);
    io.emit('messageError', { error: error.message });
    processingQueue = false;
  }
}

  // API Routes
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  // Add logout endpoint
  app.post('/api/logout', async (req, res) => {
    try {
      log('Logout request received');
      
      if (clientReady) {
        await client.logout();
        log('Client logged out successfully');
        clientReady = false;
        io.emit('clientLoggedOut');
        
        // Reinitialize the client after logout
        setTimeout(() => {
          log('Reinitializing client after logout...');
          client.initialize().catch(err => {
            log('Error reinitializing client: ' + err.message);
            io.emit('initError', { error: err.message });
          });
        }, 1000); // Wait 1 second before reinitializing
        
        res.json({ success: true, message: 'Logged out successfully' });
      } else {
        res.status(400).json({ error: 'Client not logged in' });
      }
    } catch (error) {
      log('Error during logout: ' + error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Get current chat info endpoint
  app.get('/api/current-chat', async (req, res) => {
    try {
      log('Current chat info request received');
      
      if (!clientReady) {
        return res.status(400).json({ error: 'WhatsApp client not connected' });
      }
      
      res.json({ 
        success: true, 
        message: 'To find a group ID, send a message to the group from this WhatsApp account, then check your chats.'
      });
    } catch (error) {
      log('Error getting current chat: ' + error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Updated endpoint to handle regular messages and file uploads
  app.post('/api/send', upload.single('messageFile'), async (req, res) => {
    try {
      // Get data from request body or form fields
      const to = req.body.to;
      const text = req.body.text;
      const scheduleTime = req.body.scheduleTime;
      const uploadedFile = req.file;
      
      if (!to) {
        return res.status(400).json({ error: 'Phone number is required' });
      }
      
      // If neither text nor file is provided, return error
if (!to) {
  return res.status(400).json({ error: 'Phone number is required' });
}

if (!text && !uploadedFile) {
  return res.status(400).json({ error: 'Message text or file is required' });
}      
      log(`Received request to send message to ${to}`);
      
      if (scheduleTime) {
        // Handle scheduled message
        const scheduledTime = new Date(scheduleTime);
        const now = new Date();
        
        if (scheduledTime <= now) {
          return res.status(400).json({ error: 'Schedule time must be in the future' });
        }
        
        const taskId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        
        // Create cron schedule
        const diff = scheduledTime - now;
        const executeAt = new Date(now.getTime() + diff);
        
        // Format for cron: second(0-59) minute(0-59) hour(0-23) day(1-31) month(1-12) day(0-7)
        const second = executeAt.getSeconds();
        const minute = executeAt.getMinutes();
        const hour = executeAt.getHours();
        const day = executeAt.getDate();
        const month = executeAt.getMonth() + 1;
        const dayOfWeek = executeAt.getDay();
        
        const cronExpression = `${second} ${minute} ${hour} ${day} ${month} ${dayOfWeek}`;
        log(`Scheduling message for ${executeAt.toISOString()} with cron: ${cronExpression}`);
        
        cron.schedule(cronExpression, () => {
          log(`Executing scheduled message to ${to}`);
          
          if (uploadedFile) {
            // Process file for scheduled message
            processTextFile(uploadedFile.path, to)
              .catch(err => {
                log(`Error processing scheduled file: ${err.message}`);
                io.emit('messageError', { error: `Error processing scheduled file: ${err.message}` });
              });
          } else {
            // Send text message
            messageQueue.push({ to, text });
            processQueue();
          }
        }, {
          scheduled: true,
          timezone: "UTC"
        });
        
        return res.json({ 
          success: true, 
          message: 'Message scheduled', 
          scheduledAt: executeAt,
          taskId
        });
      } else {
        // Send message now
        if (uploadedFile) {
          // Process the uploaded file in the background
          log(`File uploaded: ${uploadedFile.filename}`);
          
          // Send a response immediately
          res.json({ success: true, message: 'File upload received and being processed' });
          
          // Process file in the background
          processTextFile(uploadedFile.path, to)
            .catch(err => {
              log(`Error processing file: ${err.message}`);
              io.emit('messageError', { error: `Error processing file: ${err.message}` });
            });
        } else {
          // Send text message
          messageQueue.push({ to, text });
          processQueue();
          return res.json({ success: true, message: 'Message added to queue' });
        }
      }
    } catch (error) {
      log('Error in /api/send: ' + error.message);
      return res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/status', (req, res) => {
    try {
      log('Status request received');
      res.json({
        qrCode: qrCodeData,
        clientReady,
        queueLength: messageQueue.length
      });
    } catch (error) {
      log('Error in /api/status: ' + error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Socket.io connection
  io.on('connection', (socket) => {
    log('A user connected: ' + socket.id);
    
    if (qrCodeData) {
      log('Sending QR code to new connection');
      socket.emit('qrCode', qrCodeData);
    }
    
    if (clientReady) {
      socket.emit('clientReady');
    }
    
    socket.on('disconnect', () => {
      log('User disconnected: ' + socket.id);
    });
  });

  // Start server
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    log(`Server running on port ${PORT}`);
  });

} catch (err) {
  log('Critical error starting application: ' + err.message);
  console.error(err);
}