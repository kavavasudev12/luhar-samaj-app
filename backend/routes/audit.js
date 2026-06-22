const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const AuditLog = require("../models/AuditLog");
const mongoose = require("mongoose");

// --- Helper Functions ---

const validatePaginationParams = (page, limit) => {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 25));
  return { pageNum, limitNum };
};

const validateDateRange = (startDate, endDate) => {
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  if (start && isNaN(start.getTime())) throw new Error("Invalid start date format");
  if (end && isNaN(end.getTime())) throw new Error("Invalid end date format");
  if (start && end && start > end) throw new Error("Start date cannot be after end date");
  return { start, end };
};

// ✅ Enhanced helper to format field names in Gujarati
const getGujaratiFieldName = (field) => {
  const fieldMap = {
    'name': 'નામ',
    'gender': 'લિંગ',
    'birthdate': 'જન્મતારીખ',
    'age': 'ઉંમર',
    'mobile': 'મોબાઇલ',
    'email': 'ઇમેઇલ',
    'address': 'સરનામું',
    'city': 'શહેર',
    'pincode': 'પિનકોડ',
    'zone': 'ઝોન',
    'rationNo': 'રેશન નંબર',
    'uniqueNumber': 'સભ્ય નંબર',
    'requestNumber': 'રિક્વેસ્ટ નંબર',
    'familyMembers': 'પરિવારના સભ્યો',
    'additionalMobiles': 'વધારાના મોબાઇલ',
    'status': 'સ્થિતિ',
    'relation': 'સંબંધ',
    'head': 'મુખ્ય સભ્ય',
    'head.name': 'મુખ્ય સભ્યનું નામ',
    'head.gender': 'લિંગ',
    'head.birthdate': 'જન્મતારીખ',
    'head.age': 'ઉંમર'
  };
  return fieldMap[field] || field;
};

// ✅ Enhanced helper to format values in readable format
const formatValue = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  
  // Handle dates
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('gu-IN');
    }
  }
  
  // Handle booleans
  if (typeof value === 'boolean') {
    return value ? 'હા' : 'ના';
  }
  
  // Handle gender
  if (value === 'male') return 'પુરુષ';
  if (value === 'female') return 'સ્ત્રી';
  if (value === 'other') return 'અન્ય';
  
  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) return '-';
    return value.join(', ');
  }
  
  // Handle objects (for nested data)
  if (typeof value === 'object' && value !== null) {
    if (value._id) return value.name || value.number || value._id;
    return JSON.stringify(value);
  }
  
  return String(value);
};

// ✅ Enhanced helper to format changes with clear before/after
const formatChangesForDisplay = (changes) => {
  if (!changes || changes.length === 0) return [];
  
  return changes.map(change => ({
    field: change.field,
    fieldGujarati: getGujaratiFieldName(change.field),
    before: formatValue(change.before),
    after: formatValue(change.after),
    rawBefore: change.before,
    rawAfter: change.after
  }));
};

// ✅ Helper to format changes for CSV export
const formatChangesForCSV = (changes) => {
  if (!changes || changes.length === 0) return "No changes";
  
  const summary = changes.map(c => {
    const fieldName = getGujaratiFieldName(c.field);
    const before = formatValue(c.before);
    const after = formatValue(c.after);
    return `${fieldName}: ${before} → ${after}`;
  }).join('; ');
  
  return summary.replace(/"/g, '""');
};

// ✅ Helper to get action in Gujarati
const getGujaratiAction = (action) => {
  const actionMap = {
    'create': 'નવો સભ્ય ઉમેર્યો',
    'update': 'સભ્ય માહિતી સુધારી',
    'delete': 'સોફ્ટ ડિલીટ',
    'restore': 'સભ્ય પુનઃસ્થાપિત',
    'permanent_delete': 'કાયમી ડિલીટ',
    'approve': 'મંજૂર',
    'reject': 'નામંજૂર'
  };
  return actionMap[action.toLowerCase()] || action;
};

// ✅ Helper to get entity type in Gujarati
const getGujaratiEntityType = (entityType) => {
  const entityMap = {
    'member': 'સભ્ય',
    'request': 'અરજી',
    'zone': 'ઝોન',
    'user': 'યુઝર'
  };
  return entityMap[entityType.toLowerCase()] || entityType;
};

// --- API Routes ---

/**
 * GET all audit logs with pagination and filtering
 * Enhanced with formatted changes for clear display
 */
router.get("/", auth, async (req, res) => {
  try {
    const { page = 1, limit = 25, entityType, action, userId, startDate, endDate, search } = req.query;

    const { pageNum, limitNum } = validatePaginationParams(page, limit);
    const { start, end } = validateDateRange(startDate, endDate);

    const filter = {};
    if (entityType) filter.entityType = entityType;
    if (action) filter.action = action;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) filter["user.id"] = userId;
    
    if (start || end) {
      filter.timestamp = {};
      if (start) filter.timestamp.$gte = start;
      if (end) filter.timestamp.$lte = end;
    }

    // Search functionality
    if (search) {
      const searchRegExp = new RegExp(search, 'i');
      filter.$or = [
        { "user.name": searchRegExp },
        { "user.email": searchRegExp },
        { "action": searchRegExp },
        { "entityType": searchRegExp }
      ];
      
      if (!isNaN(parseInt(search, 10))) {
        filter.$or.push({ requestNumber: parseInt(search, 10) });
      }
    }

    const skip = (pageNum - 1) * limitNum;
    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate("memberId", "head.name head.gender head.birthdate head.age uniqueNumber rationNo mobile zone")
        .populate("user.id", "name email")
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AuditLog.countDocuments(filter)
    ]);

    // ✅ Enhance logs with formatted data for display
    const enhancedLogs = logs.map(log => ({
      ...log,
      // Add formatted versions for display
      formattedChanges: formatChangesForDisplay(log.changes),
      actionGujarati: getGujaratiAction(log.action),
      entityTypeGujarati: getGujaratiEntityType(log.entityType),
      formattedTimestamp: new Date(log.timestamp).toLocaleString('gu-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }),
      // User info
      userName: log.user?.name || 'N/A',
      userEmail: log.user?.email || 'N/A',
      // Member info
      memberName: log.snapshot?.memberName || log.memberId?.head?.name || 'N/A',
      memberNumber: log.snapshot?.uniqueNumber || log.memberId?.uniqueNumber || 'N/A',
      // Summary for quick view
      changesSummary: log.changes && log.changes.length > 0 
        ? `${log.changes.length} ફેરફાર${log.changes.length > 1 ? 'ો' : ''}` 
        : 'કોઈ ફેરફાર નથી'
    }));

    res.json({
      logs: enhancedLogs,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalLogs: total,
      }
    });
  } catch (err) {
    console.error("GET /audit error:", err);
    res.status(err.message.includes("Invalid") ? 400 : 500).json({ 
      error: err.message || "Failed to fetch audit logs" 
    });
  }
});

/**
 * GET audit logs for a specific member
 * Enhanced with formatted changes
 */
router.get("/member/:memberId", auth, async (req, res) => {
  try {
    const { memberId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({ error: "Invalid member ID format" });
    }

    const logs = await AuditLog.find({ memberId })
      .populate("user.id", "name email")
      .sort({ timestamp: -1 })
      .lean();

    // ✅ Enhance logs with formatted data
    const enhancedLogs = logs.map(log => ({
      ...log,
      formattedChanges: formatChangesForDisplay(log.changes),
      actionGujarati: getGujaratiAction(log.action),
      entityTypeGujarati: getGujaratiEntityType(log.entityType),
      formattedTimestamp: new Date(log.timestamp).toLocaleString('gu-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }),
      userName: log.user?.name || 'N/A',
      changesSummary: log.changes && log.changes.length > 0 
        ? `${log.changes.length} ફેરફાર${log.changes.length > 1 ? 'ો' : ''}` 
        : 'કોઈ ફેરફાર નથી'
    }));

    res.json(enhancedLogs);
  } catch (err) {
    console.error(`GET /audit/member/${req.params.memberId} error:`, err);
    res.status(500).json({ error: "Failed to fetch member audit logs" });
  }
});

/**
 * GET single audit log details
 * For viewing full details of a specific log entry
 */
router.get("/:logId", auth, async (req, res) => {
  try {
    const { logId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(logId)) {
      return res.status(400).json({ error: "Invalid log ID format" });
    }

    const log = await AuditLog.findById(logId)
      .populate("memberId", "head.name head.gender head.birthdate head.age uniqueNumber rationNo mobile zone")
      .populate("user.id", "name email")
      .lean();

    if (!log) {
      return res.status(404).json({ error: "Audit log not found" });
    }

    // ✅ Enhance log with formatted data
    const enhancedLog = {
      ...log,
      formattedChanges: formatChangesForDisplay(log.changes),
      actionGujarati: getGujaratiAction(log.action),
      entityTypeGujarati: getGujaratiEntityType(log.entityType),
      formattedTimestamp: new Date(log.timestamp).toLocaleString('gu-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }),
      userName: log.user?.name || 'N/A',
      userEmail: log.user?.email || 'N/A',
      memberName: log.snapshot?.memberName || log.memberId?.head?.name || 'N/A',
      memberNumber: log.snapshot?.uniqueNumber || log.memberId?.uniqueNumber || 'N/A',
      changesSummary: log.changes && log.changes.length > 0 
        ? `${log.changes.length} ફેરફાર${log.changes.length > 1 ? 'ો' : ''}` 
        : 'કોઈ ફેરફાર નથી'
    };

    res.json(enhancedLog);
  } catch (err) {
    console.error(`GET /audit/${req.params.logId} error:`, err);
    res.status(500).json({ error: "Failed to fetch audit log details" });
  }
});

/**
 * GET audit logs export (CSV or JSON format)
 */
router.get("/export", auth, async (req, res) => {
  try {
    const { entityType, action, userId, startDate, endDate, format = "json" } = req.query;

    const filter = {};
    if (entityType) filter.entityType = entityType;
    if (action) filter.action = action;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) filter["user.id"] = userId;
    
    const { start, end } = validateDateRange(startDate, endDate);
    if (start || end) {
      filter.timestamp = {};
      if (start) filter.timestamp.$gte = start;
      if (end) filter.timestamp.$lte = end;
    }

    const logs = await AuditLog.find(filter)
      .populate("memberId", "head.name uniqueNumber")
      .populate("user.id", "name email")
      .sort({ timestamp: -1 })
      .lean();

    if (format.toLowerCase() === "csv") {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="audit_logs.csv"');
      
      // Add BOM for proper UTF-8 encoding in Excel
      const BOM = '\uFEFF';
      const csvHeader = "રિક્વેસ્ટ નંબર,તારીખ અને સમય,ક્રિયા,એન્ટિટી,યુઝર,સભ્યનું નામ,સભ્ય નંબર,ફેરફારોની વિગત\n";
      const csvData = logs.map(log => [
        log.requestNumber || '-',
        new Date(log.timestamp).toLocaleString('gu-IN'),
        getGujaratiAction(log.action),
        getGujaratiEntityType(log.entityType),
        log.user?.name || 'N/A',
        log.snapshot?.memberName || log.memberId?.head?.name || 'N/A',
        log.snapshot?.uniqueNumber || log.memberId?.uniqueNumber || 'N/A',
        `"${formatChangesForCSV(log.changes)}"`
      ].join(",")).join("\n");
      
      res.send(BOM + csvHeader + csvData);
    } else {
      // Enhanced JSON export
      const enhancedLogs = logs.map(log => ({
        ...log,
        formattedChanges: formatChangesForDisplay(log.changes),
        actionGujarati: getGujaratiAction(log.action),
        entityTypeGujarati: getGujaratiEntityType(log.entityType),
        formattedTimestamp: new Date(log.timestamp).toLocaleString('gu-IN'),
        userName: log.user?.name || 'N/A',
        memberName: log.snapshot?.memberName || log.memberId?.head?.name || 'N/A',
        memberNumber: log.snapshot?.uniqueNumber || log.memberId?.uniqueNumber || 'N/A'
      }));
      res.json(enhancedLogs);
    }
  } catch (err) {
    console.error("GET /audit/export error:", err);
    res.status(500).json({ error: "Failed to export audit logs" });
  }
});

module.exports = router;