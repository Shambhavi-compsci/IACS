const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const path = require('path');

const app = express();
const port = 3000;

// Middleware Setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
}));

// Database Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '1234',
  database: 'nodejs'
});

db.connect(err => {
  if (err) {
    console.error('Database connection failed: ' + err.stack);
    return;
  }
  console.log('Connected to database');
});

// Authentication Middleware
function isLoggedIn(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  } else {
    res.redirect('/index.html'); // Redirect to login if the user is not logged in
  }
}

// Handle /welcome.html requests by redirecting to /welcome
app.get('/welcome.html', (req, res) => {
  res.redirect('/welcome');
});

// Protected Route for Welcome Page
app.get('/welcome', isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'welcome.html'));
});

// Public Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/register.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Serve Static Files After Protected Routes
app.use(express.static(path.join(__dirname, 'public')));

// Authentication Routes
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  const query = 'SELECT * FROM loginuser WHERE username = ? AND password = ?';
  db.query(query, [username, password], (err, results) => {
    if (err) {
      console.error('Login query error:', err);
      res.status(500).send('Server error');
    } else if (results.length > 0) {
      req.session.user = results[0]; // Store user information in session
      res.redirect('/welcome'); // Redirect to protected route
    } else {
      res.send('Invalid username or password');
    }
  });
});

app.get('/check-login-status', (req, res) => {
  res.json({ isLoggedIn: !!req.session.user });
});

app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      res.status(500).send('Server error');
    } else {
      res.clearCookie('connect.sid');
      res.redirect('/index.html'); // Redirect to index page after logout
    }
  });
});

// Delete Account Route
app.post('/delete-account', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/index.html'); // Ensure user is logged in
  }

  const userId = req.session.user.idregister; // Ensure this matches the session data field

  db.query('DELETE FROM register WHERE idregister = ?', [userId], (err, result) => {
    if (err) {
      console.error('Error deleting account: ', err);
      return res.status(500).send('Server error');
    }

    req.session.destroy(err => {
      if (err) {
        console.error('Error destroying session: ', err);
        return res.status(500).send('Server error');
      }
      res.redirect('/'); // Redirect to homepage or login page
    });
  });
});

// Registration and Payment Routes with Validation
app.post('/register', (req, res) => {
  const { first_name, middle_name, last_name, dob, country_code, gender, contact_number, email, password } = req.body;
  const today = new Date();
  const selectedDOB = new Date(dob);

  // Date of birth validation
  if (selectedDOB > today) {
    return res.status(400).send('Date of birth cannot be in the future.');
  }

  const query = 'INSERT INTO register (first_name, middle_name, last_name, date_of_birth, country_code, gender, contact_number, email, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
  db.query(query, [first_name, middle_name, last_name, dob, country_code, gender, contact_number, email, password], (err, result) => {
    if (err) {
      console.error('Error inserting data: ', err.message);
      res.status(500).send('Database error: ' + err.message);
    } else {
      console.log('Data inserted successfully: ', result);
      res.redirect('/payment.html');
    }
  });
});

app.post('/payment', (req, res) => {
  const { card_holder, card_number, expiry_month, expiry_year, CVC } = req.body;

  // Combine expiry month and year into MM/YYYY format
  const date_of_expiry = `${expiry_month}/${expiry_year}`;

  const query = 'INSERT INTO payment (card_holder, card_number, date_of_expiry, CVC) VALUES (?, ?, ?, ?)';

  db.query(query, [card_holder, card_number, date_of_expiry, CVC], (err, result) => {
    if (err) {
      console.error('Error inserting payment data: ', err.message);
      res.status(500).send('Database error: ' + err.message);
    } else {
      console.log('Payment data inserted successfully: ', result);
      res.redirect('/address.html'); // Redirect to address page
    }
  });
});

// Address Form Submission Route
app.post('/address', (req, res) => {
  const { address, city, state, zip } = req.body;

  const query = 'INSERT INTO address (address, city, state, zip) VALUES (?, ?, ?, ?)';
  db.query(query, [address, city, state, zip], (err, result) => {
    if (err) {
      console.error('Error inserting address data: ', err.message);
      res.status(500).send('Database error: ' + err.message);
    } else {
      console.log('Address data inserted successfully: ', result);
      res.redirect('/welcome');
    }
  });
});

// Update Profile Route
app.post('/update-profile', isLoggedIn, (req, res) => {
  const userId = req.session.user.idregister; 
  const { first_name, middle_name, last_name, date_of_birth, country_code, gender, contact_number, email, password } = req.body;

  const query = `
    UPDATE register
    SET first_name = ?, middle_name = ?, last_name = ?, date_of_birth = ?, country_code = ?, gender = ?, contact_number = ?, email = ?, password = ?
    WHERE idregister = ?`;

  db.query(query, [first_name, middle_name, last_name, date_of_birth, country_code, gender, contact_number, email, password, userId], (err, result) => {
    if (err) {
      console.error('Error updating profile data: ', err.message);
      res.status(500).send('Database error: ' + err.message);
    } else {
      res.send('Profile updated successfully');
    }
  });
});

// Billing Info Routes
app.get('/billing-info', isLoggedIn, (req, res) => {
  const userId = req.session.user.idregister; 
  const query = 'SELECT * FROM payment WHERE idregister = ?'; // Use idregister to match userId

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching billing data: ', err.message);
      res.status(500).send('Database error: ' + err.message);
    } else {
      res.json(results[0] || {}); 
    }
  });
});

app.post('/update-billing-info', isLoggedIn, (req, res) => {
  const userId = req.session.user.idregister; 
  const { card_holder, card_number, date_of_expiry, CVC } = req.body;

  const query = `
    UPDATE payment
    SET card_holder = ?, card_number = ?, date_of_expiry = ?, CVC = ?
    WHERE idregister = ?`; // Use idregister to match userId

  db.query(query, [card_holder, card_number, date_of_expiry, CVC, userId], (err, result) => {
    if (err) {
      console.error('Error updating billing data: ', err.message);
      res.status(500).send('Database error: ' + err.message);
    } else {
      res.send('Billing information updated successfully');
    }
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
