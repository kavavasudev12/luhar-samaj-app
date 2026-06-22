// backend/middleware/security.js
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

// 1. Rate Limiter Middleware
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

// 2. NoSQL injection protection using express-mongo-sanitize
const nosqlSanitizer = mongoSanitize();

// 3. XSS Sanitizer Middleware (recursive tag stripping)
function cleanHtml(val) {
  if (typeof val === 'string') {
    // Strip HTML script tag and markup brackets
    return val.replace(/<[^>]*>/g, '').trim();
  }
  if (Array.isArray(val)) {
    return val.map(cleanHtml);
  }
  if (typeof val === 'object' && val !== null) {
    const cleaned = {};
    for (const key in val) {
      cleaned[key] = cleanHtml(val[key]);
    }
    return cleaned;
  }
  return val;
}

const xssSanitizer = (req, res, next) => {
  if (req.body) {
    req.body = cleanHtml(req.body);
  }
  if (req.query) {
    req.query = cleanHtml(req.query);
  }
  if (req.params) {
    req.params = cleanHtml(req.params);
  }
  next();
};

// 4. Role-Based Access Control (RBAC) Middleware
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: insufficient permissions' });
    }
    next();
  };
};

module.exports = {
  apiLimiter,
  nosqlSanitizer,
  xssSanitizer,
  checkRole
};
