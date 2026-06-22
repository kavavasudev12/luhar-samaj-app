// backend/services/excel-service.js
const xlsx = require('xlsx');

function generateExcelBuffer(data, sheetName = 'Sheet1') {
    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

// ✅ **UPGRADED**: This function now calculates and adds detailed gender counts.
function formatMembersForExcel(members) {
    return members.map(m => {
        // Calculate male and female counts for each family
        let maleCount = 0;
        let femaleCount = 0;

        // Count the head of the family
        if (m.head?.gender === 'male') {
            maleCount++;
        } else if (m.head?.gender === 'female') {
            femaleCount++;
        }

        // Count the family members
        if (m.familyMembers && m.familyMembers.length > 0) {
            m.familyMembers.forEach(fam => {
                if (fam.gender === 'male') maleCount++;
                if (fam.gender === 'female') femaleCount++;
            });
        }

        // Return the new, more detailed row structure for the Excel file
        return {
            'Unique Number': m.uniqueNumber,
            'Head Name': m.head?.name,
            'Zone': m.zone?.name || 'N/A',
            'Mobile': m.mobile,
            'Address': m.address,
            'Male Count': maleCount,
            'Female Count': femaleCount,
            'Total Members': maleCount + femaleCount,
            'Ration No': m.rationNo,
        };
    });
}

function formatRequestsForExcel(requests) {
    return requests.map(r => ({
        'Status': r.status,
        'Submission Date': new Date(r.createdAt).toLocaleString('gu-IN'),
        'Head Name': r.head?.name,
        'Mobile': r.mobile,
        'Additional Mobiles': r.additionalMobiles?.join(', '),
        'Ration No': r.rationNo,
        'Address': r.address,
        'Zone': r.zone?.name || 'N/A',
        'Request Type': r.requestType || 'New Membership',
    }));
}

//
// --- 🔻🔻 MODIFIED formatAuditLogsForExcel 🔻🔻 ---
//
function formatAuditLogsForExcel(logs) {
    const formatChanges = (changes) => {
        if (!changes || changes.length === 0) return "No changes";
        return changes.map(c => `[Field: ${c.field}, From: ${JSON.stringify(c.before)}, To: ${JSON.stringify(c.after)}]`).join('; ');
    };

    return logs.map(log => ({
        // --- 🔻🔻 THIS LINE IS THE FIX 🔻🔻 ---
        'Request Number': log.requestNumber, // Was 'Audit Number': log.auditNumber
        // --- 🔺🔺 END OF FIX 🔺🔺 ---
        'Timestamp': new Date(log.timestamp).toLocaleString('gu-IN'),
        'User': log.user?.name || 'System', // Relies on user.name being saved in the log
        'Action': log.action,
        'Entity': log.entityType,
        'Member Name': log.snapshot?.memberName || log.memberId?.head?.name || 'N/A',
        'Member Number': log.snapshot?.uniqueNumber || log.memberId?.uniqueNumber || 'N/A',
        'Changes': formatChanges(log.changes),
    }));
}
//
// --- 🔺🔺 END OF MODIFICATION 🔺🔺 ---
//

module.exports = {
    generateExcelBuffer,
    formatMembersForExcel,
    formatRequestsForExcel,
    formatAuditLogsForExcel,
};