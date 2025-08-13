const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ✅ Add attendance (Check-in)
router.post('/', async (req, res) => {
  try {
    const { user_id, date, status } = req.body;

    const [existing] = await db.query(
      'SELECT * FROM attendance WHERE user_id = ? AND date = ?',
      [user_id, date]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Attendance already submitted for today.' });
    }

    const istTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

    const [result] = await db.query(
      `INSERT INTO attendance (user_id, date, status, timestamp)
       VALUES (?, ?, ?, ?)`,
      [user_id, date, status, istTime]
    );

    res.status(201).json({ message: 'Attendance submitted successfully', id: result.insertId });
  } catch (err) {
    console.error('Error submitting attendance:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Employee: Get their own attendance
router.get('/user/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    const [rows] = await db.query(
      `SELECT * FROM attendance WHERE user_id = ? ORDER BY date DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching employee attendance:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Admin: Get all attendance logs
router.get('/admin-summary', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        attendance.id,
        users.name,
        users.email,
        attendance.date,
        attendance.status,
        attendance.timestamp AS time
      FROM attendance
      JOIN users ON attendance.user_id = users.id
      ORDER BY attendance.date DESC, time DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching attendance logs:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Manager: Get team members' attendance
router.get('/manager/:managerId', async (req, res) => {
  const { managerId } = req.params;

  try {
    const [rows] = await db.query(`
      SELECT 
        users.name AS username,
        attendance.date,
        attendance.timestamp AS time,
        attendance.status
      FROM attendance
      JOIN users ON attendance.user_id = users.id
      JOIN team_members ON team_members.user_id = users.id
      JOIN teams ON teams.id = team_members.team_id
      WHERE teams.manager_id = ?
      ORDER BY attendance.date DESC, time DESC
    `, [managerId]);

    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching manager team attendance:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Manager: View leave requests from their team members
// ✅ Manager: View team leave requests with employee name
router.get('/manager-leaves/:managerId', async (req, res) => {
  const managerId = req.params.managerId;
  console.log(`📥 Fetching leave requests for manager ID: ${managerId}`);

  try {
    const [rows] = await db.query(`
      SELECT 
        lr.id,
        lr.employee_id,
        u.name AS employee_name,
        lr.start_date,
        lr.end_date,
        lr.reason,
        lr.status,
        lr.created_at
      FROM leave_requests lr
      JOIN team_members tm ON tm.user_id = lr.employee_id
      JOIN teams t ON t.id = tm.team_id
      JOIN users u ON u.id = lr.employee_id
      WHERE t.manager_id = ?
      ORDER BY lr.created_at DESC
    `, [managerId]);

    console.log('🧑‍💼 EMPLOYEE NAMES:');
    rows.forEach((row, idx) => {
      console.log(`${idx + 1}. ID ${row.id} | Emp: ${row.employee_name}`);
    });

    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching leave requests:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});




// ✅ Monthly Attendance — Used in Manager Dashboard
router.get('/', async (req, res) => {
  const { year, month } = req.query;

  if (!year || !month) {
    return res.status(400).json({ error: 'Year and month are required' });
  }

  try {
    const [rows] = await db.query(`
      SELECT 
        attendance.id,
        attendance.user_id,
        users.name AS username,
        attendance.date,
        attendance.status,
        attendance.timestamp AS time
      FROM attendance
      JOIN users ON attendance.user_id = users.id
      WHERE YEAR(attendance.date) = ? AND MONTH(attendance.date) = ?
      ORDER BY attendance.date DESC, time DESC
    `, [year, month]);

    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching monthly attendance:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
