const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const bcrypt = require("bcrypt");
const cors = require("cors");

const app = express();
const REACT_PORT = 3000;
const NODE_PORT = 9001;
const corsOptions = {
  origin: "http://localhost:" + REACT_PORT, // Your React app's origin
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
};
const mongodb_connection_string = "mongodb://localhost:27017/personal-finance-mongodb";

app.use(cors(corsOptions));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// MongoDB connection
mongoose.connect(mongodb_connection_string, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB");
});

// User Schema and Model
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});

const transactionSchema = new mongoose.Schema({
  desc: String,
  amount: Number,
  type: String,
  username: String  // Add this field to store the username
});

const User = mongoose.model("User", userSchema);
const Transaction = mongoose.model("Transaction", transactionSchema);

// Login route
app.post("/login", async (req, res) => {

  console.log("Login called");
  const { username, password } = req.body;

  try {
    // Find the user in the database
    const user = await User.findOne({ username });

    if (user && (await bcrypt.compare(password, user.password))) 
    {
      res.json({ success: true, username: user.username });
    } 
    else 
    {
      res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  } 
  catch (error) 
  {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Create user route
app.post("/users", async (req, res) => {
  console.log("users called");
  const { username, password } = req.body;

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    res.status(201).send("User created successfully");
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).send("Server error");
  }
});

// Create transaction route
app.post("/transactions", async (req, res) => {
  const { desc, amount, type } = req.body;
  console.log("transactions called with request : ", req.body, typeof type);

  if (!desc || !amount || !type) {
    return res.status(400).send("Desc, amount, and type are required");
  }

  let adjustedAmount = amount;

  // Check if the type is valid
  const validTypes = ['EXPENSE', 'INCOME'];

  if (!validTypes.includes(type)) {
    console.log("Validation failed: Invalid transaction type:", type);
    return res.status(400).send("Invalid transaction type");
  }

  if (type === 'EXPENSE') 
  {
    adjustedAmount = -Math.abs(amount); // Ensure the amount is negative for expenses
  } 
  else if (type === 'INCOME') 
  {
    adjustedAmount = Math.abs(amount); // Ensure the amount is positive for incomes
  }

  try {
    console.log("Transaction details being saved : ", desc, amount, type)
    // Create new transaction
    const newTransaction = new Transaction({
      desc,
      amount: adjustedAmount,
      type,
    });
    await newTransaction.save();

    res
      .status(201)
      .send({
        id: newTransaction._id,
        desc,
        amount: adjustedAmount,
        date: newTransaction.date,
      });
  } catch (error) {
    console.error("Error creating transaction:", error);
    res.status(500).send("Server error");
  }
});

app.listen(NODE_PORT, () => {
  console.log(`Server is running on http://localhost:${NODE_PORT}`);
});