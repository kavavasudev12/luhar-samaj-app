const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Register first admin
router.post('/register-admin', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    const admin = new User({ email, password, role: 'admin' });
    await admin.save();

    res.json({ message: "Admin registered successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
