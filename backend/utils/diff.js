// utils/diff.js

// Gujarati field labels
const fieldLabels = {
  uniqueNumber: "યુનિક નંબર",
  "head.name": "મુખ્ય નામ",
  "head.birthdate": "જન્મ તારીખ",
  "head.gender": "લિંગ",
  rationNo: "રેશન કાર્ડ નંબર",
  address: "સરનામું",
  mobile: "મોબાઇલ નંબર",
  alternateMobile: "વૈકલ્પિક મોબાઇલ",
  pincode: "પિનકોડ",
  zone: "ઝોન",
  cardId: "કાર્ડ આઈડી",
  issueDate: "જારી તારીખ",
};

/**
 * Compare two flat/shallow objects and return changes
 * Output format:
 * [
 *   { field: "head.name", label: "મુખ્ય નામ", before: "Ramesh", after: "Suresh" },
 *   { field: "uniqueNumber", label: "યુનિક નંબર", before: 1001, after: 1002 }
 * ]
 */
function shallowDiff(beforeObj = {}, afterObj = {}) {
  const changes = [];
  const keys = new Set([
    ...Object.keys(beforeObj || {}),
    ...Object.keys(afterObj || {}),
  ]);

  keys.forEach((k) => {
    const b = beforeObj?.[k];
    const a = afterObj?.[k];
    const isEqual = JSON.stringify(b) === JSON.stringify(a);

    if (!isEqual) {
      changes.push({
        field: k,
        label: fieldLabels[k] || k, // default to key if no Gujarati label
        before: b,
        after: a,
      });
    }
  });

  return changes.length > 0 ? changes : null;
}

module.exports = { shallowDiff };
