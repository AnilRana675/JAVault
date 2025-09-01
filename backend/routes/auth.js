const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

router.post('/login', (req, res) => {
  const { password } = req.body || {};
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || !process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'Server auth not configured' });
  }
  if (!password) return res.status(400).json({ error: 'password is required' });
  if (password !== adminPassword) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

module.exports = router;
