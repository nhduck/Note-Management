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

// ── Socket.io Setup ──────────────────────────────────────
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Expose io so routes can emit events
app.set('io', io);

io.on('connection', (socket) => {
  // Client joins a "room" named after the noteId it's viewing
  socket.on('join-note', (noteId) => {
    socket.join(`note:${noteId}`);
  });

  // Client leaves the note room (e.g. closes editor)
  socket.on('leave-note', (noteId) => {
    socket.leave(`note:${noteId}`);
  });

  socket.on('disconnect', () => {});
});

// ── Middleware ───────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors());

// ── Database Connection ──────────────────────────────────
connectDB();

// ── Routes ───────────────────────────────────────────────
app.use('/api', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/labels', labelRoutes);

// ── Start server ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
