const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Label = require('../models/Label');
const Note = require('../models/Note');

// Lấy danh sách nhãn
router.get('/', async (req, res) => {
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
router.post('/', async (req, res) => {
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

// Đổi tên nhãn
router.put('/:id', async (req, res) => {
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

// Xóa nhãn
router.delete('/:id', async (req, res) => {
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

module.exports = router;