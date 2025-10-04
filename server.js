// server.js (Fully Updated with Daily Summary and DELETE routes)

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

// --- MongoDB Connection ---
mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB Atlas connected successfully!'))
    .catch(err => console.error('MongoDB connection error:', err));

// --- MongoDB Schema and Model ---
const expenseSchema = new mongoose.Schema({
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    category: { type: String, required: true },
    date: { type: Date, default: Date.now }
});

const Expense = mongoose.model('Expense', expenseSchema);

// --- API Routes ---

// 1. POST: Create a new expense
app.post('/api/expenses', async (req, res) => {
    try {
        const expense = new Expense(req.body);
        await expense.save();
        res.status(201).send(expense);
    } catch (error) {
        res.status(400).send({ message: 'Error creating expense', error: error.message });
    }
});

// 2. GET: Retrieve all expenses (for the detailed list)
app.get('/api/expenses', async (req, res) => {
    try {
        const expenses = await Expense.find().sort({ date: -1 }); // Sort newest first
        res.send(expenses);
    } catch (error) {
        res.status(500).send({ message: 'Error fetching expenses', error: error.message });
    }
});

// 3. GET: Retrieve category summary (Aggregation Pipeline)
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

// 4. GET: Retrieve DAILY summary (Aggregation Pipeline)
app.get('/api/expenses/summary/daily', async (req, res) => {
    try {
        const dailySummary = await Expense.aggregate([
            {
                $group: {
                    // Group by the date string (YYYY-MM-DD)
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
        res.status(500).send({ message: 'Error fetching daily summary', error: error.message });
    }
});

// 5. DELETE: Delete an expense by ID (NEW ROUTE)
app.delete('/api/expenses/:id', async (req, res) => {
    try {
        const deletedExpense = await Expense.findByIdAndDelete(req.params.id);
        
        if (!deletedExpense) {
            return res.status(404).send({ message: "Expense not found." });
        }
        
        res.status(200).send({ message: "Expense successfully deleted.", deletedExpense });
    } catch (error) {
        // Handle Mongoose error for invalid ID format
        if (error.kind === 'ObjectId') {
             return res.status(400).send({ message: "Invalid Expense ID format." });
        }
        res.status(500).send({ message: 'Error deleting expense', error: error.message });
    }
});


// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});