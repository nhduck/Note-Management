require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

const app = express();

// --- CONFIGURATION ---
app.use(express.json({ limit: '10mb' }));
app.use(cors());

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
    storage: new CloudinaryStorage({
        cloudinary,
        params: { folder: 'notespace', allowed_formats: ['jpg', 'png', 'webp'] },
    })
});

// --- DATABASE ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ DB Error:', err));

// --- MODELS ---
const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true },
}));

const Token = mongoose.model('Token', new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true }
}).index({ "expiresAt": 1 }, { expireAfterSeconds: 0 }));

const Note = mongoose.model('Note', new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    content: { type: String, default: '' },
    images: [String],
    isPinned: { type: Boolean, default: false },
}, { timestamps: true }));

// --- ROUTES ---

// 1. Upload
app.post('/api/upload', upload.array('images', 10), (req, res) => {
    try {
        const urls = req.files.map(f => f.path);
        res.json({ success: true, urls });
    } catch (err) {
        res.status(500).json({ error: 'Upload failed' });
    }
});

// 2. Auth
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, email } = req.body;
        const hashed = await bcrypt.hash(password, 10);
        const user = await User.create({ username, password: hashed, email });
        res.status(201).json({ success: true, user: { id: user._id, username } });
    } catch (err) {
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = crypto.randomBytes(64).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await Token.create({ userId: user._id, token, expiresAt });
        res.json({ success: true, user: { id: user._id, username: user.username }, token });
    } catch (err) {
        res.status(500).json({ error: 'Login failed' });
    }
});

app.get('/api/verify-token', async (req, res) => {
    try {
        const tokenStr = req.headers.authorization?.split(' ')[1];
        const record = await Token.findOne({ token: tokenStr });

        if (!record || new Date() > record.expiresAt) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        res.json({ valid: true, userId: record.userId });
    } catch (err) {
        res.status(500).json({ error: 'Token verification failed' });
    }
});

// 3. Notes
app.get('/api/notes', async (req, res) => {
    try {
        const notes = await Note.find({ userId: req.query.userId }).sort({ isPinned: -1, updatedAt: -1 });
        res.json({ notes });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});

app.post('/api/notes/save', async (req, res) => {
    try {
        const { noteId, ...data } = req.body;
        const note = noteId 
            ? await Note.findByIdAndUpdate(noteId, data, { new: true }) 
            : await Note.create(data);
        res.json({ success: true, note });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save note' });
    }
});

app.delete('/api/notes/:id', async (req, res) => {
    try {
        await Note.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

app.patch('/api/notes/:id/pin', async (req, res) => {
    try {
        const note = await Note.findById(req.params.id);
        note.isPinned = !note.isPinned;
        await note.save();
        res.json({ success: true, isPinned: note.isPinned });
    } catch (err) {
        res.status(500).json({ error: 'Failed to pin note' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));