// Small, dependency-free helpers to record audit logs and compute diffs.

const AuditLog = require("../models/AuditLog");

// Keys we don't care about when diffing
const OMIT_KEYS = new Set([
  "__v", "updatedAt", "createdAt", "password", "refreshToken"
]);

// Turn mongoose doc -> plain object safely
function toPlain(doc) {
  if (!doc) return {};
  return typeof doc.toObject === "function" ? doc.toObject() : doc;
}

// Shallow diff (good enough for most admin forms)
function shallowDiff(beforeDoc, afterDoc) {
  const before = toPlain(beforeDoc);
  const after  = toPlain(afterDoc);

  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const out = {};

  for (const k of keys) {
    if (OMIT_KEYS.has(k)) continue;
    const a = before[k];
    const b = after[k];

    // Compare via JSON to include arrays/objects predictably
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      out[k] = { before: a, after: b };
    }
  }
  return out;
}

/**
 * Log an audit event
 * @param {Object} opts
 * @param {Object} [opts.req] Express req (for ip / ua / req.user)
 * @param {Object} [opts.user] Explicit user object (fallback to req.user)
 * @param {String} opts.action  e.g. "UPDATE_MEMBER"
 * @param {String} opts.entity  e.g. "Member"
 * @param {String|ObjectId} opts.entityId
 * @param {Object} [opts.changes] diff or payload
 * @param {Object} [opts.meta] extra info
 */
async function logAudit(opts = {}) {
  const {
    req, user, action, entity, entityId, changes = {}, meta
  } = opts;

  const userId =
    user?._id ||
    user?.id ||
    req?.user?._id ||
    req?.user?.id;

  if (!userId) {
    // still log with null user if needed, or throw:
    // throw new Error("logAudit: user missing");
  }

  const payload = {
    user: userId,
    action,
    entity,
    entityId,
    changes,
    ipAddress: req?.ip,
    userAgent: req?.get?.("User-Agent"),
  };

  if (meta) payload.meta = meta;

  return AuditLog.create(payload);
}

module.exports = { logAudit, shallowDiff };
