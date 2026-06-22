const express = require('express');
const { generateMemberCard } = require('../services/pdf-service');
const Member = require('../models/Member');
const router = express.Router();

// Preview endpoint (returns PDF)
router.get('/preview/:memberId', async (req, res) => {
  try {
    const member = await Member.findById(req.params.memberId);
    const pdf = await generateMemberCard(member);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline' // Show in browser
    });
    res.send(pdf);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download endpoint
router.get('/download/:memberId', async (req, res) => {
  try {
    const member = await Member.findById(req.params.memberId);
    const pdf = await generateMemberCard(member);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="member_${member.rationNo}.pdf"`
    });
    res.send(pdf);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;