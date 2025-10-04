// models/Balance.js
const mongoose = require('mongoose');

const balanceSchema = new mongoose.Schema({
    // We use a fixed ID to ensure only one balance document exists
    _id: {
        type: String,
        required: true,
        default: 'running_balance' 
    },
    currentBalance: {
        type: Number,
        required: true,
        default: 0
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

const Balance = mongoose.model('Balance', balanceSchema);

module.exports = Balance;