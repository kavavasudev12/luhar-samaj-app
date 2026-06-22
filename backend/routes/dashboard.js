const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Member = require('../models/Member');
const Zone = require('../models/Zone');
const Request = require('../models/Request');
const AuditLog = require('../models/AuditLog');

// 🔹 Helper: compute zone distribution with aggregation
// This is used by your /zones-distribution route
async function getZoneDistribution() {
  return Member.aggregate([
    {
      $match: { isDeleted: { $ne: true } }
    },
    {
      $group: {
        _id: "$zone",
        totalPeople: {
          $sum: { $add: [1, { $size: { $ifNull: ["$familyMembers", []] } }] }
        }
      }
    },
    {
      $lookup: {
        from: "zones",
        localField: "_id",
        foreignField: "_id",
        as: "zone"
      }
    },
    { $unwind: "$zone" },
    {
      $project: {
        _id: 0,
        name: "$zone.name",
        totalPeople: 1
      }
    }
  ]);
}

// Public Dashboard Stats
router.get('/public-stats', async (req, res) => {
  try {
    const totalFamilies = await Member.countDocuments({ isDeleted: false });
    const totalZones = await Zone.countDocuments();
    const familyCountRes = await Member.aggregate([
      { $match: { isDeleted: false } },
      { $project: { count: { $size: { $ifNull: ["$familyMembers", []] } } } },
      { $group: { _id: null, total: { $sum: "$count" } } }
    ]);
    const familyMembersCount = familyCountRes[0]?.total || 0;
    const totalMembers = totalFamilies + familyMembersCount;

    res.json({
      totalFamilies,
      totalMembers,
      totalZones
    });
  } catch (err) {
    console.error('Error fetching public stats:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Main Dashboard Data
router.get('/', auth, async (req, res) => {
  try {
    const totalMembers = await Member.countDocuments({ isDeleted: { $ne: true } });
    const totalZones = await Zone.countDocuments();
    const pendingRequests = await Request.countDocuments({ status: 'pending' });
    const deletedMembers = await Member.countDocuments({ isDeleted: true });

    // Family members count
    const familyCountRes = await Member.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $project: { count: { $size: { $ifNull: ["$familyMembers", []] } } } },
      { $group: { _id: null, total: { $sum: "$count" } } }
    ]);
    const familyMembersCount = familyCountRes[0]?.total || 0;

    // Adult members count (excluding soft deleted)
    const adultCountRes = await Member.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $project: {
          headAdult: {
            $cond: {
              if: {
                $and: [
                  { $ne: ["$head.age", undefined] },
                  { $ne: ["$head.age", null] },
                  { $gte: ["$head.age", 18] }
                ]
              },
              then: 1,
              else: 0
            }
          },
          familyAdults: {
            $size: {
              $filter: {
                input: { $ifNull: ["$familyMembers", []] },
                as: "fm",
                cond: { $gte: ["$$fm.age", 18] }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $add: ["$headAdult", "$familyAdults"] } }
        }
      }
    ]);
    const adultMembersCount = adultCountRes[0]?.total || 0;

    // Males and Females counts from family members
    const genderCountRes = await Member.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $unwind: { path: "$familyMembers", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$familyMembers.gender",
          count: {
            $sum: {
              $cond: { if: { $gt: ["$familyMembers.name", null] }, then: 1, else: 0 }
            }
          }
        }
      }
    ]);

    let totalMales = 0;
    let totalFemales = 0;
    genderCountRes.forEach(g => {
      if (g._id === 'male') totalMales = g.count;
      if (g._id === 'female') totalFemales = g.count;
    });

    // Zone distribution based on families
    const zoneDistribution = await Member.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $group: {
          _id: "$zone",
          totalPeople: { $sum: { $add: [1, { $size: { $ifNull: ["$familyMembers", []] } }] } }
        }
      },
      { $lookup: { from: "zones", localField: "_id", foreignField: "_id", as: "zone" } },
      { $unwind: { path: "$zone", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          name: { $ifNull: ["$zone.name", "Unknown"] },
          totalPeople: 1
        }
      }
    ]);

    // Age distribution bucket (heads + family members)
    const ageDistRes = await Member.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $project: {
          ages: {
            $concatArrays: [
              {
                $cond: {
                  if: {
                    $and: [
                      { $ne: ["$head.age", undefined] },
                      { $ne: ["$head.age", null] }
                    ]
                  },
                  then: ["$head.age"],
                  else: []
                }
              },
              {
                $map: {
                  input: { $ifNull: ["$familyMembers", []] },
                  as: "fm",
                  in: "$$fm.age"
                }
              }
            ]
          }
        }
      },
      { $unwind: "$ages" },
      {
        $bucket: {
          groupBy: "$ages",
          boundaries: [0, 18, 36, 51, 120],
          default: "Unknown",
          output: {
            count: { $sum: 1 }
          }
        }
      }
    ]);

    const ranges = {
      "Under 18": 0,
      "18-35": 0,
      "36-50": 0,
      "50+": 0
    };
    ageDistRes.forEach(b => {
      if (b._id === 0) ranges["Under 18"] = b.count;
      else if (b._id === 18) ranges["18-35"] = b.count;
      else if (b._id === 36) ranges["36-50"] = b.count;
      else if (b._id === 51) ranges["50+"] = b.count;
    });
    const ageDistribution = Object.keys(ranges).map(key => ({ name: key, count: ranges[key] }));

    res.json({
      totalMembers, // total families
      familyMembers: familyMembersCount, // total non-head family members
      adultMembers: adultMembersCount, // age >= 18
      totalZones,
      pendingRequests,
      deletedMembers,
      totalMales,
      totalFemales,
      zoneDistribution,
      ageDistribution
    });
  } catch (err) {
    console.error('Dashboard fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Separate API: People distribution by zone (from your original code)
router.get('/zones-distribution', auth, async (req, res) => {
  try {
    const data = await getZoneDistribution();
    res.json(data);
  } catch (err) {
    console.error('Error fetching zone distribution:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;