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

// ── Middleware ──────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors());

// ── Cloudinary Config ───────────────────────────────────
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'notespace',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    },
});
const upload = multer({ storage });

// ── MongoDB ─────────────────────────────────────────────
mongoose.connect('mongodb://nhducjob_db_user:IybmBrCS6WjBocYx@ac-w9ipkd3-shard-00-00.skdwjrt.mongodb.net:27017,ac-w9ipkd3-shard-00-01.skdwjrt.mongodb.net:27017,ac-w9ipkd3-shard-00-02.skdwjrt.mongodb.net:27017/?ssl=true&replicaSet=atlas-8yztb9-shard-0&authSource=admin&appName=Cluster0')
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch(err => console.error('❌ MongoDB error:', err));

// ── Schemas ─────────────────────────────────────────────
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
});
const UserModel = mongoose.model('users', UserSchema);

const tokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    token: {
        type: String,
        required: true,
        unique: true
    },

    type: {
        type: String,
        enum: ['REFRESH', 'RESET_PASSWORD', 'VERIFY_EMAIL'],
        default: 'REFRESH',
        required: true
    },

    deviceInfo: {
        browser: String,
        os: String,
        ip: String
    },

    expiresAt: {
        type: Date,
        required: true
    }
}, {
    timestamps: true
});

tokenSchema.index({ "expiresAt": 1 }, { expireAfterSeconds: 0 });

const Token = mongoose.model('Token', tokenSchema);

const NoteSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    title: { type: String, required: true },
    content: { type: String, default: '' },
    images: [String],
    isPinned: { type: Boolean, default: false },
    password: { type: String, default: null },
    labels: [String],
    sharedWith: [{ type: String }],
}, { timestamps: true });
const NoteModel = mongoose.model('notes', NoteSchema);

// ── API: Upload ảnh lên Cloudinary ──────────────────────
// Nhận file ảnh, trả về URL
app.post('/api/upload', (req, res) => {
    upload.array('images', 10)(req, res, (err) => {
        if (err) {
            console.error('Multer/Cloudinary error:', err);
            return res.status(500).json({ error: 'Lỗi upload: ' + err.message });
        }
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Không có file nào được gửi lên' });
        }
        try {
            const urls = req.files.map(f => f.path);
            res.json({ success: true, urls });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Upload ảnh thất bại: ' + e.message });
        }
    });
});

// ── API: Lưu ghi chú ────────────────────────────────────
app.post('/api/notes/save', async (req, res) => {
    try {
        const { noteId, title, content, images, userId } = req.body;
        const noteData = { title, content: content || '', images: images || [], userId };

        let note;
        if (noteId) {
            note = await NoteModel.findByIdAndUpdate(noteId, noteData, { new: true });
        } else {
            note = new NoteModel(noteData);
            await note.save();
        }
        res.json({ success: true, note });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi khi lưu ghi chú' });
    }
});

// ── API: Lấy danh sách ghi chú ──────────────────────────
app.get('/api/notes', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: 'Thiếu userId' });
        const notes = await NoteModel.find({ userId }).sort({ isPinned: -1, updatedAt: -1 });
        res.json({ notes });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi khi tải ghi chú' });
    }
});

// ── API: Xóa ghi chú ────────────────────────────────────
app.delete('/api/notes/:id', async (req, res) => {
    try {
        await NoteModel.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi khi xóa ghi chú' });
    }
});

// ── API: Ghim / Bỏ ghim ghi chú ─────────────────────────
app.patch('/api/notes/:id/pin', async (req, res) => {
    try {
        const note = await NoteModel.findById(req.params.id);
        if (!note) return res.status(404).json({ error: 'Không tìm thấy ghi chú' });
        note.isPinned = !note.isPinned;
        await note.save();
        res.json({ success: true, isPinned: note.isPinned });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi khi ghim ghi chú' });
    }
});

// API: Đăng ký
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, email } = req.body;
        const existing = await UserModel.findOne({ $or: [{ username }, { email }] });
        if (existing) return res.status(400).json({ message: 'Username hoặc Email đã tồn tại!' });

        const hashed = await bcrypt.hash(password, 10);
        const newUser = new UserModel({ email, username, password: hashed });
        await newUser.save();

        res.status(201).json({
            message: 'Đăng ký thành công!',
            user: { id: newUser._id, username: newUser.username },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
});

// API: Đăng nhập
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await UserModel.findOne({ email });
        
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ message: 'Sai thông tin đăng nhập' });
        }

        const sessionToken = crypto.randomBytes(64).toString('hex');

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        await Token.create({
            userId: user._id,
            token: sessionToken,
            type: 'REFRESH',
            deviceInfo: {
                browser: req.headers['user-agent'],
                ip: req.ip
            },
            expiresAt: expiresAt
        });

        res.json({
            message: 'Đăng nhập thành công!',
            user: { id: user._id, username: user.username },
            token: sessionToken
        });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
});

// Khởi động server
// PORT lấy từ .env
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server đang chạy tại cổng ${PORT}`));