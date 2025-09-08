// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { connectMongo } = require('./config/db');

const app = express();
const server = http.createServer(app);

// Production-ready Socket.IO setup with proper CORS
const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "https://javault.vercel.app",
      "http://localhost:3000"
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Production CORS middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || "http://localhost:3000",
    "https://javault.vercel.app",
    "http://localhost:3000"
  ],
  credentials: true
}));

app.use(express.json());

// Connect to MongoDB
connectMongo();

// Make io available to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Health check for Render deployment
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    message: 'JAVault API server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Internal API route for Cloudflare Worker communication
app.post('/internal/job-update', (req, res) => {
  const { event, data } = req.body;
  
  // Verify internal API key for security
  if (req.headers['x-api-key'] !== process.env.INTERNAL_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Emit the event to all connected clients
  io.emit(event, data);
  res.json({ success: true });
});

// Socket.IO setup
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// API routes
app.use('/api', require('./routes/api'));
app.use('/api/auth', require('./routes/auth'));

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`JAVault API server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log(`Worker URL: ${process.env.WORKER_URL}`);
});

// Export io for use in other modules (e.g., worker notifications)
module.exports = { io };
