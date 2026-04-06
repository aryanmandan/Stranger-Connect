const express = require('express');
const router = express.Router();
const User = require('../models/User');

// POST /api/user/profile — create or update
router.post('/profile', async (req, res) => {
  try {
    const { uid, name, email, profilePic, age, gender, preference, location } = req.body;
    if (!uid || !name || !email) {
      return res.status(400).json({ error: 'uid, name and email are required' });
    }
    const user = await User.findOneAndUpdate(
      { uid },
      { uid, name, email, profilePic, age, gender, preference, location, updatedAt: new Date() },
      { upsert: true, new: true, runValidators: true }
    );
    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/user/me — get by uid
router.post('/me', async (req, res) => {
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: 'uid required' });
    const user = await User.findOne({ uid });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
