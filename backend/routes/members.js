// backend/routes/members.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Member = require("../models/Member");
const Zone = require("../models/Zone");
const mongoose = require("mongoose");
const { createAudit } = require("../services/auditService");
const { generateCard } = require("../services/pdf-service");



// ----------------- Helper Functions  
function toDateOrNull(v) {
  if (!v) return null;
  try {
    const d = v instanceof Date ? v : new Date(v);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function calcAgeFromDOB(dob) {
  if (!(dob instanceof Date) || isNaN(dob.getTime())) return undefined;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

// ✅ HELPER: Get end of the FINANCIAL year (31/03) from a date
function getValidityEnd(date) {
  const d = toDateOrNull(date);
  const refDate = d || new Date(); // Use provided date or today as reference

  const issueMonth = refDate.getMonth(); // 0 = Jan, 2 = Mar, 3 = Apr
  let expiryYear = refDate.getFullYear();

  // If the issue month is April (3) or later...
  if (issueMonth >= 3) {
    // ...the financial year ends *next* year.
    expiryYear += 1;
  }

  // The expiry date is always March 31st (Month 2) of the calculated expiry year.
  // new Date(YYYY, MM, DD, HH, MM, SS)
  return new Date(expiryYear, 2, 31, 23, 59, 59);
}

// ✅ NEW HELPER: Format date to DD-MM-YYYY
function formatDateDDMMYYYY(date) {
  if (!date) return "N/A";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "N/A";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0"); // Month is 0-indexed
  const year = d.getFullYear();

  return `${day}-${month}-${year}`;
}

function normalizeFamilyMembers(input) {
  if (!Array.isArray(input)) return [];
  return input
    .filter((f) => f && (f.name || f.relation || f.birthdate || f.gender || f.age))
    .map((f) => {
      const birthdate = toDateOrNull(f.birthdate);
      const calculatedAge = calcAgeFromDOB(birthdate);
      const age =
        calculatedAge !== undefined
          ? calculatedAge
          : (typeof f.age === "number"
            ? f.age
            : typeof f.age === "string" && f.age.trim() !== "" && !isNaN(Number(f.age))
              ? Number(f.age)
              : undefined);
      const gender =
        f.gender && ["male", "female", "other"].includes(String(f.gender).toLowerCase())
          ? String(f.gender).toLowerCase()
          : undefined;
      return {
        name: f.name || "",
        relation: f.relation || "",
        birthdate: birthdate || undefined,
        gender,
        age,
      };
    });
}

function sendHtmlResponse(res, statusCode, title, bodyContent) {
  const html = `
    <!DOCTYPE html>
    <html lang="gu">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          display: grid;
          place-items: center;
          min-height: 90vh;
          background-color: #f4f7f6;
          margin: 0;
          color: #333;
        }
        .card {
          background-color: #ffffff;
          border-radius: 12px;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.07);
          padding: 2rem;
          max-width: 450px;
          width: 90%;
          text-align: center;
          border-top: 8px solid;
        }
        .card.success { border-color: #28a745; }
        .card.error { border-color: #dc3545; }
        h2 {
          font-size: 1.75rem;
          margin-top: 0;
          font-weight: 600;
        }
        .card.success h2 { color: #28a745; }
        .card.error h2 { color: #dc3545; }
        p {
          font-size: 1.1rem;
          line-height: 1.6;
          margin: 1rem 0;
        }
        .data-item {
          font-weight: 500;
          color: #555;
        }
        .data-item strong {
          color: #000;
        }
      </style>
    </head>
    <body>
      ${bodyContent}
    </body>
    </html>
  `;
  res.status(statusCode).type("html").send(html);
}

// Validation Helper Functions
function validateMemberInput(data, isUpdate = false) {
  const { head, rationNo, uniqueNumber, address, mobile, zone, issueDate } = data;

  if (!isUpdate || head !== undefined) {
    if (!head || !head.name || head.name.trim() === "") {
      return "મુખ્ય નામ જરૂરી છે. (Head Name is required)";
    }
    if (head.name.trim().length < 3) {
      return "મુખ્ય નામ ઓછામાં ઓછું 3 અક્ષરનું હોવું જોઈએ. (Head Name must be at least 3 characters)";
    }
    const nameRegex = /^[a-zA-Z\s.\u0A80-\u0AFF]+$/;
    if (!nameRegex.test(head.name)) {
      return "મુખ્ય નામમાં માત્ર અંગ્રેજી અથવા ગુજરાતી અક્ષરો હોવા જોઈએ. (Head Name must contain only English or Gujarati characters)";
    }
  }

  if (!isUpdate || uniqueNumber !== undefined) {
    if (uniqueNumber === undefined || uniqueNumber === null || String(uniqueNumber).trim() === "") {
      return "સભ્ય નંબર (Sabhya Number) જરૂરી છે. (Sabhya Number is required)";
    }
    const parsedUnique = Number(uniqueNumber);
    if (isNaN(parsedUnique) || !Number.isInteger(parsedUnique) || parsedUnique <= 0) {
      return "સભ્ય નંબર ધન પૂર્ણાંક હોવો જોઈએ. (Sabhya Number must be a positive integer)";
    }
  }

  if (!isUpdate || rationNo !== undefined) {
    if (!rationNo || rationNo.trim() === "") {
      return "રેશન નંબર જરૂરી છે. (Ration Number is required)";
    }
    if (rationNo.trim().length < 3) {
      return "રેશન નંબર ઓછામાં ઓછું 3 અક્ષરનું હોવું જોઈએ. (Ration Number must be at least 3 characters)";
    }
  }

  if (!isUpdate || mobile !== undefined) {
    if (!mobile || mobile.trim() === "") {
      return "મોબાઇલ નંબર જરૂરી છે. (Mobile number is required)";
    }
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobile)) {
      return "મોબાઇલ નંબર 10 આંકડાનો અને સાચો હોવો જોઈએ. (Mobile number must be a valid 10-digit number starting with 6-9)";
    }
  }

  if (!isUpdate || address !== undefined) {
    if (!address || address.trim() === "") {
      return "સરનામું જરૂરી છે. (Address is required)";
    }
    if (address.trim().length < 10) {
      return "સરનામું ઓછામાં ઓછું 10 અક્ષરનું હોવું જોઈએ. (Address must be at least 10 characters)";
    }
  }

  if (!isUpdate || zone !== undefined) {
    if (!zone) {
      return "ઝોન પસંદ કરવો જરૂરી છે. (Zone is required)";
    }
  }

  if (!isUpdate || issueDate !== undefined) {
    if (!issueDate) {
      return "જારી તારીખ જરૂરી છે. (Issue Date is required)";
    }
    const d = new Date(issueDate);
    if (isNaN(d.getTime())) {
      return "અમાન્ય જારી તારીખ. (Invalid Issue Date)";
    }
  }

  return null;
}

function validateFamilyMembers(familyMembers) {
  if (familyMembers !== undefined) {
    if (!Array.isArray(familyMembers)) {
      return "પરિવારના સભ્યોની યાદી અમાન્ય છે. (Family members must be an array)";
    }
    for (let i = 0; i < familyMembers.length; i++) {
      const fm = familyMembers[i];
      if (!fm.name || fm.name.trim() === "") {
        return `સભ્ય ${i + 1} નું નામ જરૂરી છે. (Family member ${i + 1} name is required)`;
      }
      if (!fm.relation || fm.relation.trim() === "") {
        return `સભ્ય ${i + 1} નો સંબંધ જરૂરી છે. (Family member ${i + 1} relation is required)`;
      }
      if (!fm.gender || !["male", "female", "other"].includes(String(fm.gender).toLowerCase())) {
        return `સભ્ય ${i + 1} નું લિંગ જરૂરી છે. (Family member ${i + 1} gender is required)`;
      }

      let age = fm.age;
      if (fm.birthdate) {
        const b = toDateOrNull(fm.birthdate);
        if (b) {
          age = calcAgeFromDOB(b);
        }
      }

      if (age === undefined || age === null || String(age).trim() === "") {
        return `સભ્ય ${i + 1} ની ઉંમર જરૂરી છે. (Family member ${i + 1} age is required)`;
      }
      const ageNum = Number(age);
      if (isNaN(ageNum) || ageNum < 0 || ageNum > 120) {
        return `સભ્ય ${i + 1} ની ઉંમર 0 થી 120 ની વચ્ચે હોવી જોઈએ. (Family member ${i + 1} age must be between 0 and 120)`;
      }
    }
  }
  return null;
}

// ----------------- Routes -----------------

// GET all (active) members
router.get("/", auth, async (req, res) => {
  try {
    const members = await Member.find({ isDeleted: { $ne: true } })
      .populate("zone")
      .populate("createdBy", "name email")
      .sort({ uniqueNumber: 1 });
    res.json(members);
  } catch (err) {
    console.error("GET /members error:", err);
    res.status(500).json({ error: "Failed to fetch members" });
  }
});

// GET all DELETED members
router.get("/deleted", auth, async (req, res) => {
  try {
    const members = await Member.find({ isDeleted: true })
      .populate("zone")
      .populate("createdBy", "name email")
      .populate("deletedBy", "name email")
      .sort({ uniqueNumber: 1 });
    res.json(members);
  } catch (err) {
    console.error("GET /members/deleted error:", err);
    res.status(500).json({ error: "Failed to fetch deleted members" });
  }
});

// GET all ADULT members (family members with age >= 18, and head only if age exists and >= 18)
router.get("/adults", auth, async (req, res) => {
  try {
    const search = req.query.search || "";
    const sortBy = req.query.sortBy || "memberName";
    const sortOrder = req.query.sortOrder === "desc" ? -1 : 1;
    const zoneId = req.query.zone;

    // Base query stage to match active family members only
    const matchStage = { isDeleted: { $ne: true } };
    if (zoneId && mongoose.Types.ObjectId.isValid(zoneId)) {
      matchStage.zone = new mongoose.Types.ObjectId(zoneId);
    }

    const pipeline = [
      { $match: matchStage },
      {
        $project: {
          head: 1,
          rationNo: 1,
          mobile: 1,
          address: 1,
          zone: 1,
          uniqueNumber: 1,
          adults: {
            $concatArrays: [
              // Include head only if head.age exists and head.age >= 18
              {
                $cond: {
                  if: {
                    $and: [
                      { $ne: ["$head.age", undefined] },
                      { $ne: ["$head.age", null] },
                      { $gte: ["$head.age", 18] }
                    ]
                  },
                  then: [{
                    name: "$head.name",
                    relation: "Self (મુખ્ય)",
                    age: "$head.age",
                    gender: "$head.gender",
                    isHead: true
                  }],
                  else: []
                }
              },
              // Include family members with age >= 18
              {
                $filter: {
                  input: { $ifNull: ["$familyMembers", []] },
                  as: "fm",
                  cond: { $gte: ["$$fm.age", 18] }
                }
              }
            ]
          }
        }
      },
      { $unwind: "$adults" }
    ];

    // Gender filter
    const gender = req.query.gender || "";
    if (gender) {
      pipeline.push({
        $match: {
          "adults.gender": gender.toLowerCase()
        }
      });
    }

    // If search filter is active
    if (search) {
      const searchRegex = new RegExp(search, "i");
      pipeline.push({
        $match: {
          $or: [
            { "adults.name": searchRegex },
            { "head.name": searchRegex },
            { mobile: searchRegex },
            { address: searchRegex },
            { rationNo: searchRegex }
          ]
        }
      });
    }

    // Lookup Zone details
    pipeline.push(
      {
        $lookup: {
          from: "zones",
          localField: "zone",
          foreignField: "_id",
          as: "zoneInfo"
        }
      },
      { $unwind: { path: "$zoneInfo", preserveNullAndEmptyArrays: true } }
    );

    // Final shape mapping
    pipeline.push({
      $project: {
        _id: { $concat: [{ $toString: "$_id" }, "_", "$adults.name"] },
        familyId: "$_id",
        headName: "$head.name",
        memberName: "$adults.name",
        age: "$adults.age",
        gender: "$adults.gender",
        relation: "$adults.relation",
        mobile: "$mobile",
        address: "$address",
        zone: {
          _id: "$zoneInfo._id",
          name: "$zoneInfo.name",
          number: "$zoneInfo.number"
        },
        rationNo: "$rationNo",
        uniqueNumber: "$uniqueNumber"
      }
    });

    // Sort and execute pipeline
    pipeline.push({ $sort: { uniqueNumber: 1 } });
    const data = await Member.aggregate(pipeline);
    res.json(data);

  } catch (err) {
    console.error("GET /members/adults error:", err);
    res.status(500).json({ error: "Failed to fetch adult members" });
  }
});

// CREATE member
router.post("/", auth, async (req, res) => {
  try {
    const {
      head, // This will just be { name: "..." }
      rationNo,
      uniqueNumber,
      address,
      city,
      mobile,
      additionalMobiles,
      pincode,
      zone,
      familyMembers,
      issueDate,
    } = req.body;

    const validationErr = validateMemberInput(req.body);
    if (validationErr) {
      return res.status(400).json({ error: validationErr });
    }
    const familyErr = validateFamilyMembers(familyMembers);
    if (familyErr) {
      return res.status(400).json({ error: familyErr });
    }

    const zoneDoc = await Zone.findById(zone);
    if (!zoneDoc) return res.status(400).json({ error: "Invalid zone ID" });

    const parsedUnique = parseInt(uniqueNumber, 10);
    const existing = await Member.findOne({ uniqueNumber: parsedUnique, isDeleted: { $ne: true } });
    if (existing) {
      return res.status(400).json({ error: `Unique Number ${parsedUnique} is already assigned.` });
    }

    const finalIssueDate = toDateOrNull(issueDate);
    const validityEnd = getValidityEnd(finalIssueDate); // Calculate end of financial year

    const member = new Member({
      head: {
        name: head.name,
      },
      rationNo,
      uniqueNumber: parsedUnique,
      address,
      city,
      mobile,
      additionalMobiles: additionalMobiles || [],
      pincode,
      zone,
      familyMembers: normalizeFamilyMembers(familyMembers),
      createdBy: req.user?.id,
      issueDate: finalIssueDate,
      isDeleted: false,
      membershipValidUntil: validityEnd, // Save calculated validity
    });

    await member.save();

    await createAudit({
      action: "create",
      entityType: "Member",
      entityId: member._id,
      memberId: member._id,
      after: member.toObject(),
      req,
      requestNumber: req.body.requestNumber, // <-- This will be undefined if not provided, which is now OK
    });

    const populated = await Member.findById(member._id).populate("zone");
    res.status(201).json({ member: populated });
  } catch (err) {
    console.error("POST /members error:", err);
    res.status(400).json({ error: err.message || "Failed to create member" });
  }
});

// UPDATE member
router.put("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid member ID format" });

    const beforeUpdate = await Member.findOne({ _id: id, isDeleted: { $ne: true } }).lean();
    if (!beforeUpdate) return res.status(404).json({ error: "Member not found or has been deleted" });

    const validationErr = validateMemberInput(req.body, true);
    if (validationErr) {
      return res.status(400).json({ error: validationErr });
    }
    const familyErr = validateFamilyMembers(req.body.familyMembers);
    if (familyErr) {
      return res.status(400).json({ error: familyErr });
    }

    // Safe partial updates to preserve unknown historical fields
    const updateData = {};
    const { head, familyMembers, rationNo, uniqueNumber, address, city, mobile, additionalMobiles, pincode, zone, issueDate } = req.body;

    if (head && typeof head.name === 'string') {
      updateData['head.name'] = head.name;
    }
    if (rationNo !== undefined) updateData.rationNo = rationNo;
    if (uniqueNumber !== undefined) {
      const parsedUnique = parseInt(uniqueNumber, 10);
      const existing = await Member.findOne({ uniqueNumber: parsedUnique, isDeleted: { $ne: true }, _id: { $ne: id } });
      if (existing) {
        return res.status(400).json({ error: `Unique Number ${parsedUnique} is already assigned.` });
      }
      updateData.uniqueNumber = parsedUnique;
    }
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (mobile !== undefined) updateData.mobile = mobile;
    if (additionalMobiles !== undefined) updateData.additionalMobiles = additionalMobiles;
    if (pincode !== undefined) updateData.pincode = pincode;
    if (zone !== undefined) {
      const zoneDoc = await Zone.findById(zone);
      if (!zoneDoc) return res.status(400).json({ error: "Invalid zone ID" });
      updateData.zone = zone;
    }

    if (familyMembers !== undefined) {
      updateData.familyMembers = normalizeFamilyMembers(familyMembers);
    }

    // ✅ AUTOMATIC VALIDITY LOGIC ON UPDATE
    if (issueDate !== undefined) {
      const newIssueDate = toDateOrNull(issueDate);
      updateData.issueDate = newIssueDate;
      updateData.membershipValidUntil = getValidityEnd(newIssueDate); // Calculate end of financial year
    }

    const updatedMember = await Member.findByIdAndUpdate(id, { $set: updateData }, { new: true });

    await createAudit({
      action: "update",
      entityType: "Member",
      entityId: id,
      memberId: id,
      before: beforeUpdate,
      after: updatedMember.toObject(),
      req,
      requestNumber: req.body.requestNumber, // <-- This will be undefined if not provided, which is now OK
    });

    const populated = await Member.findById(id).populate("zone");
    res.json({ member: populated });
  } catch (err) {
    console.error("PUT /members/:id error:", err);
    res.status(400).json({ error: err.message || "Failed to update member" });
  }
});

// SOFT DELETE member
router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid member ID format" });

    const beforeDelete = await Member.findById(id).lean();
    if (!beforeDelete || beforeDelete.isDeleted) {
      return res.status(404).json({ error: "Member not found" });
    }

    console.log("Deleting member:", beforeDelete.uniqueNumber);

    const softDeletedMember = await Member.findByIdAndUpdate(
      id,
      { isDeleted: true, deletedAt: new Date(), deletedBy: req.user?.id },
      { new: true }
    );

    console.log("Soft delete successful");

    try {
      await createAudit({
        action: "delete",
        entityType: "Member",
        entityId: id,
        memberId: id,
        before: beforeDelete,
        after: softDeletedMember.toObject(),
        req,
        // No requestNumber needed for simple delete
      });
    } catch (auditErr) {
      console.error("Audit log failed:", auditErr);
    }

    res.json({
      success: true,
      message: "સભ્ય સફળતાપૂર્વક ડિલીટ થયો."
    });
  } catch (err) {
    console.error("DELETE /members/:id error:", err);
    res.status(500).json({ error: "Failed to delete member" });
  }
});

// RESTORE a deleted member (PUT version - requested by user)
router.put("/:id/restore", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { requestNumber, reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid member ID format" });

    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: "Only admins can restore members" });
    }

    if (!requestNumber || String(requestNumber).trim() === "") {
      return res.status(400).json({ error: "Request Number (રિક્વેસ્ટ નંબર) is required." });
    }

    const beforeRestore = await Member.findById(id).lean();
    if (!beforeRestore) return res.status(404).json({ error: "Member not found" });
    if (!beforeRestore.isDeleted) return res.status(400).json({ error: "Member is not deleted" });

    if (beforeRestore.uniqueNumber) {
      const existing = await Member.findOne({
        uniqueNumber: beforeRestore.uniqueNumber,
        isDeleted: { $ne: true },
        _id: { $ne: id },
      });
      if (existing) {
        return res.status(400).json({
          error: `Cannot restore: Unique Number ${beforeRestore.uniqueNumber} is now assigned to another active member.`,
        });
      }
    }

    const restoredMember = await Member.findByIdAndUpdate(
      id,
      { isDeleted: false, deletedAt: null, deletedBy: null },
      { new: true }
    );

    await createAudit({
      action: "restore",
      entityType: "Member",
      entityId: id,
      memberId: id,
      before: beforeRestore,
      after: restoredMember.toObject(),
      req,
      requestNumber: String(requestNumber).trim(),
      reason: reason ? String(reason).trim() : undefined,
      restoredBy: req.user?.id,
      restoredAt: new Date(),
    });

    res.json({ message: "Member restored successfully" });
  } catch (err) {
    console.error("PUT /members/:id/restore error:", err);
    res.status(500).json({ error: err.message || "Failed to restore member" });
  }
});

// RESTORE a deleted member (POST version for backward compatibility)
router.post("/:id/restore", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { requestNumber, reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid member ID format" });

    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: "Only admins can restore members" });
    }

    if (!requestNumber || String(requestNumber).trim() === "") {
      return res.status(400).json({ error: "Request Number (રિક્વેસ્ટ નંબર) is required." });
    }

    const beforeRestore = await Member.findById(id).lean();
    if (!beforeRestore) return res.status(404).json({ error: "Member not found" });
    if (!beforeRestore.isDeleted) return res.status(400).json({ error: "Member is not deleted" });

    if (beforeRestore.uniqueNumber) {
      const existing = await Member.findOne({
        uniqueNumber: beforeRestore.uniqueNumber,
        isDeleted: { $ne: true },
        _id: { $ne: id },
      });
      if (existing) {
        return res.status(400).json({
          error: `Cannot restore: Unique Number ${beforeRestore.uniqueNumber} is now assigned to another active member.`,
        });
      }
    }

    const restoredMember = await Member.findByIdAndUpdate(
      id,
      { isDeleted: false, deletedAt: null, deletedBy: null },
      { new: true }
    );

    await createAudit({
      action: "restore",
      entityType: "Member",
      entityId: id,
      memberId: id,
      before: beforeRestore,
      after: restoredMember.toObject(),
      req,
      requestNumber: String(requestNumber).trim(),
      reason: reason ? String(reason).trim() : undefined,
      restoredBy: req.user?.id,
      restoredAt: new Date(),
    });

    res.json({ message: "Member restored successfully" });
  } catch (err) {
    console.error("POST /members/:id/restore error:", err);
    res.status(500).json({ error: err.message || "Failed to restore member" });
  }
});

// PERMANENT DELETE a member (DELETE version)
router.delete("/:id/permanent", auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid member ID format" });

    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: "Only admins can permanently delete members" });
    }

    const beforeDelete = await Member.findById(id).lean();
    if (!beforeDelete) return res.status(404).json({ error: "Member not found" });

    await Member.findByIdAndDelete(id);

    try {
      await createAudit({
        action: "permanent_delete",
        entityType: "Member",
        entityId: id,
        memberId: id,
        before: beforeDelete,
        after: {},
        req,
      });
    } catch (auditErr) {
      console.error("Audit Error on permanent delete:", auditErr);
    }

    res.json({ message: "Member permanently deleted successfully" });
  } catch (err) {
    console.error("DELETE /members/:id/permanent error:", err);
    res.status(500).json({ error: err.message || "Failed to permanently delete member" });
  }
});

// ✅ UPDATED VERIFY ROUTE (FIXED)
router.get("/verify/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let queryParts = [];

    if (!isNaN(parseInt(id, 10))) {
      queryParts.push({ uniqueNumber: parseInt(id, 10) });
    }
    if (mongoose.Types.ObjectId.isValid(id)) {
      queryParts.push({ _id: id });
    }

    if (queryParts.length === 0) {
      const body = `
        <div class="card error">
          <h2>અમાન્ય કાર્ડ</h2>
          <p>આ સભ્ય કાર્ડ માન્ય નથી.</p>
        </div>
      `;
      return sendHtmlResponse(res, 400, "અમાન્ય કાર્ડ", body);
    }

    const member = await Member.findOne({
      $or: queryParts,
    }).populate("zone");

    if (!member || member.isDeleted === true) {
      const body = `
        <div class="card error">
          <h2>અમાન્ય કાર્ડ</h2>
          <p>આ સભ્ય કાર્ડ માન્ય નથી.</p>
        </div>
      `;
      return sendHtmlResponse(res, 404, "અમાન્ય કાર્ડ", body);
    }

    const issueDate = formatDateDDMMYYYY(member.issueDate);

    const body = `
      <div class="card success">
        <h2>માન્ય કાર્ડ</h2>
        <p>આ સભ્ય કાર્ડ માન્ય છે.</p>
        <p class="data-item"><strong>ટ્રસ્ટ:</strong> લુહાર સમાજ સાવરકુંડલા ટ્રસ્ટ રજી નં. ૧૧૪૫ એ</p>
        <p class="data-item"><strong>સભ્ય નં:</strong> ${member.uniqueNumber}</p>
        <p class="data-item"><strong>ઇસ્યુ તારીખ:</strong> ${issueDate}</p>
      </div>
    `;
    return sendHtmlResponse(res, 200, "માન્ય કાર્ડ", body);
  } catch (err) {
    console.error("QR verify error:", err);
    const body = `
      <div class="card error">
        <h2>અમાન્ય કાર્ડ</h2>
        <p>આ સભ્ય કાર્ડ માન્ય નથી.</p>
      </div>
    `;
    return sendHtmlResponse(res, 500, "અમાન્ય કાર્ડ", body);
  }
});

// GENERATE PDF
router.get("/:id/pdf", auth, async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member || member.isDeleted) {
      return res.status(404).json({ error: "Member not found or has been deleted" });
    }

    const pdfBuffer = await generateCard(req.params.id);

    if (req.query.preview === "true") {
      res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
      });
      res.send(pdfBuffer);
    } else {
      const fileName = `LGS-SK-${member.uniqueNumber}.pdf`;
      res.attachment(fileName);
      res.contentType("application/pdf");
      res.setHeader(
        "Content-Length",
        pdfBuffer.length
      );
      return res.send(pdfBuffer);
    }
  } catch (err) {
    console.error("PDF generation error:", err);
    res.status(500).json({ error: err.message || "Failed to generate PDF" });
  }
});

// GET card (same as pdf)
router.get("/:id/card", auth, async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member || member.isDeleted) {
      return res.status(404).json({ error: "Member not found or has been deleted" });
    }

    const pdfBuffer = await generateCard(req.params.id);

    if (req.query.preview === "true") {
      res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
      });
      res.send(pdfBuffer);
    } else {
      const fileName = `LGS-SK-${member.uniqueNumber}.pdf`;
      res.attachment(fileName);
      res.contentType("application/pdf");
      res.setHeader(
        "Content-Length",
        pdfBuffer.length
      );
      return res.send(pdfBuffer);
    }
  } catch (err) {
    console.error("Card generation error:", err);
    res.status(500).json({ error: err.message || "Failed to generate card" });
  }
});

// GET card download (always force attachment)
router.get("/:id/card/download", auth, async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member || member.isDeleted) {
      return res.status(404).json({ error: "Member not found or has been deleted" });
    }

    const pdfBuffer = await generateCard(req.params.id);

    const fileName = `LGS-SK-${member.uniqueNumber}.pdf`;
    res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.attachment(fileName);
    res.contentType("application/pdf");
    res.setHeader(
      "Content-Length",
      pdfBuffer.length
    );
    return res.send(pdfBuffer);
  } catch (err) {
    console.error("Card download error:", err);
    res.status(500).json({ error: err.message || "Failed to download card" });
  }
});

module.exports = router;