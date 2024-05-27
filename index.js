const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const bcrypt = require('bcrypt');

const app = express();
const PORT = 3000;

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'mydb',
    multipleStatements: true,
});

db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('MySQL Connected');
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Login route
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.query('SELECT * FROM users WHERE username = ?', [username], async (error, results) => {
        if (error) {
            throw error;
        }

        if (results.length > 0) {
            const user = results[0];
            const match = await bcrypt.compare(password, user.password);

            if (match) {
                res.send('Login successful!');
            } else {
                res.status(401).send('Invalid username or password');
            }
        } else {
            res.status(401).send('Invalid username or password');
        }
    });
});

// Create user route
app.post('/users', async (req, res) => {
    const { username, password } = req.body;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], (error, results) => {
        if (error) {
            throw error;
        }
        res.status(201).send('User created successfully');
    });
});

app.post('/transactions', (req, res) => {

    const { name, amount, type } = req.body; // Add type to the request body (income/expense)
    if (!name || !amount || !type) 
    {
        return res.status(400).send('Name, amount, and type are required');
    }

    let adjustedAmount = amount;

    if (type === 'expense') 
    {
        adjustedAmount = -Math.abs(amount); // Ensure the amount is negative for expenses
    } 
    else if (type === 'income') 
    {
        adjustedAmount = Math.abs(amount); // Ensure the amount is positive for incomes
    } 
    else 
    {
        return res.status(400).send('Invalid transaction type');
    }

    const query = 'INSERT INTO transactions (name, amount) VALUES (?, ?)';

    db.query(query, [name, adjustedAmount], (err, result) => 
    {
        if (err) 
        {
            console.error('Error executing query:', err.message);
            return res.status(500).send('Server error');
        }
        
        res.status(201).send({ id: result.insertId, name, amount: adjustedAmount, date: new Date() });
    });
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
