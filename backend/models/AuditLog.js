// backend/models/AuditLog.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ChangeSchema = new Schema(
  {
    field: { type: String, required: true },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const AuditLogSchema = new Schema({
  timestamp: {
    type: Date,
    default: Date.now,
  },
  user: {
    id: { type: Schema.Types.ObjectId, ref: "User" },
    name: { type: String },
    email: { type: String },
  },
  action: {
    type: String,
    enum: [
      "create",
      "update",
      "delete",
      "restore",
      "approve",
      "reject",
      "permanent_delete"
    ],
    required: true
  },
  entityType: {
    type: String,
    required: true,
  },
  entityId: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  // Link to the member associated with this change
  memberId: {
    type: Schema.Types.ObjectId,
    ref: "Member",
    index: true,
  },
  // ✅ FIX: Removed unique and sparse. Made it optional.
  requestNumber: {
    type: String,
    required: false, // No longer required
  },
  reason: {
    type: String,
    required: false,
  },
  restoredBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  restoredAt: {
    type: Date,
    required: false,
  },
  changes: [ChangeSchema],
  before: { type: Schema.Types.Mixed },
  after: { type: Schema.Types.Mixed },
  snapshot: {
    memberName: { type: String },
    uniqueNumber: { type: Number },
    rationNo: { type: String },
    mobile: { type: String },
    address: { type: String },
    city: { type: String },
    zoneName: { type: String },
    familyMemberNames: [{ type: String }],
  },
  ipAddress: {
    type: String,
    required: false,
  },
  userAgent: {
    type: String,
    required: false,
  },
});

// Add index for faster queries
AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1 });

module.exports = mongoose.model("AuditLog", AuditLogSchema);