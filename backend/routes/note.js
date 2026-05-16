const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Note = require('../models/Note');
const bcrypt = require('bcryptjs');

// Fetch collection list
router.get('/', async (req, res) => {
    try {
        const { userId, labelId } = req.query;
        if (!userId) return res.status(400).json({ error: 'Missing userId' });

        const filter = { userId };
        if (labelId) filter.labels = labelId;

        const notes = await Note.find(filter)
            .populate('labels', 'name')
            .sort({ isPinned: -1, pinnedAt: -1, updatedAt: -1 });
        res.json({ notes });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});

// Save / create a note instance
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
        res.status(500).json({ error: 'Failed to save note' });
    }
});

// Delete a note document
router.delete('/:id', async (req, res) => {
    try {
        await Note.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

// Pin / unpin status mutation toggles
router.patch('/:id/pin', async (req, res) => {
    try {
        const note = await Note.findById(req.params.id);
        if (!note) return res.status(404).json({ error: 'Note not found' });

        note.isPinned = !note.isPinned;
        note.pinnedAt = note.isPinned ? new Date() : null;
        await note.save();
        res.json({ success: true, isPinned: note.isPinned, pinnedAt: note.pinnedAt });
    } catch (err) {
        res.status(500).json({ error: 'Failed to pin note' });
    }
});

// Attach / detach tag label components
router.patch('/:id/labels', async (req, res) => {
    try {
        const { labelId, action } = req.body;
        const note = await Note.findById(req.params.id);
        if (!note) return res.status(404).json({ error: 'Note not found' });

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
        res.status(500).json({ error: 'Failed to update label' });
    }
});

// PATCH /api/notes/:id/password — enable/disable/change note restriction passcode
router.patch('/:id/password', async (req, res) => {
    try {
        const { action, currentPassword } = req.body;
        const password = req.body.password ?? req.body.newPassword;
        const note = await Note.findById(req.params.id);
        if (!note) return res.status(404).json({ error: 'Note not found' });

        if (action === 'enable') {
            note.password = await bcrypt.hash(password, 10);

        } else if (action === 'disable') {
            const isMatch = await bcrypt.compare(currentPassword, note.password);
            if (!isMatch) return res.status(400).json({ error: 'Incorrect current password' });
            note.password = null;

        } else if (action === 'change') {
            if (!note.password) { // Safety baseline protection check
                return res.status(400).json({ error: 'Note does not have a password set' });
            }
            const isMatch = await bcrypt.compare(currentPassword, note.password);
            if (!isMatch) return res.status(400).json({ error: 'Incorrect current password' });
            note.password = await bcrypt.hash(password, 10);
        }

        await note.save();
        res.json({ success: true, hasPassword: !!note.password });
    } catch (err) {
        console.error('Password route error:', err); // Server terminal trace
        res.status(500).json({ error: 'Error updating password configuration' });
    }
});

module.exports = router;