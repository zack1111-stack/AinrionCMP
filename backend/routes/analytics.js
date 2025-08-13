const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/analytics
router.get('/', async (req, res) => {
  try {
    const [users] = await db.query('SELECT COUNT(*) as totalUsers FROM users');
    const [teams] = await db.query('SELECT COUNT(*) as totalTeams FROM teams');
    const [tasks] = await db.query('SELECT COUNT(*) as totalTasks FROM tasks');
    const [attendance] = await db.query('SELECT COUNT(*) as totalAttendanceLogs FROM attendance');

    const [roles] = await db.query(`
      SELECT role, COUNT(*) as count
      FROM users
      GROUP BY role
    `);

    const roleCounts = {};
    roles.forEach(r => {
      roleCounts[r.role] = r.count;
    });

    res.json({
      totalUsers: users[0].totalUsers,
      totalTeams: teams[0].totalTeams,
      totalTasks: tasks[0].totalTasks,
      totalAttendanceLogs: attendance[0].totalAttendanceLogs,
      roleCounts
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
