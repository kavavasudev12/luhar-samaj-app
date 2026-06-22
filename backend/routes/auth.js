const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const JWT_SECRET = process.env.JWT_SECRET;

// Admin registration (only for initial setup or with key)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, setupKey } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Prevent open registration unless first admin OR valid setup key
    const adminExists = await User.findOne({ role: 'admin' });
    if (adminExists && setupKey !== process.env.ADMIN_SETUP_KEY) {
      return res.status(403).json({ error: 'Admin already exists or invalid setup key' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = new User({ name, email, password, role: 'admin' });
    await user.save();

    res.status(201).json({ message: 'Admin user created successfully' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || email.trim() === "") {
      return res.status(400).json({ error: "ઈમેલ જરૂરી છે. (Email is required)" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "કૃપા કરીને અમાન્ય ઈમેલ સરનામું તપાસો. (Please check for a valid email address)" });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: "પાસવર્ડ ઓછામાં ઓછો 8 અક્ષરનો હોવો જોઈએ. (Password must be at least 8 characters)" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "અમાન્ય ઈમેલ અથવા પાસવર્ડ. (Invalid email or password)" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ error: "અમાન્ય ઈમેલ અથવા પાસવર્ડ. (Invalid email or password)" });

    const expiresIn = 3600; // 1h in seconds
    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn }
    );

    res.json({
      token,
      expiresIn,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
