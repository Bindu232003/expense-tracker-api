// routes/expenses.js (Original version)

const express = require('express');
const Expense = require('../models/Expense');
const router = express.Router();

// ----------------------
// 1. CRUD OPERATIONS
// ----------------------

// POST: Add a new expense (C - Create)
router.post('/', async (req, res) => {
    try {
        const expense = new Expense(req.body);
        await expense.save();
        res.status(201).send(expense);
    } catch (error) {
        res.status(400).send({ message: "Error adding expense", error: error.message });
    }
});

// GET: Fetch all expenses (R - Read)
router.get('/', async (req, res) => {
    try {
        // Sort by date descending to see most recent first
        const expenses = await Expense.find().sort({ date: -1 });
        res.send(expenses);
    } catch (error) {
        res.status(500).send({ message: "Error fetching expenses", error: error.message });
    }
});


// ----------------------
// 2. AGGREGATION PIPELINES (REAL-TIME ANALYTICS)
// ----------------------

// GET: Get total spending per category
router.get('/summary/category', async (req, res) => {
    try {
        const categorySummary = await Expense.aggregate([
            {
                $group: {
                    _id: '$category', 
                    totalSpent: { $sum: '$amount' }, 
                    count: { $sum: 1 } 
                }
            },
            {
                $sort: { totalSpent: -1 } 
            }
        ]);
        res.send(categorySummary);
    } catch (error) {
        res.status(500).send({ message: "Error generating category summary", error: error.message });
    }
});

// GET: Get total spending per month (Existing logic)
router.get('/summary/monthly', async (req, res) => {
    try {
        const monthlySummary = await Expense.aggregate([
            {
                $group: {
                    // Group by year and month using Date Aggregation Operators
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' }
                    },
                    totalSpent: { $sum: '$amount' }
                }
            },
            {
                // Sort chronologically by year, then month
                $sort: {
                    '_id.year': 1,
                    '_id.month': 1
                }
            },
            {
                // Reshape the output document for a cleaner look
                $project: {
                    _id: 0, // Exclude the default _id
                    month: '$_id.month',
                    year: '$_id.year',
                    totalSpent: 1
                }
            }
        ]);
        res.send(monthlySummary);
    } catch (error) {
        res.status(500).send({ message: "Error generating monthly summary", error: error.message });
    }
});

module.exports = router;