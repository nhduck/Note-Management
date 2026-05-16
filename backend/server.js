require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Import Routes
const authRoutes = require('./routes/auth');
const noteRoutes = require('./routes/note');
const labelRoutes = require('./routes/label');
const uploadRoutes = require('./routes/upload');

const app = express();

// ── Middleware ───────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors());

// ── Database Connection ──────────────────────────────────
connectDB();

// ── Routes ───────────────────────────────────────────────
// Lưu ý: Đã rút gọn tiền tố '/api' và các nhóm route tương ứng
app.use('/api', authRoutes); 
app.use('/api/upload', uploadRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/labels', labelRoutes);

// ── Start server ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));