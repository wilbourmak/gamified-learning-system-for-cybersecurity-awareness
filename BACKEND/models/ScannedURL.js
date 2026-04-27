const mongoose = require('mongoose');

const scannedURLSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    url: {
        type: String,
        required: true,
        trim: true
    },
    isSafe: {
        type: Boolean,
        required: true
    },
    threatType: {
        type: String,
        enum: ['none', 'phishing', 'malware', 'suspicious', 'spam', 'unknown'],
        default: 'none'
    },
    riskScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    details: {
        type: String,
        default: ''
    },
    scannedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for faster queries
scannedURLSchema.index({ userId: 1, scannedAt: -1 });
scannedURLSchema.index({ url: 1 });

module.exports = mongoose.model('ScannedURL', scannedURLSchema);
