// backend/routes/team.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ✅ Get all teams
router.get('/', async (req, res) => {
  try {
    const [teams] = await db.query('SELECT * FROM teams');
    res.json(teams);
  } catch (err) {
    console.error('Error fetching teams:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Create a new team
router.post('/', async (req, res) => {
  const { name, manager_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Team name is required' });

  try {
    await db.query('INSERT INTO teams (name, manager_id) VALUES (?, ?)', [name, manager_id || null]);
    res.status(201).json({ message: 'Team created successfully' });
  } catch (err) {
    console.error('Error creating team:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Update team name
router.put('/:id', async (req, res) => {
  const { name } = req.body;
  const { id } = req.params;

  if (!name) return res.status(400).json({ error: 'New team name required' });

  try {
    await db.query('UPDATE teams SET name = ? WHERE id = ?', [name, id]);
    res.json({ message: 'Team updated successfully' });
  } catch (err) {
    console.error('Error updating team:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Delete team
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await db.query('DELETE FROM teams WHERE id = ?', [id]);
    res.json({ message: 'Team deleted successfully' });
  } catch (err) {
    console.error('Error deleting team:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ GET teams by manager ID (with members and task counts) — excludes admins
// ✅ GET teams by manager ID (with members and task counts)
router.get('/manager/:managerId', async (req, res) => {
  const { managerId } = req.params;

  console.log('📥 Incoming GET /teams/manager/:managerId');
  console.log('➡️  managerId from req.params:', managerId);

  try {
    // Fetch teams managed by this manager
    const [teams] = await db.query(
      'SELECT id AS team_id, name AS team_name FROM teams WHERE manager_id = ?',
      [managerId]
    );

    console.log('🔍 Teams fetched from DB:', teams);

    // Fetch team members
    for (let team of teams) {
      const [members] = await db.query(
        `
        SELECT u.id, u.name, u.email, u.role,
               (SELECT COUNT(*) FROM tasks WHERE assigned_to = u.id) AS taskCount
        FROM users u
        INNER JOIN team_members tm ON u.id = tm.user_id
        WHERE tm.team_id = ? AND u.role IN ('manager', 'employee')
        `,
        [team.team_id]
      );
      console.log(`👥 Members for team ${team.team_id}:`, members);
      team.members = members;
    }

    console.log('✅ Final response:', teams);
    res.json(teams);
  } catch (err) {
    console.error('❌ Error fetching manager teams:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Add member to team
router.post('/:teamId/add-member', async (req, res) => {
  const { teamId } = req.params;
  const { user_id } = req.body;

  console.log('📥 Add Member Request');
  console.log('➡️ teamId:', teamId);
  console.log('➡️ user_id:', user_id);

  if (!user_id) {
    console.error('❌ user_id missing in request body');
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // Check if user exists
    const [users] = await db.query('SELECT * FROM users WHERE id = ?', [user_id]);
    if (users.length === 0) {
      console.error('❌ user_id does not exist in users table');
      return res.status(400).json({ error: 'User not found' });
    }

    // Check if user already in team
    const [existing] = await db.query(
      'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
      [teamId, user_id]
    );

    if (existing.length > 0) {
      console.warn('⚠️ User already in team');
      return res.status(400).json({ error: 'User already in team' });
    }

    // Insert into team_members
    await db.query(
      'INSERT INTO team_members (team_id, user_id) VALUES (?, ?)',
      [teamId, user_id]
    );

    console.log('✅ Member added to team successfully');
    res.status(200).json({ message: 'Member added successfully' });
  } catch (err) {
    console.error('❌ Error adding member to team:', err);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

module.exports = router;
