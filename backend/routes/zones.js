// backend/routes/zones.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Member = require('../models/Member');
const Zone = require('../models/Zone');
const mongoose = require('mongoose');
// ✅ Import your PDF service
const { generateZoneStickers } = require('../services/pdf-service');

// 🔹 PUBLIC: Get all zones (basic info only, for dropdowns)
router.get('/public', async (req, res) => {
  try {
    const zones = await Zone.find({}, { number: 1, name: 1 }).sort({ number: 1 });
    res.json(zones);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 🔹 ADMIN: Create zone
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { number, name } = req.body;
    const zone = new Zone({ number, name, createdBy: req.user.id });
    await zone.save();
    res.status(201).json(zone);
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Zone number already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ **FIXED**: Get all zones with correct people counts
router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const zonesWithCounts = await Zone.aggregate([
      { $sort: { number: 1 } },
      { $lookup: { from: "members", localField: "_id", foreignField: "zone", as: "members" } },
      {
        $project: {
          _id: 1, number: 1, name: 1, createdBy: 1, createdAt: 1,
          totalPeople: { $sum: { $map: { input: "$members", as: "member", in: { $add: [1, { $size: { $ifNull: ["$$member.familyMembers", []] } }] } } } }
        }
      }
    ]);
    res.json(zonesWithCounts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ **NEW**: Sticker Generation Route
router.get('/:id/stickers', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const members = await Member.find({ zone: req.params.id }).populate('zone');
    if (members.length === 0) {
      return res.status(404).json({ error: 'No members found in this zone to generate stickers.' });
    }
    // This assumes a `generateZoneStickers` function exists in your pdf-service.js
    const pdfBuffer = await generateZoneStickers(members); 
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="stickers_zone_${req.params.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error("Sticker generation failed:", err);
    res.status(500).json({ error: 'Failed to generate sticker PDF.' });
  }
});

// 🔹 ADMIN: Update zone
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { number, name } = req.body;
    const updatedZone = await Zone.findByIdAndUpdate(req.params.id, { number, name }, { new: true, runValidators: true });
    if (!updatedZone) {
      return res.status(404).json({ error: 'Zone not found' });
    }
    res.json(updatedZone);
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Zone number already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// 🔹 ADMIN: Delete zone
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const memberCount = await Member.countDocuments({ zone: req.params.id });
    if (memberCount > 0) {
      return res.status(400).json({ error: 'Cannot delete zone with assigned members' });
    }
    await Zone.findByIdAndDelete(req.params.id);
    res.json({ message: 'Zone deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 🔹 ADMIN: Get all people (with male/female counts) in a specific zone
router.get('/:id/people', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const members = await Member.find({ zone: req.params.id });
    const formatted = members.map(member => {
      let maleCount = member.head?.gender === 'male' ? 1 : 0;
      let femaleCount = member.head?.gender === 'female' ? 1 : 0;
      if (member.familyMembers?.length > 0) {
        member.familyMembers.forEach(fam => {
          if (fam.gender === 'male') maleCount++;
          if (fam.gender === 'female') femaleCount++;
        });
      }
      return {
        id: member._id,
        headName: member.head?.name,
        male: maleCount,
        female: femaleCount,
        total: maleCount + femaleCount
      };
    });
    const totalMale = formatted.reduce((sum, f) => sum + f.male, 0);
    const totalFemale = formatted.reduce((sum, f) => sum + f.female, 0);
    res.json({
      zoneId: req.params.id,
      heads: formatted,
      totals: { male: totalMale, female: totalFemale, total: totalMale + totalFemale }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;