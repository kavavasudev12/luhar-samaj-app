// backend/services/auditService.js
const AuditLog = require("../models/AuditLog");
const mongoose = require("mongoose");
const Zone = require("../models/Zone");

// 🔹 MODIFIED: Added 'requestNumber' to the ignore list for diffing
const IGNORED_FIELDS = new Set(['_id', '__v', 'createdAt', 'updatedAt', 'createdBy', 'issueDate', 'password', 'requestNumber']);

/**
 * Helper function to retrieve the zone name string from MongoDB
 */
async function getZoneName(zoneVal) {
  if (!zoneVal) return "";
  if (typeof zoneVal === "object") {
    if (zoneVal.name) return zoneVal.name;
    // If it's a mongoose ObjectId or similar object
    if (zoneVal.toString && mongoose.Types.ObjectId.isValid(zoneVal.toString())) {
      const zone = await Zone.findById(zoneVal);
      return zone ? zone.name : "";
    }
  }
  if (typeof zoneVal === "string" || zoneVal instanceof mongoose.Types.ObjectId) {
    if (mongoose.Types.ObjectId.isValid(zoneVal.toString())) {
      const zone = await Zone.findById(zoneVal);
      return zone ? zone.name : "";
    }
    return zoneVal.toString();
  }
  return "";
}

/**
 * A powerful function to find detailed differences between two objects,
 * including changes within arrays of objects.
 * @param {Object} before - The original object.
 * @param {Object} after - The updated object.
 * @returns {Array} - A list of specific changes.
 */
function detailedDiff(before = {}, after = {}) {
    const changes = [];
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const key of allKeys) {
        if (IGNORED_FIELDS.has(key)) continue;

        const beforeVal = before[key];
        const afterVal = after[key];

        if (JSON.stringify(beforeVal) === JSON.stringify(afterVal)) continue;

        // 🔹 MODIFIED: This logic now correctly logs the *entire* 'before' and 'after'
        // array for fields like 'familyMembers' or 'additionalMobiles'.
        // This is what your frontend is expecting.
        if (Array.isArray(beforeVal) || Array.isArray(afterVal)) {
            changes.push({ 
                field: key, 
                before: beforeVal, 
                after: afterVal, 
                type: 'modified' 
            });
        } 
        // Handle nested object comparisons (like 'head')
        else if (typeof beforeVal === 'object' && beforeVal !== null && typeof afterVal === 'object' && afterVal !== null) {
            const nestedChanges = detailedDiff(beforeVal, afterVal);
            changes.push(...nestedChanges.map(c => ({ ...c, field: `${key}.${c.field}` })));
        } 
        // Handle simple value changes
        else {
            changes.push({ field: key, before: beforeVal, after: afterVal, type: 'modified' });
        }
    }
    return changes;
}

// 🔹 MODIFIED: Added 'requestNumber', 'reason', 'restoredBy', 'restoredAt' to the function parameters
async function createAudit({ action, entityType, entityId, requestId, memberId, before, after, req, requestNumber, reason, restoredBy, restoredAt }) {
  // Deep clone to avoid mutating standard models passed as arguments
  const beforeClone = before ? JSON.parse(JSON.stringify(before)) : null;
  const afterClone = after ? JSON.parse(JSON.stringify(after)) : null;

  // Resolve Zone and Family Member Names to strings before running detailedDiff
  if (entityType === "Member") {
    if (beforeClone && beforeClone.zone) {
      beforeClone.zone = await getZoneName(beforeClone.zone);
    }
    if (afterClone && afterClone.zone) {
      afterClone.zone = await getZoneName(afterClone.zone);
    }

    // Resolve Family Member objects to name strings
    if (beforeClone && Array.isArray(beforeClone.familyMembers)) {
      beforeClone.familyMembers = beforeClone.familyMembers.map(fm => fm.name || fm).filter(Boolean);
    }
    if (afterClone && Array.isArray(afterClone.familyMembers)) {
      afterClone.familyMembers = afterClone.familyMembers.map(fm => fm.name || fm).filter(Boolean);
    }
  }

  // Use clones to find changes
  const changes = detailedDiff(beforeClone || {}, afterClone || {});

  if (changes.length === 0 && action === 'update') return null;

  // Build snapshot if it's a Member entity
  let snapshot = undefined;
  if (entityType === "Member") {
    const memberObj = (afterClone && Object.keys(afterClone).length > 0 && (afterClone.head || afterClone.uniqueNumber)) ? afterClone : (beforeClone || {});
    
    // Extract properties with fallbacks
    const memberName = memberObj.head?.name || memberObj.name || "";
    const uniqueNumber = typeof memberObj.uniqueNumber === 'number' ? memberObj.uniqueNumber : (Number(memberObj.uniqueNumber) || undefined);
    const rationNo = memberObj.rationNo || "";
    const mobile = memberObj.mobile || "";
    const address = memberObj.address || "";
    const city = memberObj.city || "";
    
    // Zone Name fallback
    const zoneName = typeof memberObj.zone === 'object' ? (memberObj.zone?.name || "") : (memberObj.zone || "");
    
    // Family member names array fallback
    let familyMemberNames = [];
    if (Array.isArray(memberObj.familyMembers)) {
      familyMemberNames = memberObj.familyMembers.map(f => {
        if (typeof f === 'string') return f;
        if (f && typeof f === 'object') return f.name || '';
        return '';
      }).filter(Boolean);
    }

    snapshot = {
      memberName,
      uniqueNumber,
      rationNo,
      mobile,
      address,
      city,
      zoneName,
      familyMemberNames
    };
  }

  return AuditLog.create({
    requestNumber,
    reason,
    restoredBy,
    restoredAt,
    action, entityType, entityId,
    requestId: requestId || undefined,
    memberId: memberId || undefined,
    changes,
    snapshot, // Save the snapshot
    user: { id: req.user?.id, name: req.user?.name || "", email: req.user?.email || "" },
    ipAddress: req.ip,
    userAgent: req.get("User-Agent"),
    timestamp: new Date(),
  });
}

module.exports = { createAudit };