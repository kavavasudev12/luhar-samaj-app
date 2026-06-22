const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Get all users (admin only)
router.get('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new user (admin only)
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  try {
    const { email, password, role } = req.body;
    
    // Validate role
    if (!['admin', 'manager'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Create new user
    const user = new User({ email, password, role });
    await user.save();
    
    // Return user without password
    const userWithoutPassword = user.toObject();
    delete userWithoutPassword.password;
    
    res.status(201).json(userWithoutPassword);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;