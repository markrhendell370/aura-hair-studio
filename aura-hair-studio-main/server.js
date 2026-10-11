const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'aura_luxury_mens_salon_secret_key_2026';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Database & Tables
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) console.error('Database connection failed:', err);
  else console.log('Connected to SQLite Database.');
});

db.serialize(() => {
  // Users Table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'customer',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Appointments Table
  db.run(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      client_name TEXT NOT NULL,
      service_name TEXT NOT NULL,
      hair_length TEXT NOT NULL,
      stylist_name TEXT DEFAULT 'Master Barber Alex',
      total_price_php INTEGER NOT NULL,
      duration_minutes INTEGER NOT NULL,
      appointment_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      estimated_completion_time TEXT NOT NULL,
      status TEXT DEFAULT 'Pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // Seed Default Users if empty
  db.get(`SELECT COUNT(*) as count FROM users`, (err, row) => {
    if (row && row.count === 0) {
      const adminPass = bcrypt.hashSync('admin123', 10);
      const userPass = bcrypt.hashSync('customer123', 10);

      db.run(`INSERT INTO users (name, email, password_hash, role) VALUES ('Aura Master Stylist', 'admin@aurahair.com', ?, 'admin')`, [adminPass]);
      db.run(`INSERT INTO users (name, email, password_hash, role) VALUES ('Marcus Vance', 'marcus@example.com', ?, 'customer')`, [userPass]);
      
      console.log('Seeded initial Admin (admin@aurahair.com / admin123) and Customer (marcus@example.com / customer123)');
    }
  });
});

// Helper Formulas
function calculatePriceAndDuration(service, hairLength) {
  let price = 0;
  let duration = 0;

  switch (service) {
    case 'Executive Haircut':
    case 'Haircut':
      price = 350;
      duration = 30;
      break;
    case 'Digital Perm':
      if (hairLength === 'Short') price = 2000;
      else if (hairLength === 'Medium') price = 3000;
      else if (hairLength === 'Long') price = 4500;
      else if (hairLength === 'Extra Long') price = 6000;
      duration = (hairLength === 'Short' || hairLength === 'Medium') ? 120 : (hairLength === 'Long' ? 180 : 240);
      break;
    case 'Hair Color':
      if (hairLength === 'Short') price = 1500;
      else if (hairLength === 'Medium') price = 2500;
      else if (hairLength === 'Long') price = 4000;
      else if (hairLength === 'Extra Long') price = 5500;
      duration = (hairLength === 'Short' || hairLength === 'Medium') ? 90 : 150;
      break;
    case 'Rebonding':
      if (hairLength === 'Short') price = 2500;
      else if (hairLength === 'Medium') price = 3500;
      else if (hairLength === 'Long') price = 4500;
      else if (hairLength === 'Extra Long') price = 5500;
      duration = (hairLength === 'Short' || hairLength === 'Medium') ? 150 : 210;
      break;
    case 'Treatment':
      price = 950;
      duration = 60;
      break;
  }

  return { price, duration };
}

function calculateETC(startTimeStr, totalMinutesWithBuffer) {
  const [hours, minutes] = startTimeStr.split(':').map(Number);
  const totalMins = hours * 60 + minutes + totalMinutesWithBuffer;
  const endHours = Math.floor(totalMins / 60) % 24;
  const endMins = totalMins % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
}

// Authentication Middlewares
function authenticateToken(req, res, next) {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ error: 'Unauthorized. Please log in.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Session expired or invalid.' });
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
  next();
}

// API ROUTE: Estimate Price & Duration
app.post('/api/estimate', (req, res) => {
  const { service, hairLength } = req.body;
  const { price, duration } = calculatePriceAndDuration(service, hairLength);
  const bufferTime = 15;
  res.json({
    price_php: price,
    duration_minutes: duration,
    buffer_minutes: bufferTime,
    total_time_minutes: duration + bufferTime
  });
});

// API ROUTES: Auth
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required.' });

  const passwordHash = bcrypt.hashSync(password, 10);
  db.run(`INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)`, [name, email, passwordHash], function(err) {
    if (err) return res.status(400).json({ error: 'Email already registered.' });

    const user = { id: this.lastID, name, email, role: 'customer' };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '1d' });
    res.cookie('auth_token', token, { httpOnly: true });
    res.json({ success: true, user });
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
    if (err || !user) return res.status(400).json({ error: 'Invalid email or password.' });

    const validPass = bcrypt.compareSync(password, user.password_hash);
    if (!validPass) return res.status(400).json({ error: 'Invalid email or password.' });

    const userData = { id: user.id, name: user.name, email: user.email, role: user.role };
    const token = jwt.sign(userData, JWT_SECRET, { expiresIn: '1d' });
    res.cookie('auth_token', token, { httpOnly: true });
    res.json({ success: true, user: userData });
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ success: true });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// API ROUTES: Appointments
app.post('/api/appointments', authenticateToken, (req, res) => {
  const { service_name, hair_length, appointment_date, start_time, stylist_name } = req.body;
  const { price, duration } = calculatePriceAndDuration(service_name, hair_length);
  const totalDuration = duration + 15;
  const etc = calculateETC(start_time, totalDuration);

  db.run(
    `INSERT INTO appointments (user_id, client_name, service_name, hair_length, stylist_name, total_price_php, duration_minutes, appointment_date, start_time, estimated_completion_time) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.user.id, req.user.name, service_name, hair_length, stylist_name || 'Master Barber Alex', price, duration, appointment_date, start_time, etc],
    function(err) {
      if (err) return res.status(500).json({ error: 'Failed to create appointment.' });
      res.json({ success: true, appointment_id: this.lastID });
    }
  );
});

app.get('/api/appointments/my', authenticateToken, (req, res) => {
  db.all(`SELECT * FROM appointments WHERE user_id = ? ORDER BY appointment_date DESC, start_time ASC`, [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error.' });
    res.json(rows);
  });
});

app.get('/api/appointments/all', authenticateToken, requireAdmin, (req, res) => {
  db.all(`SELECT * FROM appointments ORDER BY appointment_date DESC, start_time ASC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error.' });
    res.json(rows);
  });
});

app.put('/api/appointments/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status, hair_length, appointment_date, start_time, service_name } = req.body;

  db.get(`SELECT * FROM appointments WHERE id = ?`, [id], (err, appt) => {
    if (err || !appt) return res.status(404).json({ error: 'Appointment not found.' });

    if (req.user.role !== 'admin' && appt.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    if (req.user.role === 'admin' && status) {
      db.run(`UPDATE appointments SET status = ? WHERE id = ?`, [status, id], (err) => {
        if (err) return res.status(500).json({ error: 'Update failed.' });
        res.json({ success: true });
      });
    } else {
      const activeService = service_name || appt.service_name;
      const activeLength = hair_length || appt.hair_length;
      const { price, duration } = calculatePriceAndDuration(activeService, activeLength);
      const totalDuration = duration + 15;
      const newETC = calculateETC(start_time || appt.start_time, totalDuration);

      db.run(
        `UPDATE appointments SET hair_length = ?, appointment_date = ?, start_time = ?, total_price_php = ?, duration_minutes = ?, estimated_completion_time = ? WHERE id = ?`,
        [activeLength, appointment_date || appt.appointment_date, start_time || appt.start_time, price, duration, newETC, id],
        (err) => {
          if (err) return res.status(500).json({ error: 'Update failed.' });
          res.json({ success: true });
        }
      );
    }
  });
});

app.delete('/api/appointments/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  db.get(`SELECT * FROM appointments WHERE id = ?`, [id], (err, appt) => {
    if (err || !appt) return res.status(404).json({ error: 'Appointment not found.' });
    if (req.user.role !== 'admin' && appt.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    db.run(`DELETE FROM appointments WHERE id = ?`, [id], (err) => {
      if (err) return res.status(500).json({ error: 'Deletion failed.' });
      res.json({ success: true });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Aura Hair & Perm Server running on http://localhost:${PORT}`);
});
