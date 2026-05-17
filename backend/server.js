require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

// Import Routes
const authRoutes  = require('./routes/auth');
const noteRoutes  = require('./routes/note');
const labelRoutes = require('./routes/label');
const uploadRoutes = require('./routes/upload');

const app = express();
const httpServer = http.createServer(app);

// Socket.io setup — allow all origins for development
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Expose io instance so route handlers can emit events
app.set('io', io);

io.on('connection', (socket) => {

  // Client joins a room named after the note they are viewing
  socket.on('join-note', ({ noteId, userId, username }) => {
    socket.join(`note:${noteId}`);

    // Store user info on the socket for cleanup on disconnect
    socket._noteId  = noteId;
    socket._userId   = userId;
    socket._username = username;

    // Tell everyone else in the room that a new user has arrived
    socket.to(`note:${noteId}`).emit('user-joined', {
      socketId: socket.id,
      userId,
      username,
      noteId,
    });
  });

  // Client leaves the room (e.g. closes editor)
  socket.on('leave-note', (noteId) => {
    socket.leave(`note:${noteId}`);

    // Tell others this user has left
    socket.to(`note:${noteId}`).emit('user-left', {
      socketId: socket.id,
      userId:   socket._userId,
      username: socket._username,
      noteId,
    });
  });

  // Client is actively typing — broadcast to everyone else in the same room
  socket.on('typing', ({ noteId, userId, username }) => {
    socket.to(`note:${noteId}`).emit('user-typing', {
      socketId: socket.id,
      userId,
      username,
    });
  });

  // Clean up presence when the socket disconnects unexpectedly
  socket.on('disconnect', () => {
    if (socket._noteId) {
      socket.to(`note:${socket._noteId}`).emit('user-left', {
        socketId: socket.id,
        userId:   socket._userId,
        username: socket._username,
        noteId:   socket._noteId,
      });
    }
  });
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors());

// Database connection
connectDB();

// Routes
app.use('/api', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/labels', labelRoutes);

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));