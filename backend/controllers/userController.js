const db = require('../config/db');
const bcrypt = require('bcryptjs');

// ✅ GET all users with avatar
exports.getAllUsers = async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, name, email, role, avatar FROM users');
    
    const usersWithAvatar = users.map(user => ({
      ...user,
      profile_picture: user.avatar ? user.avatar : null
    }));

    res.json(usersWithAvatar);
  } catch (err) {
    console.error('❌ Error fetching users:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ✅ CREATE new user
exports.createUser = async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const [existing] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, role]
    );
    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    console.error('❌ Create user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ✅ UPDATE user by ID (except role)
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, department, phone, gender, status } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  try {
    const [result] = await db.query(
      'UPDATE users SET name = ?, email = ?, department = ?, phone = ?, gender = ?, status = ? WHERE id = ?',
      [name, email, department, phone, gender, status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('❌ Update user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ✅ DELETE user by ID
exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    await db.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('❌ Delete user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ✅ GET user by ID
exports.getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query(
      `SELECT id, name, email, department, phone, gender, status, role, created_at, avatar 
       FROM users 
       WHERE id = ?`,
      [id]
    );

    if (result.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result[0];
    res.json({
      ...user,
      profile_picture: user.avatar ? user.avatar : null
    });
  } catch (err) {
    console.error('❌ Error fetching user by ID:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ✅ UPDATE Avatar by user ID
exports.updateAvatar = async (req, res) => {
  const { id } = req.params;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const avatarPath = `/uploads/avatars/${file.filename}`;

  try {
    const [result] = await db.query('UPDATE users SET avatar = ? WHERE id = ?', [avatarPath, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Avatar updated', avatar: avatarPath });
  } catch (err) {
    console.error('❌ Error saving avatar:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
