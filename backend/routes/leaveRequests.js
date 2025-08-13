const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ✅ POST new leave request (Employee submitting)
router.post('/', async (req, res) => {
  const { employee_id, start_date, end_date, reason } = req.body;

  if (!employee_id || !start_date || !end_date || !reason) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    await db.query(
      `INSERT INTO leave_requests (employee_id, start_date, end_date, reason, status, created_at)
       VALUES (?, ?, ?, ?, 'Pending', NOW())`,
      [employee_id, start_date, end_date, reason]
    );
    console.log(`✅ Leave request submitted by employee ID: ${employee_id}`);
    res.status(201).json({ message: 'Leave request submitted' });
  } catch (err) {
    console.error('❌ SQL Error:', err.sqlMessage || err.message);
    res.status(500).json({ error: 'Server error', details: err.sqlMessage });
  }
});

// ✅ GET all leave requests for an employee
router.get('/user/:userId', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM leave_requests WHERE employee_id = ? ORDER BY created_at DESC`,
      [req.params.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching leave requests:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ GET all leave requests submitted by manager’s team (with employee name)
router.get('/manager/:managerId', async (req, res) => {
  const { managerId } = req.params;

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
      JOIN users u ON lr.employee_id = u.id
      JOIN team_members tm ON tm.user_id = u.id
      JOIN teams t ON tm.team_id = t.id
     WHERE t.manager_id = ? AND lr.status = 'Pending'
      ORDER BY lr.created_at DESC
    `, [managerId]);

    console.log('📄 Leave requests fetched:', rows.length);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching team leave requests:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ UPDATE leave request status (Approve or Reject)
router.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const [result] = await db.query(
      'UPDATE leave_requests SET status = ? WHERE id = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    console.log(`✅ Leave request ${id} updated to '${status}'`);
    res.json({ message: 'Leave request updated successfully' });
  } catch (err) {
    console.error('❌ Error updating leave request:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

module.exports = router;
