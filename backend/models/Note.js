const mongoose = require('mongoose');

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
    color:      { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Note', NoteSchema);