// Import necessary modules
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// --- CRITICAL UPDATE: MongoDB Atlas Connection String ---
const MONGODB_URI = 'mongodb+srv://sirimb1731_db_user:Bindu2025Atlas@cluster0.zodyznh.mongodb.net/expensetracker?retryWrites=true&w=majority&appName=Cluster0';

// Initialize the Express application
const app = express();
// Use port assigned by hosting service (like Render) or 3000 locally
const PORT = process.env.PORT || 3000; 

// --- Middleware ---
app.use(cors()); 
app.use(express.json()); 

// =======================================================
// --- MongoDB SCHEMAS and MODELS (UPDATED) ---
// =======================================================

// 1. Expense Schema (Existing)
const expenseSchema = new mongoose.Schema({
    description: { type: String, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    category: { type: String, required: true },
    date: { type: Date, default: Date.now }
});

const Expense = mongoose.model('Expense', expenseSchema);

// 2. Balance Schema (NEW)
const balanceSchema = new mongoose.Schema({
    // Fixed ID to ensure only one balance document exists
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

// =======================================================
// --- MongoDB CONNECTION & BALANCE INITIALIZATION ---
// =======================================================

const initializeBalance = async () => {
    try {
        let balance = await Balance.findById('running_balance');
        
        if (!balance) {
            balance = new Balance({ 
                _id: 'running_balance', 
                currentBalance: 0 
            });
            await balance.save();
            console.log("Initial balance document created.");
        } else {
            console.log("Balance document already exists.");
        }
    } catch (err) {
        console.error("Error initializing balance:", err.message);
    }
};

mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('MongoDB Atlas connected successfully!');
        initializeBalance(); // Initialize balance after connection
    })
    .catch(err => console.error('MongoDB connection error:', err));


// =======================================================
// --- API Routes (UPDATED) ---
// =======================================================

// 1. POST: Create a new expense (NOW SUBTRACTS from Balance)
app.post('/api/expenses', async (req, res) => {
    try {
        const { description, amount, category } = req.body;
        
        // 1. Save the expense
        const newExpense = new Expense({ description, amount, category });
        await newExpense.save();

        // 2. SUBTRACT from Balance (NEW LOGIC)
        const updatedBalance = await Balance.findByIdAndUpdate(
            'running_balance',
            { 
                $inc: { currentBalance: -amount }, // Subtract the amount
                lastUpdated: new Date()
            },
            { new: true, runValidators: true } // Return the updated document
        );

        if (!updatedBalance) {
             // If this happens, initialization failed, though it shouldn't
            return res.status(500).send({ message: 'Balance document missing or initialization failed.' });
        }

        res.status(201).send(newExpense);
    } catch (error) {
        res.status(400).send({ message: 'Error creating expense', error: error.message });
    }
});

// 2. GET: Retrieve all expenses (for the detailed list) - (Existing)
app.get('/api/expenses', async (req, res) => {
    try {
        const expenses = await Expense.find().sort({ date: -1 }); 
        res.send(expenses);
    } catch (error) {
        res.status(500).send({ message: 'Error fetching expenses', error: error.message });
    }
});

// 3. GET: Retrieve category summary (Aggregation Pipeline) - (Existing)
app.get('/api/expenses/summary/category', async (req, res) => {
    try {
        const summary = await Expense.aggregate([
            {
                $group: {
                    _id: "$category", 
                    totalSpent: { $sum: "$amount" }, 
                    count: { $sum: 1 } 
                }
            },
            {
                $sort: { totalSpent: -1 } 
            }
        ]);
        res.send(summary);
    } catch (error) {
        res.status(500).send({ message: 'Error fetching category summary', error: error.message });
    }
});

// 4. GET: Retrieve Current Balance (NEW ROUTE)
app.get('/api/balance', async (req, res) => {
    try {
        const balanceDoc = await Balance.findById('running_balance');
        if (!balanceDoc) {
            // If the balance doc hasn't been initialized yet
            return res.status(200).json({ currentBalance: 0 });
        }
        // Send back only the balance value
        res.status(200).json({ currentBalance: balanceDoc.currentBalance }); 
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch balance', details: err.message });
    }
});


// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});