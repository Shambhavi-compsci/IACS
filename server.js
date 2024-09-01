const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const path = require('path');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
}));

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

// Serve static files like CSS, JS, and images
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/register.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/welcome.html', (req, res) => {
  if (req.session.loggedIn) {
    res.sendFile(path.join(__dirname, 'public', 'welcome.html'));
  } else {
    res.redirect('/');
  }
});

app.get('/payment.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'payment.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  const query = 'SELECT * FROM loginuser WHERE username = ? AND password = ?';
  db.query(query, [username, password], (err, results) => {
    if (err) throw err;

    if (results.length > 0) {
      req.session.loggedIn = true;
      res.redirect('/welcome.html');
    } else {
      res.send('Invalid username or password');
    }
  });
});

// Middleware to check if user is logged in
function isLoggedIn(req, res, next) {
  if (req.session.loggedIn) {
    return next();
  } else {
    res.redirect('/');
  }
}

app.get('/profile', isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) throw err;
    res.redirect('/');
  });
});

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

// New route to handle payment form submission
app.post('/submit-payment', (req, res) => {
  const { card_holder, card_number, date_of_expiry, CVC } = req.body;

  const query = 'INSERT INTO payments (card_holder, card_number, date_of_expiry, CVC) VALUES (?, ?, ?, ?)';

  db.query(query, [card_holder, card_number, date_of_expiry, CVC], (err, result) => {
    if (err) {
      console.error('Error inserting payment data: ', err.message);
      res.status(500).send('Database error: ' + err.message);
    } else {
      console.log('Payment data inserted successfully: ', result);
      res.redirect('/welcome.html'); // Redirect to a confirmation page or another page
    }
  });
});

// Listen for incoming requests
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
