// backend/routes/exports.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Member = require('../models/Member');
const Request = require('../models/Request');
const AuditLog = require('../models/AuditLog');
const { 
    generateExcelBuffer,
    formatMembersForExcel,
    formatRequestsForExcel,
    formatAuditLogsForExcel,
} = require('../services/excel-service');
const mongoose = require('mongoose'); // Import mongoose

// ... (The routes for /members and /requests are correct and unchanged) ...
router.get('/members', auth, async (req, res) => {
    try {
        const members = await Member.find({ isDeleted: { $ne: true } }).populate('zone').sort({ uniqueNumber: 1 }).lean();
        const formattedData = formatMembersForExcel(members);
        const buffer = generateExcelBuffer(formattedData, 'Members');
        res.setHeader('Content-Disposition', 'attachment; filename="members.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) {
        console.error("Failed to export members:", err);
        res.status(500).json({ error: 'Failed to export member data.' });
    }
});

router.get('/deleted', auth, async (req, res) => {
    try {
        const members = await Member.find({ isDeleted: true }).populate('zone').sort({ uniqueNumber: 1 }).lean();
        const formattedData = formatMembersForExcel(members);
        const buffer = generateExcelBuffer(formattedData, 'Deleted Members');
        res.setHeader('Content-Disposition', 'attachment; filename="deleted_members.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) {
        console.error("Failed to export deleted members:", err);
        res.status(500).json({ error: 'Failed to export deleted member data.' });
    }
});

router.get('/adults', auth, async (req, res) => {
    try {
        const zoneId = req.query.zone;
        const gender = req.query.gender;
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
                                        gender: "$head.gender"
                                    }],
                                    else: []
                                }
                            },
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

        if (gender) {
            pipeline.push({
                $match: {
                    "adults.gender": gender.toLowerCase()
                }
            });
        }

        pipeline.push(
            {
                $lookup: {
                    from: "zones",
                    localField: "zone",
                    foreignField: "_id",
                    as: "zoneInfo"
                }
            },
            { $unwind: { path: "$zoneInfo", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    headName: "$head.name",
                    memberName: "$adults.name",
                    age: "$adults.age",
                    gender: "$adults.gender",
                    relation: "$adults.relation",
                    mobile: "$mobile",
                    address: "$address",
                    zoneName: "$zoneInfo.name",
                    rationNo: "$rationNo",
                    uniqueNumber: "$uniqueNumber"
                }
            },
            { $sort: { uniqueNumber: 1 } }
        );

        const adults = await Member.aggregate(pipeline);
        
        const formattedData = adults.map(a => ({
            'Unique Number': a.uniqueNumber || 'N/A',
            'Ration Card No': a.rationNo || 'N/A',
            'Head Name': a.headName || 'N/A',
            'Member Name': a.memberName || 'N/A',
            'Age': a.age || 'N/A',
            'Gender': a.gender === 'male' ? 'પુરુષ' : a.gender === 'female' ? 'સ્ત્રી' : 'અન્ય',
            'Relation': a.relation || 'N/A',
            'Mobile': a.mobile || 'N/A',
            'Address': a.address || 'N/A',
            'Zone': a.zoneName || 'N/A'
        }));

        const buffer = generateExcelBuffer(formattedData, 'Adult Members');
        res.setHeader('Content-Disposition', 'attachment; filename="adult_members.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) {
        console.error("Failed to export adult members:", err);
        res.status(500).json({ error: 'Failed to export adult member data.' });
    }
});

router.get('/requests', auth, async (req, res) => {
    try {
        const requests = await Request.find().populate('zone').lean();
        const formattedData = formatRequestsForExcel(requests);
        const buffer = generateExcelBuffer(formattedData, 'Requests');
        res.setHeader('Content-Disposition', 'attachment; filename="requests.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) {
        console.error("Failed to export requests:", err);
        res.status(500).json({ error: 'Failed to export request data.' });
    }
});

//
// --- 🔻🔻 MODIFIED /audit ROUTE 🔻🔻 ---
//
router.get('/audit', auth, async (req, res) => {
    try {
        // --- ADDED FILTER LOGIC ---
        const { search, action, entityType } = req.query;
        const query = {};

        if (action) query.action = action;
        if (entityType) query.entityType = entityType;

        if (search) {
            const searchRegex = { $regex: search, $options: 'i' };
            const searchNum = parseInt(search, 10);
            
            const orQuery = [
                { 'user.name': searchRegex },
                { 'action': searchRegex },
                { 'entityType': searchRegex },
            ];

            if (!isNaN(searchNum)) {
                orQuery.push({ requestNumber: searchNum });
            }
            
            // Add member search if it's a valid ObjectId
            if (mongoose.Types.ObjectId.isValid(search)) {
                orQuery.push({ memberId: search });
                orQuery.push({ entityId: search });
            }

            query.$or = orQuery;
        }
        // --- END OF FILTER LOGIC ---

        const logs = await AuditLog.find(query) // Apply the filter query
            .populate("memberId", "head.name uniqueNumber")
            .populate("user.id", "name email") // This populate is likely for user.id, not user.name
            .sort({ timestamp: -1 })
            .lean();
            
        const formattedData = formatAuditLogsForExcel(logs);
        const buffer = generateExcelBuffer(formattedData, 'Audit Logs');
        
        // --- UPDATED FILENAME TO .xlsx ---
        res.setHeader('Content-Disposition', 'attachment; filename="audit_logs.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) {
        console.error("Failed to export audit logs:", err);
        res.status(500).json({ error: 'Failed to export audit log data.' });
    }
});
//
// --- 🔺🔺 END OF MODIFIED ROUTE 🔺🔺 ---
//

// ✅ **FIXED**: This route now safely encodes filenames with special characters.
router.get('/zone/:zoneId', auth, async (req, res) => {
    try {
        const { zoneId } = req.params;
        const members = await Member.find({ zone: zoneId }).populate('zone').sort({ uniqueNumber: 1 }).lean();
        
        if (members.length === 0) {
            return res.status(404).json({ error: 'No members found in this zone.' });
        }

        const zoneName = members[0].zone.name;
        const formattedData = formatMembersForExcel(members);
        const buffer = generateExcelBuffer(formattedData, `Zone ${zoneName} Members`);

        // Create a safe, URL-encoded filename for the header
        const encodedFilename = encodeURIComponent(`zone_${zoneName}_members.xlsx`);
        // Provide a simple ASCII-only name for older systems
        const fallbackFilename = `zone_${zoneId}_members.xlsx`; 

        res.setHeader('Content-Disposition', `attachment; filename="${fallbackFilename}"; filename*=UTF-8''${encodedFilename}`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);

    } catch (err) {
        console.error("Failed to export zone members:", err);
        res.status(500).json({ error: 'Failed to export zone data.' });
    }
});

router.get('/deleted/csv', auth, async (req, res) => {
    try {
        const members = await Member.find({ isDeleted: true })
            .populate('zone')
            .populate('deletedBy', 'name')
            .sort({ uniqueNumber: 1 })
            .lean();

        // Construct CSV
        const headers = ['Unique Number', 'Head Name', 'Zone', 'Mobile', 'Address', 'Ration No', 'Deleted Date', 'Deleted By'];
        
        const rows = members.map(m => {
            const deletedDate = m.deletedAt ? new Date(m.deletedAt).toLocaleDateString('gu-IN') : 'N/A';
            const deletedByName = m.deletedBy?.name || 'N/A';
            return [
                m.uniqueNumber || '',
                m.head?.name || '',
                m.zone?.name || 'N/A',
                m.mobile || '',
                m.address || '',
                m.rationNo || '',
                deletedDate,
                deletedByName
            ].map(val => {
                let str = String(val).replace(/"/g, '""');
                if (str.includes(',') || str.includes('\n') || str.includes('"')) {
                    str = `"${str}"`;
                }
                return str;
            });
        });

        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        
        res.setHeader('Content-Disposition', 'attachment; filename="deleted_members.csv"');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.send('\ufeff' + csvContent);
    } catch (err) {
        console.error("Failed to export deleted members to CSV:", err);
        res.status(500).json({ error: 'Failed to export deleted member CSV.' });
    }
});

module.exports = router;