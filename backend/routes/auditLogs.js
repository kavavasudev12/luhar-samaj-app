const express = require("express");
const router = express.Router();
const AuditLog = require("../models/AuditLog"); // ✅ only import, don’t define again
const auth = require("../middleware/auth");

router.get("/", auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      action,
      collection,
      documentId,
      user,
      from,
      to,
    } = req.query;

    const q = {};
    if (action) q.action = action;
    if (collection) q.collection = collection;
    if (documentId) q.documentId = documentId;
    if (user) q.user = user;
    if (from || to) {
      q.timestamp = {};
      if (from) q.timestamp.$gte = new Date(from);
      if (to) q.timestamp.$lte = new Date(to);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      AuditLog.find(q)
        .populate("user", "name email role")
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Number(limit)),
      AuditLog.countDocuments(q),
    ]);

    res.json({
      page: Number(page),
      limit: Number(limit),
      total,
      items,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
