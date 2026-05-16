const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Note = require('../models/Note');

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
        const { noteId, title, content, images, userId, labels } = req.body;
        const data = { title, content: content || '', images: images || [], userId, labels: labels || [] };

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

module.exports = router;