// routes/expenses.js

const express = require('express');
const Expense = require('../models/Expense'); // Assuming you have a models folder
const Balance = require('../models/Balance'); // <<< NEW: Require the Balance model >>>
const router = express.Router();

// ----------------------
// 1. BALANCE/INCOME OPERATIONS (NEW SECTION)
// ----------------------

// GET: Fetch current running balance
router.get('/balance', async (req, res) => {
    try {
        const balanceDoc = await Balance.findById('running_balance');
        if (!balanceDoc) {
            // If the balance doc hasn't been initialized yet, return 0
            return res.status(200).json({ currentBalance: 0 }); 
        }
        res.status(200).json({ currentBalance: balanceDoc.currentBalance }); 
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch balance', details: err.message });
    }
});

// POST: Add income/deposit (Increases balance)
router.post('/balance/deposit', async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Deposit amount must be a positive number.' });
        }
        
        // Find the balance document and increment the currentBalance by the deposit amount
        const updatedBalance = await Balance.findByIdAndUpdate(
            'running_balance', 
            { 
                $inc: { currentBalance: amount }, // Add the amount
                lastUpdated: new Date()
            },
            { new: true, runValidators: true, upsert: true } // Create if it doesn't exist
        );

        res.status(200).json({ 
            message: `Successfully added ₹${amount} to balance.`, 
            newBalance: updatedBalance.currentBalance 
        });

    } catch (err) {
        res.status(500).json({ error: 'Failed to add deposit and update balance', details: err.message });
    }
});


// ----------------------
// 2. EXPENSE OPERATIONS (CRUD)
// ----------------------

// POST: Add a new expense (C - Create) - NOW SUBTRACTS FROM BALANCE
router.post('/', async (req, res) => {
    try {
        const { description, amount, category } = req.body;
        
        // 1. Save the expense
        const expense = new Expense({ description, amount, category, date: new Date() });
        await expense.save();
        
        // 2. SUBTRACT from Balance (CRITICAL NEW LOGIC)
        const updatedBalance = await Balance.findByIdAndUpdate(
            'running_balance',
            { 
                $inc: { currentBalance: -amount }, // Subtract the expense amount
                lastUpdated: new Date()
            },
            { new: true, runValidators: true, upsert: true } // Upsert ensures it's created if missing
        );

        res.status(201).send(expense);

    } catch (error) {
        res.status(400).send({ message: "Error adding expense and updating balance", error: error.message });
    }
});

// GET: Fetch all expenses (R - Read)
router.get('/', async (req, res) => {
    try {
        const expenses = await Expense.find().sort({ date: -1 });
        res.send(expenses);
    } catch (error) {
        res.status(500).send({ message: "Error fetching expenses", error: error.message });
    }
});


// ----------------------
// 3. AGGREGATION PIPELINES (REAL-TIME ANALYTICS)
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

// GET: Get total spending per day (NEW REQUIREMENT)
router.get('/summary/daily', async (req, res) => {
    try {
        const dailySummary = await Expense.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    totalSpent: { $sum: '$amount' }
                }
            },
            {
                $sort: { _id: -1 } // Sort newest day first
            }
        ]);
        res.send(dailySummary);
    } catch (error) {
        res.status(500).send({ message: "Error generating daily summary", error: error.message });
    }
});

// GET: Get total spending per month (Existing logic)
router.get('/summary/monthly', async (req, res) => {
    try {
        const monthlySummary = await Expense.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' }
                    },
                    totalSpent: { $sum: '$amount' }
                }
            },
            {
                $sort: {
                    '_id.year': 1,
                    '_id.month': 1
                }
            },
            {
                $project: {
                    _id: 0,
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