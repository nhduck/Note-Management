const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Note = require('../models/Note');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const shareRouter = require('./noteShare');

router.get('/shared', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: 'Missing userId' });
        const notes = await Note.find({ 'sharedWith.userId': userId })
            .populate('labels', 'name')
            .populate('userId', 'username avatarUrl')
            .sort({ updatedAt: -1 });
        res.json({ notes });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch shared notes' });
    }
});

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

router.post('/save', async (req, res) => {
    try {
        const { noteId, title, content, images, userId, labels, color } = req.body;
        const io = req.app.get('io');
        let note;
        if (noteId) {
            note = await Note.findById(noteId);
            if (!note) return res.status(404).json({ error: 'Note not found' });
            const isOwner = note.userId.toString() === userId;
            const sharedEntry = note.sharedWith?.find(s => s.userId.toString() === userId);
            const canEdit = isOwner || sharedEntry?.permission === 'edit';
            if (!canEdit) return res.status(403).json({ error: 'No edit permission' });
            const updateData = {
                title, content: content || '', images: images || [], labels: labels || [],
                ...(color !== undefined && { color }),
            };
            note = await Note.findByIdAndUpdate(noteId, updateData, { new: true }).populate('labels', 'name');
            const updatePayload = {
                noteId, title: note.title, content: note.content, images: note.images,
                labels: note.labels, color: note.color, updatedAt: note.updatedAt, updatedBy: userId,
            };
            io.to(`note:${noteId}`).emit('note-updated', updatePayload);
            const ownerId = note.userId.toString();
            io.to(`user:${ownerId}`).emit('note-updated', updatePayload);
            for (const s of note.sharedWith || []) {
                io.to(`user:${s.userId.toString()}`).emit('note-updated', updatePayload);
            }
        } else {
            const data = {
                title, content: content || '', images: images || [], userId, labels: labels || [],
                ...(color !== undefined && { color }),
            };
            note = await Note.create(data);
            io.to(`user:${userId}`).emit('note-created', { noteId: note._id.toString(), note });
        }
        res.json({ success: true, note });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save note' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const io = req.app.get('io');
        const noteId = req.params.id;
        const note = await Note.findById(noteId);
        if (note) {
            const deletePayload = { noteId };
            io.to(`user:${note.userId.toString()}`).emit('note-deleted', deletePayload);
            for (const s of note.sharedWith || []) {
                io.to(`user:${s.userId.toString()}`).emit('note-deleted', deletePayload);
            }
        }
        await Note.findByIdAndDelete(noteId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

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
            if (!note.password) return res.status(400).json({ error: 'Note does not have a password set' });
            const isMatch = await bcrypt.compare(currentPassword, note.password);
            if (!isMatch) return res.status(400).json({ error: 'Incorrect current password' });
            note.password = await bcrypt.hash(password, 10);
        }
        await note.save();
        res.json({ success: true, hasPassword: !!note.password });
    } catch (err) {
        res.status(500).json({ error: 'Error updating password configuration' });
    }
});

router.use('/', shareRouter);

module.exports = router;
