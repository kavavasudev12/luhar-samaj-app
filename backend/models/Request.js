// backend/models/Request.js
const mongoose = require("mongoose");

// This schema is now identical to the familyMemberSchema in Member.js
const familyMemberSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  relation: { type: String, required: true, trim: true },
  birthdate: { type: Date },
  gender: { type: String, enum: ["male", "female", "other"] },
  age: { type: Number },
});

// This schema is now aligned with the Member.js schema
const requestSchema = new mongoose.Schema(
  {
    // ✅ Align with Member.js
    head: {
      name: { type: String, required: true, trim: true },
      // birthdate: { type: Date, required: true }, // REMOVED
      // gender: { type: String, enum: ["male", "female", "other"], required: true }, // REMOVED
      // age: { type: Number, required: true }, // REMOVED
    },

    rationNo: { type: String, trim: true, required: true },
    address: { type: String, required: true },
    
    // ✅ ADDED: city
    city: { type: String, trim: true },

    mobile: {
      type: String,
      trim: true,
      required: true,
      validate: {
        validator: (v) => /^\d{10}$/.test(v),
        message: (props) => `${props.value} is not a valid 10-digit mobile number!`,
      },
    },
    
    // ✅ ADDED: additionalMobiles
    additionalMobiles: [
      {
        type: String,
        trim: true,
        validate: {
          validator: (v) => /^\d{10}$/.test(v),
          message: (props) => `${props.value} is not a valid 10-digit additional mobile number!`,
        },
      },
    ],

    pincode: {
      type: String,
      validate: {
        validator: (v) => !v || /^\d{6}$/.test(v),
        message: (props) => `${props.value} is not a valid 6-digit pincode!`,
      },
    },

    zone: { type: mongoose.Schema.Types.ObjectId, ref: "Zone", required: true },
    
    // ✅ Use the consistent familyMemberSchema
    familyMembers: [familyMemberSchema],

    rationCard: {
      fileId: { type: String, required: false },
      imageUrl: { type: String, required: false },
      thumbnailUrl: { type: String, required: false },
      mimeType: { type: String, required: false },
      uploadedAt: { type: Date, required: false },
      uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }
    },

    // Request-specific fields
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reviewNotes: String, // For admins to add notes on rejection
    requestType: {
      type: String,
      default: "New Membership",
    },
    uniqueNumber: {
      type: Number,
    },
    issueDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Request", requestSchema);