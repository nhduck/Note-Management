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

// ── Middleware ───────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors());

// ── Cloudinary ───────────────────────────────────────────
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
    storage: new CloudinaryStorage({
        cloudinary,
        params: { folder: 'notespace', allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
    })
});

// ── MongoDB ──────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ DB Error:', err));

// ════════════════════════════════════════════════════════
//  MODELS
// ════════════════════════════════════════════════════════

// User
const User = mongoose.model('User', new mongoose.Schema({
    username:  { type: String, required: true, unique: true },
    password:  { type: String, required: true },
    email:     { type: String, required: true, unique: true },
    avatarUrl: { type: String, default: null },
}));

// Token (session) — TTL index tự xóa token hết hạn
const TokenSchema = new mongoose.Schema({
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    token:     { type: String, required: true, unique: true },
    expiresAt: { type: Date,   required: true },
});
TokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const Token = mongoose.model('Token', TokenSchema);

// Label — mỗi user có bộ nhãn riêng, tên unique trong phạm vi user
const LabelSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name:   { type: String, required: true, trim: true },
}, { timestamps: true });
LabelSchema.index({ userId: 1, name: 1 }, { unique: true });
const Label = mongoose.model('Label', LabelSchema);

// Note
const NoteSchema = new mongoose.Schema({
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title:      { type: String, required: true },
    content:    { type: String, default: '' },
    images:     [String],
    isPinned:   { type: Boolean, default: false },
    pinnedAt:   { type: Date,    default: null },
    password:   { type: String,  default: null },
    labels:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'Label' }],
    sharedWith: [{ type: String }],
}, { timestamps: true });
const Note = mongoose.model('Note', NoteSchema);

// ════════════════════════════════════════════════════════
//  MIDDLEWARE: xác thực token
// ════════════════════════════════════════════════════════
const authMiddleware = async (req, res, next) => {
    try {
        const tokenStr = req.headers.authorization?.split(' ')[1];
        if (!tokenStr) return res.status(401).json({ message: 'Chưa đăng nhập' });

        const record = await Token.findOne({ token: tokenStr });
        if (!record || new Date() > record.expiresAt)
            return res.status(401).json({ message: 'Phiên đăng nhập hết hạn' });

        req.userId = record.userId;
        next();
    } catch (err) {
        res.status(500).json({ error: 'Lỗi xác thực' });
    }
};

// ════════════════════════════════════════════════════════
//  AUTH APIs
// ════════════════════════════════════════════════════════

// Đăng ký
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, email } = req.body;
        const existing = await User.findOne({ $or: [{ username }, { email }] });
        if (existing) return res.status(400).json({ message: 'Username hoặc Email đã tồn tại!' });

        const hashed = await bcrypt.hash(password, 10);
        const user   = await User.create({ username, password: hashed, email });
        res.status(201).json({ success: true, user: { id: user._id, username: user.username } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Đăng ký thất bại' });
    }
});

// Đăng nhập → trả về token
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password)))
            return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });

        const token     = crypto.randomBytes(64).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
        await Token.create({ userId: user._id, token, expiresAt });

        res.json({
            success: true,
            token,
            user: { id: user._id, username: user.username, avatarUrl: user.avatarUrl },
        });
    } catch (err) {
        res.status(500).json({ error: 'Đăng nhập thất bại' });
    }
});

// Xác minh token
app.get('/api/verify-token', async (req, res) => {
    try {
        const tokenStr = req.headers.authorization?.split(' ')[1];
        const record   = await Token.findOne({ token: tokenStr });
        if (!record || new Date() > record.expiresAt)
            return res.status(401).json({ message: 'Unauthorized' });
        res.json({ valid: true, userId: record.userId });
    } catch (err) {
        res.status(500).json({ error: 'Token verification failed' });
    }
});

// Đăng xuất → xóa token
app.post('/api/logout', async (req, res) => {
    try {
        const tokenStr = req.headers.authorization?.split(' ')[1];
        if (tokenStr) await Token.deleteOne({ token: tokenStr });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Logout failed' });
    }
});

// Cập nhật avatar user
app.patch('/api/users/:id/avatar', authMiddleware, async (req, res) => {
    try {
        const { avatarUrl } = req.body;
        const user = await User.findByIdAndUpdate(req.params.id, { avatarUrl }, { new: true });
        if (!user) return res.status(404).json({ error: 'User không tồn tại' });
        res.json({ success: true, avatarUrl: user.avatarUrl });
    } catch (err) {
        res.status(500).json({ error: 'Cập nhật avatar thất bại' });
    }
});

// ════════════════════════════════════════════════════════
//  UPLOAD ảnh (Cloudinary)
// ════════════════════════════════════════════════════════
app.post('/api/upload', (req, res) => {
    upload.array('images', 10)(req, res, (err) => {
        if (err) {
            console.error('Upload error:', err);
            return res.status(500).json({ error: 'Lỗi upload: ' + err.message });
        }
        if (!req.files || req.files.length === 0)
            return res.status(400).json({ error: 'Không có file nào được gửi lên' });
        try {
            const urls = req.files.map(f => f.path);
            res.json({ success: true, urls });
        } catch (e) {
            res.status(500).json({ error: 'Upload thất bại: ' + e.message });
        }
    });
});

// ════════════════════════════════════════════════════════
//  NOTE APIs
// ════════════════════════════════════════════════════════

// Lấy danh sách ghi chú (hỗ trợ lọc theo labelId)
app.get('/api/notes', async (req, res) => {
    try {
        const { userId, labelId } = req.query;
        if (!userId) return res.status(400).json({ error: 'Thiếu userId' });

        const filter = { userId };
        if (labelId) filter.labels = labelId;

        const notes = await Note.find(filter)
            .populate('labels', 'name')
            .sort({ isPinned: -1, pinnedAt: -1, updatedAt: -1 });
        res.json({ notes });
    } catch (err) {
        res.status(500).json({ error: 'Lấy ghi chú thất bại' });
    }
});

// Lưu / tạo ghi chú (auto-save)
app.post('/api/notes/save', async (req, res) => {
    try {
        const { noteId, title, content, images, userId, labels } = req.body;
        const data = {
            title,
            content: content || '',
            images:  images  || [],
            userId,
            labels:  labels  || [],
        };

        let note;
        if (noteId) {
            note = await Note.findByIdAndUpdate(noteId, data, { new: true });
        } else {
            note = await Note.create(data);
        }
        res.json({ success: true, note });
    } catch (err) {
        res.status(500).json({ error: 'Lưu ghi chú thất bại' });
    }
});

// Xóa ghi chú
app.delete('/api/notes/:id', async (req, res) => {
    try {
        await Note.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Xóa ghi chú thất bại' });
    }
});

// Ghim / bỏ ghim — lưu pinnedAt để sort đúng thứ tự ghim
app.patch('/api/notes/:id/pin', async (req, res) => {
    try {
        const note = await Note.findById(req.params.id);
        if (!note) return res.status(404).json({ error: 'Không tìm thấy ghi chú' });

        note.isPinned = !note.isPinned;
        note.pinnedAt = note.isPinned ? new Date() : null;
        await note.save();
        res.json({ success: true, isPinned: note.isPinned, pinnedAt: note.pinnedAt });
    } catch (err) {
        res.status(500).json({ error: 'Ghim ghi chú thất bại' });
    }
});

// Gắn / gỡ nhãn cho ghi chú
app.patch('/api/notes/:id/labels', async (req, res) => {
    try {
        const { labelId, action } = req.body; // action: 'attach' | 'detach'
        const note = await Note.findById(req.params.id);
        if (!note) return res.status(404).json({ error: 'Không tìm thấy ghi chú' });

        const lid = new mongoose.Types.ObjectId(labelId);
        if (action === 'attach') {
            if (!note.labels.some(l => l.equals(lid))) note.labels.push(lid);
        } else {
            note.labels = note.labels.filter(l => !l.equals(lid));
        }
        await note.save();
        const updated = await Note.findById(note._id).populate('labels', 'name');
        res.json({ success: true, labels: updated.labels });
    } catch (err) {
        res.status(500).json({ error: 'Cập nhật nhãn thất bại' });
    }
});

// ════════════════════════════════════════════════════════
//  LABEL APIs
// ════════════════════════════════════════════════════════

// Lấy danh sách nhãn của user
app.get('/api/labels', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: 'Thiếu userId' });
        const labels = await Label.find({ userId }).sort({ name: 1 });
        res.json({ labels });
    } catch (err) {
        res.status(500).json({ error: 'Lấy nhãn thất bại' });
    }
});

// Tạo nhãn mới
app.post('/api/labels', async (req, res) => {
    try {
        const { userId, name } = req.body;
        if (!userId || !name?.trim()) return res.status(400).json({ error: 'Thiếu thông tin' });

        const existing = await Label.findOne({ userId, name: name.trim() });
        if (existing) return res.status(400).json({ error: 'Nhãn đã tồn tại' });

        const label = await Label.create({ userId, name: name.trim() });
        res.status(201).json({ success: true, label });
    } catch (err) {
        res.status(500).json({ error: 'Tạo nhãn thất bại' });
    }
});

// Đổi tên nhãn — note gắn nhãn này tự cập nhật vì dùng ObjectId ref + populate
app.put('/api/labels/:id', async (req, res) => {
    try {
        const { name, userId } = req.body;
        if (!name?.trim()) return res.status(400).json({ error: 'Tên nhãn không được rỗng' });

        const dup = await Label.findOne({ userId, name: name.trim(), _id: { $ne: req.params.id } });
        if (dup) return res.status(400).json({ error: 'Tên nhãn đã tồn tại' });

        const label = await Label.findByIdAndUpdate(req.params.id, { name: name.trim() }, { new: true });
        if (!label) return res.status(404).json({ error: 'Không tìm thấy nhãn' });
        res.json({ success: true, label });
    } catch (err) {
        res.status(500).json({ error: 'Đổi tên nhãn thất bại' });
    }
});

// Xóa nhãn — KHÔNG xóa ghi chú, chỉ gỡ labelId khỏi các note (theo đề)
app.delete('/api/labels/:id', async (req, res) => {
    try {
        const label = await Label.findByIdAndDelete(req.params.id);
        if (!label) return res.status(404).json({ error: 'Không tìm thấy nhãn' });

        await Note.updateMany(
            { labels: req.params.id },
            { $pull: { labels: new mongoose.Types.ObjectId(req.params.id) } }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Xóa nhãn thất bại' });
    }
});

// ── Start server ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));