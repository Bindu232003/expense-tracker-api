// models/Expense.js
const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  category: {
    type: String,
    required: true,
    enum: ['Food', 'Transport', 'Groceries', 'Utilities', 'Entertainment', 'Other'],
    default: 'Other'
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Expense', expenseSchema);