const express = require('express');
const router = express.Router();
const db = require('../db');


// ✅ GET all users with avatar
// ✅ GET all users with avatar info
// ✅ GET all users with their avatar (if exists)
// ✅ GET all users with avatar
router.get('/', async (req, res) => {
  console.log('📥 [GET] /api/users called');

  try {
    const users = await db('users');

    const usersWithAvatars = await Promise.all(
      users.map(async (user) => {
        const avatar = await db('avatar').where({ user_id: user.id }).first();
        return {
          ...user,
          profile_picture: avatar ? `/uploads/avatar/${avatar.filename}` : null
        };
      })
    );

    console.log('✅ Final user list with avatars:', usersWithAvatars);
    res.json(usersWithAvatars);
  } catch (err) {
    console.error('❌ Error fetching users with avatars:', err);
    res.status(500).json({ message: 'Server error' });
  }
});



// ✅ GET user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await db('users').where({ id: req.params.id }).first();
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ UPDATE user by ID
router.put('/:id', async (req, res) => {
  const { name, phone, department, gender, status } = req.body;

  try {
    const updated = await db('users')
      .where({ id: req.params.id })
      .update({
        name,
        phone,
        department,
        gender,
        status,
        updated_at: new Date()
      })
      .returning('*');

    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Update failed' });
  }
});

module.exports = router;
