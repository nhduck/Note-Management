const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Note = require('../models/Note');
const bcrypt = require('bcryptjs');

// Lấy danh sách
router.get('/', async (req, res) => {
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

// Lưu / tạo ghi chú
router.post('/save', async (req, res) => {
    try {
        const { noteId, title, content, images, userId, labels, color } = req.body;
        const data = { title, content: content || '', images: images || [], userId, labels: labels || [], ...(color !== undefined && { color }) };

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
router.delete('/:id', async (req, res) => {
    try {
        await Note.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Xóa ghi chú thất bại' });
    }
});

// Ghim / bỏ ghim
router.patch('/:id/pin', async (req, res) => {
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

// Gắn / gỡ nhãn
router.patch('/:id/labels', async (req, res) => {
    try {
        const { labelId, action } = req.body;
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

// PATCH /api/notes/:id/password — bật/tắt/đổi mật khẩu ghi chú
router.patch('/:id/password', async (req, res) => {
    try {
        const { action, currentPassword } = req.body;
        const password = req.body.password ?? req.body.newPassword;
        const note = await Note.findById(req.params.id);
        if (!note) return res.status(404).json({ error: 'Không tìm thấy ghi chú' });

        if (action === 'enable') {
            note.password = await bcrypt.hash(password, 10);

        } else if (action === 'disable') {
            const isMatch = await bcrypt.compare(currentPassword, note.password);
            if (!isMatch) return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng' });
            note.password = null;

        } else if (action === 'change') {
            if (!note.password){ // thêm dòng này
                return res.status(400).json({ error: 'Ghi chú chưa có mật khẩu' });}
            const isMatch = await bcrypt.compare(currentPassword, note.password);
            if (!isMatch) return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng' });
            note.password = await bcrypt.hash(password, 10);
        }

        await note.save();
        res.json({ success: true, hasPassword: !!note.password });
    } catch (err) {
        console.error('Password route error:', err); // thêm dòng này
        res.status(500).json({ error: 'Lỗi khi cập nhật mật khẩu' });
    }
});

module.exports = router;