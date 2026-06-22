// backend/models/Member.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// ✅ FIX: Simplified HeadSchema as requested
const HeadSchema = new Schema(
  {
    name: { type: String, required: true },
    // birthdate: { type: Date }, // REMOVED
    // gender: { type: String, enum: ["male", "female", "other"] }, // REMOVED
    // age: { type: Number }, // REMOVED
  },
  { _id: false }
);

const FamilyMemberSchema = new Schema(
  {
    name: { type: String, required: true },
    relation: { type: String },
    birthdate: { type: Date },
    gender: { type: String, enum: ["male", "female", "other"] },
    age: { type: Number },
  },
  { _id: false }
);

const MemberSchema = new Schema(
  {
    head: {
      type: HeadSchema,
      required: true,
    },
    rationNo: { type: String, required: true, index: true },
    uniqueNumber: {
      type: Number,
      unique: true,
      sparse: true, // Allows multiple null values
      index: true,
    },
    address: { type: String, required: true },
    city: { type: String, default: "સાવરકુંડલા" },
    mobile: { type: String, required: true, index: true },
    additionalMobiles: [{ type: String }],
    pincode: { type: String },
    zone: {
      type: Schema.Types.ObjectId,
      ref: "Zone",
      required: true,
    },
    familyMembers: [FamilyMemberSchema],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    issueDate: {
      type: Date,
      default: Date.now,
    },
    membershipValidUntil: {
      type: Date,
    },
    rationCard: {
      fileId: { type: String, required: false },
      imageUrl: { type: String, required: false },
      thumbnailUrl: { type: String, required: false },
      mimeType: { type: String, required: false },
      uploadedAt: { type: Date, required: false },
      uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: false }
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Index for soft deletes
MemberSchema.index({ uniqueNumber: 1, isDeleted: 1 });

module.exports = mongoose.model("Member", MemberSchema);