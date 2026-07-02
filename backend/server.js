const path = require("path");
require("dotenv").config({
  path: require("path").join(__dirname, ".env")
});

console.log(
  "ENV FILE =",
  path.join(__dirname, ".env")
);

console.log(
  "MONGO_URI =",
  process.env.MONGO_URI
);


const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const { apiLimiter, nosqlSanitizer, xssSanitizer } = require('./middleware/security');

// ✅ Route imports
const authRoutes = require('./routes/auth');
const memberRoutes = require('./routes/members');
const zoneRoutes = require('./routes/zones');
const dashboardRoute = require('./routes/dashboard');
const zoneStickersRouter = require('./routes/zoneStickers');
const adminRoutes = require('./routes/admin');
const requestRoutes = require('./routes/requests');
const auditRoutes = require("./routes/audit");
const exportRoutes = require('./routes/exports'); // ✅ 1. Add this line

const app = express();

// Enable trust proxy for Render/Nginx deployment
app.set("trust proxy", 1);

// Enable compression for responses
app.use(compression());

// ✅ Security Middlewares
app.use(helmet());
app.use(cookieParser());
app.use(nosqlSanitizer);
app.use(xssSanitizer);

// Apply rate limiter to all API routes
app.use('/api', apiLimiter);

// ✅ CORS configuration
// app.use(cors({
//   origin: [
//     'http://localhost:3000',
//     'http://10.76.175.76:3000',
//     'https://luhar-samaj-app.vercel.app',
//     'http://192.168.1.14:5000'
//   ],
//   methods: ["GET", "POST", "PUT", "DELETE"],
//   credentials: true
// }));

app.use(cors({
  origin: true,
  credentials: true
}));

// ✅ Middleware
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Database Connection
// Database Connection

console.log("Mongo URI =", process.env.MONGO_URI);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });

// ✅ CRITICAL FIX: Import models in correct order (AuditLog FIRST!)
require('./models/AuditLog');
require('./models/Member');
require('./models/Zone');
require('./models/User');

mongoose.connection.on('connecting', () => console.log('Connecting to MongoDB...'));
mongoose.connection.on('connected', () => console.log('MongoDB connected!'));
mongoose.connection.on('error', (err) => console.error('MongoDB connection error:', err));

// ✅ Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log("MongoDB connection closed. Server shutting down...");
  process.exit(0);
});

// ✅ Health check route
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    message: 'Backend is working fine ✅'
  });
});

// ✅ Routes
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/zones/stickers', zoneStickersRouter);
app.use('/api/dashboard', dashboardRoute);
app.use('/api/admin', adminRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/audit', auditRoutes); // Corrected path to /api/audit
app.use('/api/export', exportRoutes); // ✅ 2. Add this line


// ✅ Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (process.env.NODE_ENV === 'development') {
    res.status(500).json({ error: err.message, stack: err.stack });
  } else {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ✅ Start the server
const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

module.exports = app;