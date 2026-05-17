const mongoose = require('mongoose');

const SharedEntrySchema = new mongoose.Schema({
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    email:      { type: String, required: true },
    permission: { type: String, enum: ['view', 'edit'], default: 'view' },
    sharedAt:   { type: Date, default: Date.now },
}, { _id: false });

const NoteSchema = new mongoose.Schema({
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title:      { type: String, required: true },
    content:    { type: String, default: '' },
    images:     [String],
    isPinned:   { type: Boolean, default: false },
    pinnedAt:   { type: Date,    default: null },
    password:   { type: String,  default: null },
    labels:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'Label' }],
    sharedWith: [SharedEntrySchema],
    color:      { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Note', NoteSchema);