const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Request = require("../models/Request");
const Member = require("../models/Member");
const Zone = require("../models/Zone");
const { createAudit } = require("../services/auditService");
const mongoose = require("mongoose");

// --- Helper Functions (from members.js, for data cleaning) ---
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

// ✅ HELPER: Get start of current FINANCIAL year (01/04)
function getFinancialYearStart(date) {
  const d = toDateOrNull(date);
  const refDate = d || new Date();

  const issueMonth = refDate.getMonth(); // 0 = Jan, 2 = Mar, 3 = Apr
  let startYear = refDate.getFullYear();

  // If the month is Jan-Mar (0-2), financial year started last year
  if (issueMonth < 3) {
    startYear -= 1;
  }

  // Financial year starts on April 1st (Month 3)
  return new Date(startYear, 3, 1, 0, 0, 0);
}

// ✅ HELPER: Get end of the FINANCIAL year (31/03) from a date
function getFinancialYearEnd(date) {
  const d = toDateOrNull(date);
  const refDate = d || new Date();

  const issueMonth = refDate.getMonth(); // 0 = Jan, 2 = Mar, 3 = Apr
  let expiryYear = refDate.getFullYear();

  // If the issue month is April (3) or later, FY ends next year
  if (issueMonth >= 3) {
    expiryYear += 1;
  }

  // The expiry date is always March 31st (Month 2)
  return new Date(expiryYear, 2, 31, 23, 59, 59);
}

// ✅ NEW: Format financial year string for display
function getFinancialYearString(date) {
  const start = getFinancialYearStart(date);
  const end = getFinancialYearEnd(date);
  
  const formatDate = (d) => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return `${formatDate(start)} to ${formatDate(end)}`;
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

/*
 * @route   POST api/requests
 * @desc    Submit a new member registration request (Public)
 * @access  Public
 */
router.post("/", async (req, res) => {
  try {
    const {
      head,
      rationNo,
      address,
      city,
      mobile,
      additionalMobiles,
      pincode,
      zone,
      familyMembers,
    } = req.body;

    // Strict validation
    if (!head || !head.name || head.name.trim() === "") {
      return res.status(400).json({ error: "મુખ્ય નામ જરૂરી છે. (Name is required)" });
    }
    const nameRegex = /^[a-zA-Z\s.\u0A80-\u0AFF]+$/;
    if (!nameRegex.test(head.name)) {
      return res.status(400).json({ error: "મુખ્ય નામમાં માત્ર અંગ્રેજી અથવા ગુજરાતી અક્ષરો હોવા જોઈએ. (Name must contain only English or Gujarati characters)" });
    }

    if (!rationNo || rationNo.trim() === "") {
      return res.status(400).json({ error: "રેશન નંબર જરૂરી છે. (Ration number is required)" });
    }

    if (!address || address.trim() === "") {
      return res.status(400).json({ error: "સરનામું જરૂરી છે. (Address is required)" });
    }

    if (!mobile || mobile.trim() === "") {
      return res.status(400).json({ error: "મોબાઇલ નંબર જરૂરી છે. (Mobile number is required)" });
    }
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobile)) {
      return res.status(400).json({ error: "મોબાઇલ નંબર 10 આંકડાનો અને સાચો હોવો જોઈએ. (Mobile number must be a valid 10-digit number starting with 6-9)" });
    }

    if (!zone || !mongoose.Types.ObjectId.isValid(zone)) {
      return res.status(400).json({ error: "અમાન્ય ઝોન પસંદ કરેલ છે. (Invalid Zone selected)" });
    }

    // Validate Zone
    const zoneDoc = await Zone.findById(zone);
    if (!zoneDoc) {
      return res.status(400).json({ error: "Invalid zone ID selected." });
    }

    // Duplicate check for pending requests
    const existingPending = await Request.findOne({
      $or: [
        { mobile: mobile.trim() },
        { rationNo: rationNo.trim() }
      ],
      status: "pending"
    });
    if (existingPending) {
      return res.status(400).json({ error: "આ મોબાઇલ નંબર અથવા રેશન નંબર માટેની અરજી પહેલેથી પેન્ડિંગ છે. (A pending request with this Mobile or Ration Number already exists)" });
    }

    const newRequest = new Request({
      head: {
        name: head.name.trim(),
      },
      rationNo: rationNo.trim(),
      address: address.trim(),
      city: city ? city.trim() : "",
      mobile: mobile.trim(),
      additionalMobiles: additionalMobiles || [],
      pincode,
      zone,
      familyMembers: normalizeFamilyMembers(familyMembers),
      status: "pending",
      requestType: "New Membership",
    });

    await newRequest.save();
    res.status(201).json({ message: "Request submitted successfully." });
  } catch (err) {
    console.error("POST /requests error:", err);
    res.status(400).json({ error: err.message || "Failed to submit request." });
  }
});

/*
 * @route   GET api/requests
 * @desc    Get all requests (Admin)
 * @access  Private (Auth)
 */
router.get("/", auth, async (req, res) => {
  try {
    const requests = await Request.find()
      .populate("zone", "name number")
      .sort({ uniqueNumber: 1 });
    res.json(requests);
  } catch (err) {
    console.error("GET /requests error:", err);
    res.status(500).json({ error: "Failed to fetch requests." });
  }
});

/*
 * @route   PUT api/requests/:id
 * @desc    Edit a request before approval (Admin)
 * @access  Private (Auth)
 */
router.put("/:id", auth, async (req, res) => {
  try {
    const {
      head,
      rationNo,
      address,
      city,
      mobile,
      additionalMobiles,
      pincode,
      zone,
      familyMembers,
      uniqueNumber,
      issueDate,
    } = req.body;

    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: "Request not found." });
    }

    // Validations (same as member creation in members.js)
    if (!head || !head.name || head.name.trim().length < 3) {
      return res.status(400).json({ error: "મુખ્ય નામ ઓછામાં ઓછું 3 અક્ષરનું હોવું જોઈએ. (Head Name must be at least 3 characters)" });
    }
    const nameRegex = /^[a-zA-Z\s.\u0A80-\u0AFF]+$/;
    if (!nameRegex.test(head.name)) {
      return res.status(400).json({ error: "મુખ્ય નામમાં માત્ર અંગ્રેજી અથવા ગુજરાતી અક્ષરો હોવા જોઈએ. (Head Name must contain only English or Gujarati characters)" });
    }

    if (!rationNo || rationNo.trim().length < 3) {
      return res.status(400).json({ error: "રેશન નંબર ઓછામાં ઓછું 3 અક્ષરનું હોવું જોઈએ. (Ration Number must be at least 3 characters)" });
    }

    if (!mobile) {
      return res.status(400).json({ error: "મોબાઇલ નંબર જરૂરી છે. (Mobile number is required)" });
    }
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobile)) {
      return res.status(400).json({ error: "મોબાઇલ નંબર 10 આંકડાનો અને સાચો હોવો જોઈએ. (Mobile number must be a valid 10-digit number starting with 6-9)" });
    }

    if (!address || address.trim().length < 10) {
      return res.status(400).json({ error: "સરનામું ઓછામાં ઓછું 10 અક્ષરનું હોવું જોઈએ. (Address must be at least 10 characters)" });
    }

    if (!zone || !mongoose.Types.ObjectId.isValid(zone)) {
      return res.status(400).json({ error: "અમાન્ય ઝોન પસંદ કરેલ છે. (Invalid Zone selected)" });
    }
    const zoneDoc = await Zone.findById(zone);
    if (!zoneDoc) {
      return res.status(400).json({ error: "Invalid zone selected." });
    }

    // Validate family members
    const normalizedMembers = normalizeFamilyMembers(familyMembers);
    if (familyMembers && familyMembers.length > 0) {
      for (let i = 0; i < familyMembers.length; i++) {
        const fm = familyMembers[i];
        if (!fm.name || fm.name.trim() === "") {
          return res.status(400).json({ error: `સભ્ય ${i + 1} નું નામ જરૂરી છે. (Family member ${i + 1} name is required)` });
        }
        if (!fm.relation || fm.relation.trim() === "") {
          return res.status(400).json({ error: `સભ્ય ${i + 1} નો સંબંધ જરૂરી છે. (Family member ${i + 1} relation is required)` });
        }
        if (!fm.gender || !["male", "female", "other"].includes(String(fm.gender).toLowerCase())) {
          return res.status(400).json({ error: `સભ્ય ${i + 1} નું લિંગ જરૂરી છે. (Family member ${i + 1} gender is required)` });
        }
        if (fm.age === undefined || fm.age === null || String(fm.age).trim() === "") {
          return res.status(400).json({ error: `સભ્ય ${i + 1} ની ઉંમર જરૂરી છે. (Family member ${i + 1} age is required)` });
        }
        const ageNum = Number(fm.age);
        if (isNaN(ageNum) || ageNum < 0 || ageNum > 120) {
          return res.status(400).json({ error: `સભ્ય ${i + 1} ની ઉંમર 0 થી 120 ની વચ્ચે હોવી જોઈએ. (Family member ${i + 1} age must be between 0 and 120)` });
        }
      }
    }

    // Validate uniqueNumber if provided
    let parsedUnique = undefined;
    if (uniqueNumber !== undefined && uniqueNumber !== null && String(uniqueNumber).trim() !== "") {
      parsedUnique = Number(uniqueNumber);
      if (isNaN(parsedUnique) || !Number.isInteger(parsedUnique) || parsedUnique <= 0) {
        return res.status(400).json({ error: "સભ્ય નંબર હકારાત્મક પૂર્ણાંક હોવો જોઈએ. (Unique Number must be a positive integer)" });
      }
      // Check if uniqueNumber is already taken by another active member
      const existingMember = await Member.findOne({ uniqueNumber: parsedUnique, isDeleted: false });
      if (existingMember) {
        return res.status(400).json({ error: `સભ્ય નંબર ${parsedUnique} પહેલેથી વપરાયેલ છે. (Unique Number ${parsedUnique} is already taken by a member)` });
      }
      // Check if another pending request uses this uniqueNumber
      const existingRequest = await Request.findOne({
        _id: { $ne: request._id },
        uniqueNumber: parsedUnique,
        status: "pending",
      });
      if (existingRequest) {
        return res.status(400).json({ error: `આ સભ્ય નંબર માટેની અરજી પહેલેથી પેન્ડિંગ છે. (A pending request with this Unique Number already exists)` });
      }
    }

    // Validate issueDate if provided
    let finalIssueDate = request.issueDate || new Date();
    if (issueDate) {
      const parsedDate = new Date(issueDate);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: "અમાન્ય તારીખ. (Invalid issue date)" });
      }
      finalIssueDate = parsedDate;
    }

    // Save changes
    request.head = { name: head.name.trim() };
    request.rationNo = rationNo.trim();
    request.address = address.trim();
    request.city = city ? city.trim() : "";
    request.mobile = mobile.trim();
    request.additionalMobiles = additionalMobiles || [];
    request.pincode = pincode;
    request.zone = zone;
    request.familyMembers = normalizedMembers;
    request.uniqueNumber = parsedUnique;
    request.issueDate = finalIssueDate;

    await request.save();
    res.json({ message: "Request updated successfully.", request });
  } catch (err) {
    console.error("PUT /requests/:id error:", err);
    res.status(400).json({ error: err.message || "Failed to update request." });
  }
});

/*
 * @route   POST api/requests/:id/approve
 * @desc    Approve a request and create a member (Admin)
 * @access  Private (Auth)
 */
router.post("/:id/approve", auth, async (req, res) => {
  let { uniqueNumber, requestNumber } = req.body;

  if (!requestNumber) {
    return res.status(400).json({ error: "Request Number (રિક્વેસ્ટ નંબર) is required." });
  }

  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: "Request not found." });
    }
    if (request.status === "approved") {
      return res.status(400).json({ error: "Request already approved." });
    }

    const finalUniqueNumber = uniqueNumber ? Number(uniqueNumber) : request.uniqueNumber;
    if (!finalUniqueNumber) {
      return res.status(400).json({ error: "Unique Number (સભ્ય નંબર) is required." });
    }
    const parsedUnique = Number(finalUniqueNumber);
    if (isNaN(parsedUnique) || !Number.isInteger(parsedUnique) || parsedUnique <= 0) {
      return res.status(400).json({ error: "Unique Number (સભ્ય નંબર) must be a positive integer." });
    }

    // Check if unique number is already taken
    const existingMember = await Member.findOne({ uniqueNumber: parsedUnique, isDeleted: false });
    if (existingMember) {
      return res.status(400).json({ error: `Unique Number ${parsedUnique} is already assigned.` });
    }

    const finalIssueDate = request.issueDate || new Date();
    const validityStart = getFinancialYearStart(finalIssueDate);
    const validityEnd = getFinancialYearEnd(finalIssueDate);

    const newMember = new Member({
      head: request.head,
      rationNo: request.rationNo,
      uniqueNumber: parsedUnique,
      address: request.address,
      city: request.city,
      mobile: request.mobile,
      additionalMobiles: request.additionalMobiles,
      pincode: request.pincode,
      zone: request.zone,
      familyMembers: request.familyMembers,
      createdBy: req.user?.id,
      issueDate: finalIssueDate,
      membershipValidFrom: validityStart, // ✅ NEW: Start date
      membershipValidUntil: validityEnd,
    });

    await newMember.save();

    request.status = "approved";
    request.uniqueNumber = parsedUnique; // Ensure it's saved on request too
    await request.save();

    await createAudit({
      action: "create",
      entityType: "Member",
      entityId: newMember._id,
      memberId: newMember._id,
      requestId: request._id,
      requestNumber: requestNumber,
      after: newMember.toObject(),
      req,
      requestNumber: Number(requestNumber), 
    });

    res.status(201).json({ message: "Member created successfully.", member: newMember });
  } catch (err) {
    console.error("POST /requests/:id/approve error:", err);
    res.status(500).json({ error: err.message || "Failed to approve request." });
  }
});

/*
 * ✅ NEW ROUTE: Verify QR Code and return validity details
 * @route   GET api/requests/verify/:uniqueNumber
 * @desc    Verify member card by QR scan and return financial year validity
 * @access  Public (for scanning)
 */
router.get("/verify/:uniqueNumber", async (req, res) => {
  try {
    const { uniqueNumber } = req.params;
    
    const member = await Member.findOne({ uniqueNumber })
      .populate("zone", "name number");
    
    if (!member) {
      return res.status(404).json({ 
        valid: false,
        error: "Member not found" 
      });
    }

    const today = new Date();
    const validUntil = member.membershipValidUntil || getFinancialYearEnd(today);
    const isExpired = today > validUntil;

    // ✅ Auto-renew if expired
    if (isExpired) {
      const newValidityStart = getFinancialYearStart(today);
      const newValidityEnd = getFinancialYearEnd(today);
      
      member.membershipValidFrom = newValidityStart;
      member.membershipValidUntil = newValidityEnd;
      await member.save();

      return res.json({
        valid: true,
        status: "renewed",
        message: "Card was expired and has been automatically renewed",
        member: {
          uniqueNumber: member.uniqueNumber,
          name: member.head?.name,
          mobile: member.mobile,
          zone: member.zone?.name,
        },
        validity: {
          financialYear: getFinancialYearString(today),
          validFrom: newValidityStart,
          validUntil: newValidityEnd,
          previousExpiry: validUntil,
        }
      });
    }

    // ✅ Return active card details
    const validFrom = member.membershipValidFrom || getFinancialYearStart(validUntil);
    
    res.json({
      valid: true,
      status: "active",
      message: "Card is valid",
      member: {
        uniqueNumber: member.uniqueNumber,
        name: member.head?.name,
        mobile: member.mobile,
        zone: member.zone?.name,
        rationNo: member.rationNo,
      },
      validity: {
        financialYear: getFinancialYearString(validUntil),
        validFrom: validFrom,
        validUntil: validUntil,
      }
    });

  } catch (err) {
    console.error("GET /verify/:uniqueNumber error:", err);
    res.status(500).json({ 
      valid: false,
      error: "Failed to verify member" 
    });
  }
});

/*
 * @route   DELETE api/requests/:id
 * @desc    Decline (delete) a request (Admin)
 * @access  Private (Auth)
 */
router.delete("/:id", auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: "Request not found." });
    }

    request.status = "rejected";
    await request.save();

    res.json({ message: "Request rejected successfully." });
  } catch (err) {
    console.error("DELETE /requests/:id error:", err);
    res.status(500).json({ error: "Failed to reject request." });
  }
});

module.exports = router