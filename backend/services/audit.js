const AuditLog = require("../models/AuditLog");

// 🔹 Shallow + nested diff
function diffObjects(before = {}, after = {}) {
  const changes = [];
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);

  for (const k of keys) {
    const b = before?.[k];
    const a = after?.[k];

    const bothObjects =
      b && a &&
      typeof b === "object" && !Array.isArray(b) &&
      typeof a === "object" && !Array.isArray(a);

    if (bothObjects) {
      const sub = diffObjects(b, a);
      sub.forEach((s) =>
        changes.push({ field: `${k}.${s.field}`, before: s.before, after: s.after })
      );
    } else {
      const changed = JSON.stringify(b) !== JSON.stringify(a);
      if (changed) changes.push({ field: k, before: b, after: a });
    }
  }
  return changes;
}

async function createAudit({
  action,
  entityType,
  entityId,
  requestId,   // ✅ aligned with schema
  memberId,    // optional for Member actions
  before,      
  after,       
  req,         
}) {
  const changes = diffObjects(before, after);

  return AuditLog.create({
    action,
    entityType,
    entityId,
    requestId: requestId || undefined,
    memberId: memberId || undefined,
    changes,
    user: {
      id: req.user?.id,
      name: req.user?.name || "",
      email: req.user?.email || "",
    },
    ipAddress: req.ip,
    userAgent: req.get("User-Agent"),
    timestamp: new Date(),
  });
}

module.exports = { createAudit, diffObjects };
