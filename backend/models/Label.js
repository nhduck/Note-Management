const mongoose = require('mongoose');

const LabelSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name:   { type: String, required: true, trim: true },
}, { timestamps: true });
LabelSchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Label', LabelSchema);