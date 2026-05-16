const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Label = require('../models/Label');
const Note = require('../models/Note');

// Fetch labels list
router.get('/', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: 'Missing userId' });
        const labels = await Label.find({ userId }).sort({ name: 1 });
        res.json({ labels });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch labels' });
    }
});

// Create new label
router.post('/', async (req, res) => {
    try {
        const { userId, name } = req.body;
        if (!userId || !name?.trim()) return res.status(400).json({ error: 'Missing required information' });

        const existing = await Label.findOne({ userId, name: name.trim() });
        if (existing) return res.status(400).json({ error: 'Label already exists' });

        const label = await Label.create({ userId, name: name.trim() });
        res.status(201).json({ success: true, label });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create label' });
    }
});

// Rename a label
router.put('/:id', async (req, res) => {
    try {
        const { name, userId } = req.body;
        if (!name?.trim()) return res.status(400).json({ error: 'Label name cannot be empty' });

        const dup = await Label.findOne({ userId, name: name.trim(), _id: { $ne: req.params.id } });
        if (dup) return res.status(400).json({ error: 'Label name already exists' });

        const label = await Label.findByIdAndUpdate(req.params.id, { name: name.trim() }, { new: true });
        if (!label) return res.status(404).json({ error: 'Label not found' });
        res.json({ success: true, label });
    } catch (err) {
        res.status(500).json({ error: 'Failed to rename label' });
    }
});

// Delete a label
router.delete('/:id', async (req, res) => {
    try {
        const label = await Label.findByIdAndDelete(req.params.id);
        if (!label) return res.status(404).json({ error: 'Label not found' });

        // Clean up references to this label across all existing notes
        await Note.updateMany(
            { labels: req.params.id },
            { $pull: { labels: new mongoose.Types.ObjectId(req.params.id) } }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete label' });
    }
});

// Export module logic pipelines
module.exports = router;