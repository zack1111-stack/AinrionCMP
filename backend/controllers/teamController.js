// backend/controllers/teamController.js
const db = require('../config/db');

// ✅ Get all teams with members
exports.getTeams = async (req, res) => {
  try {
    const [teams] = await db.query('SELECT * FROM teams');

    const fullTeams = await Promise.all(
      teams.map(async (team) => {
        const [members] = await db.query(
          `SELECT users.id, users.name, users.email, users.role
           FROM users
           JOIN team_members ON users.id = team_members.user_id
           WHERE team_members.team_id = ?`,
          [team.id]
        );
        return { ...team, members };
      })
    );

    res.json(fullTeams);
  } catch (err) {
    console.error('❌ Get teams error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ✅ Create a new team
exports.createTeam = async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Team name required' });

  try {
    await db.query('INSERT INTO teams (name) VALUES (?)', [name]);
    res.status(201).json({ message: 'Team created' });
  } catch (err) {
    console.error('❌ Create team error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ✅ Update a team
exports.updateTeam = async (req, res) => {
  const { name } = req.body;
  const teamId = req.params.id;

  try {
    await db.query('UPDATE teams SET name = ? WHERE id = ?', [name, teamId]);
    res.json({ message: 'Team updated' });
  } catch (err) {
    console.error('❌ Update team error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ✅ Delete a team
exports.deleteTeam = async (req, res) => {
  const teamId = req.params.id;

  try {
    await db.query('DELETE FROM teams WHERE id = ?', [teamId]);
    res.json({ message: 'Team deleted' });
  } catch (err) {
    console.error('❌ Delete team error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ✅ Add members to a team
exports.addMembers = async (req, res) => {
  const teamId = req.params.id;
  const { userIds } = req.body; // Expect: array of user IDs

  if (!Array.isArray(userIds)) {
    return res.status(400).json({ error: 'userIds must be an array' });
  }

  try {
    for (const userId of userIds) {
      await db.query(
        'INSERT INTO team_members (team_id, user_id) VALUES (?, ?)',
        [teamId, userId]
      );
    }

    res.json({ message: 'Members added' });
  } catch (err) {
    console.error('❌ Add members error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
