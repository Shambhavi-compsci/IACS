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
    if (err) throw err;

    if (results.length > 0) {
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
  // Destroy the session
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      res.status(500).send('Server error');
    } else {
      // Clear the session cookie
      res.clearCookie('connect.sid');
      res.redirect('/index.html'); // Redirect to index page after logout
    }
  });
});

app.post('/delete-account', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/index.html'); // Ensure user is logged in
  }

  const userId = req.session.user.idregister; // Ensure this matches the session data field

  // Delete user from database
  db.query('DELETE FROM register WHERE idregister = ?', [userId], (err, result) => {
    if (err) {
      console.error('Error deleting account: ', err);
      return res.status(500).send('Server error');
    }

    // Destroy session and redirect to index.html
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session: ', err);
        return res.status(500).send('Server error');
      }
      res.redirect('/'); // Redirect to homepage or login page
    });
  });
});

// Registration and Payment Routes
app.post('/register', (req, res) => {
  const { first_name, middle_name, last_name, dob, country_code, gender, contact_number, email, password } = req.body;

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

app.post('/submit-payment', (req, res) => {
  const { card_holder, card_number, date_of_expiry, CVC } = req.body;

  const query = 'INSERT INTO payment (card_holder, card_number, date_of_expiry, CVC) VALUES (?, ?, ?, ?)';
  
  db.query(query, [card_holder, card_number, date_of_expiry, CVC], (err, result) => {
    if (err) {
      console.error('Error inserting payment data: ', err.message);
      res.status(500).send('Database error: ' + err.message);
    } else {
      console.log('Payment data inserted successfully: ', result);
      res.redirect('/welcome');
    }
  });
});

// Address Form Submission Route
app.post('/submit-address', (req, res) => {
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
// Route to fetch user profile data
app.get('/profile', isLoggedIn, (req, res) => {
  const userId = req.session.user.idregister; // Assuming session contains user's ID

  const query = 'SELECT first_name, middle_name, last_name, date_of_birth, country_code, gender, contact_number, email FROM register WHERE idregister = ?';

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching profile data: ', err);
      return res.status(500).send('Server error');
    }

    if (results.length > 0) {
      res.json(results[0]); // Send user profile data to client-side
    } else {
      res.status(404).send('Profile not found');
    }
  });
});

// Route to update user profile data
app.post('/update-profile', isLoggedIn, (req, res) => {
  const userId = req.session.user.idregister; // Update to use idregister
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

// Route to Get Billing Info
app.get('/billing-info', isLoggedIn, (req, res) => {
  const userId = req.session.user.idregister; // Assuming user ID is stored as idregister
  const query = 'SELECT * FROM payment WHERE idpayment = ?'; // Adjust to your table schema

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching billing data: ', err.message);
      res.status(500).send('Database error: ' + err.message);
    } else {
      res.json(results[0] || {}); // Send payment data as JSON
    }
  });
});

app.post('/update-billing-info', isLoggedIn, (req, res) => {
  const userId = req.session.user.idregister; // Assuming user ID is stored as idregister
  const { card_holder, card_number, date_of_expiry, CVC } = req.body;

  const query = `
    UPDATE payment
    SET card_holder = ?, card_number = ?, date_of_expiry = ?, CVC = ?
    WHERE idpayment = ?`;

  db.query(query, [card_holder, card_number, date_of_expiry, CVC, userId], (err, result) => {
    if (err) {
      console.error('Error updating billing data: ', err.message);
      res.status(500).send('Database error: ' + err.message);
    } else {
      res.send('Billing information updated successfully');
    }
  });
});

// Start the Server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
