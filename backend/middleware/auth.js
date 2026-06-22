// middleware/auth.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader) {
      return res.status(401).json({ error: "No token, authorization denied" });
    }

    const token = authHeader.replace("Bearer ", "");

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Load full user from DB to attach name, email, role etc.
    const user = await User.findById(decoded.id).select("name email role");
    if (!user) {
      return res.status(401).json({ error: "User not found or deactivated" });
    }

    // Attach user object to request
    req.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (err) {
    console.error("Auth middleware error:", err.message);
    return res.status(401).json({ error: "Token is not valid or expired" });
  }
};

module.exports = auth;
