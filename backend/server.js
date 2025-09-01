// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { connectMongo } = require('./config/db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectMongo();

// Socket.IO setup
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Relay worker-emitted events to all clients
  const relay = (event) => {
    socket.on(event, (data) => {
      io.emit(event, data);
    });
  };

  ['job-started', 'job-progress', 'job-completed', 'job-failed', 'status-update']
    .forEach(relay);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// API routes
app.use('/api', require('./routes/api'));
app.use('/api/auth', require('./routes/auth'));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export io for use in other modules (e.g., worker notifications)
module.exports = { io };
